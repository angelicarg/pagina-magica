# Página Mágica

Livraria e papelaria fictícia — projeto de portfólio da Aruanã Digital. Loja online com carrinho e checkout via WhatsApp, pedidos persistidos no Supabase, painel admin (produtos, promoções, pedidos) e chatbot "Nina" com IA (Claude Haiku) que lê o catálogo direto do banco.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha as três variáveis abaixo
npm run dev
```

## Variáveis de ambiente

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — projeto Supabase (banco + Auth)
- `ANTHROPIC_API_KEY` — chave da Anthropic, usada só no servidor (`api/chat.js`), nunca exposta ao cliente

## Banco de dados

Rode `supabase/schema.sql` uma vez no SQL Editor do Supabase. Cria as tabelas (`products`, `promotions`, `orders`, `order_items`), políticas de RLS, a função `create_order()` e os dados de exemplo (catálogo + promoções).

Depois, crie um usuário em **Authentication → Users** para acessar `/admin/login`.

## Deploy

Hospedado na Vercel — `vite.config.js` já emula as funções serverless (`api/`) durante `npm run dev`; em produção a Vercel serve `api/chat.js` nativamente. Lembre de configurar as três variáveis de ambiente também no painel da Vercel e fazer redeploy após adicioná-las.
