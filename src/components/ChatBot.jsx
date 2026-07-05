import { useState, useEffect, useRef } from "react";

const QUICK = ["Sugestões de leitura 📖", "Promoções da semana 🎉", "Livros infantis 🐉", "Papelaria disponível ✏️"];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Oi! Sou a Nina, sua guia mágica na livraria ✨ Posso recomendar livros, contar sobre promoções ou ajudar com a papelaria. O que você procura hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (data.error === "rate_limited") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Recebi muitas mensagens agora, respira um pouquinho e tenta de novo! ✨" },
        ]);
        return;
      }

      const reply = data.reply || "Desculpa, tive um probleminha mágico aqui. Tenta de novo em instantes! 😅";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ops, algo deu errado. Me chama no WhatsApp da loja! 📖" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 500,
          width: 60, height: 60, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg, #6B46C1, #3D2A66)",
          color: "#fff", fontSize: 26, cursor: "pointer",
          boxShadow: "0 6px 24px rgba(107,70,193,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        title="Falar com a Nina"
      >
        {open ? "✕" : "🪄"}
        {!open && unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#F2A93B", color: "#3D2A66",
            borderRadius: "50%", width: 20, height: 20,
            fontSize: 11, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 100, right: 28, zIndex: 499,
          width: "min(380px, calc(100vw - 32px))",
          background: "#FBF7F0",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(61,42,102,0.35)",
          border: "1px solid #E9DFF2",
          display: "flex", flexDirection: "column",
          maxHeight: "70vh",
          animation: "chatIn 0.25s ease",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #3D2A66, #241a42)",
            borderRadius: "20px 20px 0 0",
            padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(242,169,59,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>🧚</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Nina</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Guia mágica · Página Mágica</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", boxShadow: "0 0 6px #4CAF50" }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(107,70,193,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>🧚</div>
                )}
                <div style={{
                  maxWidth: "78%",
                  background: m.role === "user" ? "linear-gradient(135deg, #6B46C1, #3D2A66)" : "#fff",
                  color: m.role === "user" ? "#fff" : "#2E1F47",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  fontSize: 13.5, lineHeight: 1.55,
                  border: m.role === "assistant" ? "1px solid #EEE4F7" : "none",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(107,70,193,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🧚</div>
                <div style={{ background: "#fff", border: "1px solid #EEE4F7", borderRadius: "4px 16px 16px 16px", padding: "10px 16px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map((d) => (
                    <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6B46C1", animation: `bounce 1s ${d * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{ background: "#F3EBFB", border: "1px solid #E9DFF2", borderRadius: 100, padding: "6px 12px", fontSize: 12, color: "#5B4B78", cursor: "pointer" }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: "10px 14px 14px", display: "flex", gap: 8, borderTop: "1px solid #EEE4F7" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Digite sua mensagem..."
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E9DFF2", fontSize: 13, outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading}
              style={{ background: "#6B46C1", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 15, cursor: loading ? "wait" : "pointer" }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
