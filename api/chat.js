// Vercel serverless function — keeps the Anthropic API key server-side and
// puts a bound on spend for this public, unauthenticated endpoint.
//
// Unlike Forno 81's chatbot (menu hardcoded into this file), Nina's
// knowledge of the catalog and promotions is fetched from Supabase on every
// request, so editing a product/promotion in the admin panel updates what
// the bot says without touching this code.

import { createClient } from "@supabase/supabase-js";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 8;

const IP_WINDOW_MS = 60_000;
const IP_MAX_REQUESTS = 6;
const DAILY_MAX_REQUESTS = 300;

// In-memory only: resets on cold start and isn't shared across serverless
// instances, so this is a best-effort throttle, not a hard cap. Good enough
// until traffic justifies a real store (e.g. Upstash/Redis).
const ipHits = new Map();
let dailyCount = 0;
let dailyResetAt = nextMidnightUTC();

function nextMidnightUTC() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function isRateLimited(ip) {
  const now = Date.now();

  if (now >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = nextMidnightUTC();
  }
  if (dailyCount >= DAILY_MAX_REQUESTS) return true;

  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX_REQUESTS) {
    ipHits.set(ip, hits);
    return true;
  }

  hits.push(now);
  ipHits.set(ip, hits);
  dailyCount += 1;
  return false;
}

function isValidMessage(m) {
  return (
    m &&
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.length > 0 &&
    m.content.length <= MAX_MESSAGE_LENGTH
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function buildSystemPrompt() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  let catalogText = "Catálogo indisponível no momento.";
  let promosText = "Nenhuma promoção ativa no momento.";

  if (url && anonKey) {
    const supabase = createClient(url, anonKey);
    const [{ data: products }, { data: promotions }] = await Promise.all([
      supabase.from("products").select("*").order("category").order("name"),
      supabase.from("promotions").select("*"),
    ]);

    if (products?.length) {
      const byCategory = {};
      for (const p of products) {
        (byCategory[p.category] ??= []).push(p);
      }
      catalogText = Object.entries(byCategory)
        .map(([category, items]) => {
          const lines = items.map((p) => {
            const author = p.author ? ` (${p.author})` : "";
            const stock = p.stock > 0 ? `${p.stock} em estoque` : "esgotado";
            return `  - ${p.name}${author}: R$ ${Number(p.price).toFixed(2)} — ${stock}. ${p.description}`;
          });
          return `${category}:\n${lines.join("\n")}`;
        })
        .join("\n\n");
    }

    const today = todayISO();
    const active = (promotions || []).filter((p) => p.starts_at <= today && today <= p.ends_at);
    if (active.length) {
      promosText = active
        .map((p) => `- ${p.title}: ${p.discount_percent}% OFF em ${p.category || "um produto específico"} até ${p.ends_at}. ${p.description}`)
        .join("\n");
    }
  }

  return `Você é a Nina, atendente virtual da Página Mágica — uma livraria de bairro com papelaria, encantada e acolhedora. Você é gentil, entusiasmada por livros e adora fazer recomendações personalizadas.

SOBRE A LIVRARIA:
- Nome: Página Mágica — Livraria & Papelaria
- Endereço: Rua das Palmeiras, 245 — Centro, Uberlândia – MG
- Horário: Segunda a Sábado, das 9h às 19h
- WhatsApp: (34) 99888-0042

CATÁLOGO ATUAL (lido direto do banco de dados — sempre atualizado):

${catalogText}

PROMOÇÕES ATIVAS HOJE:

${promosText}

FORMAS DE COMPRAR:
- Pelo carrinho no site, com pagamento combinado por WhatsApp na retirada/entrega
- Direto pelo WhatsApp (34) 99888-0042

INSTRUÇÕES DE COMPORTAMENTO:
- Responda SEMPRE em português brasileiro
- Seja calorosa, use emojis com moderação (não exagere)
- Respostas curtas e diretas — máximo 3 parágrafos
- Recomende livros com base no catálogo acima, nunca invente títulos que não estão na lista
- Se um produto estiver esgotado, avise e sugira uma alternativa parecida do catálogo
- Se o cliente quiser comprar, oriente a usar o carrinho no site ou o WhatsApp (34) 99888-0042
- Nunca invente informações que não estão neste contexto`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .toString()
    .split(",")[0]
    .trim();

  if (isRateLimited(ip)) {
    res.status(200).json({ error: "rate_limited" });
    return;
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isValidMessage)) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[chat] ANTHROPIC_API_KEY not configured");
    res.status(200).json({ error: "unavailable" });
    return;
  }

  const history = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content }));

  try {
    const systemPrompt = await buildSystemPrompt();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: history,
      }),
    });

    if (!response.ok) {
      console.error("[chat] Anthropic API error", response.status, await response.text());
      res.status(200).json({ error: "unavailable" });
      return;
    }

    const json = await response.json();
    const reply = json.content?.[0]?.text;
    if (!reply) {
      res.status(200).json({ error: "unavailable" });
      return;
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error("[chat] request failed", err);
    res.status(200).json({ error: "unavailable" });
  }
}
