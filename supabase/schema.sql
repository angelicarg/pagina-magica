-- Página Mágica — schema, security policies and seed data.
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).

-- ─── TABLES ───────────────────────────────────────────────────────────────

create table products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  author text,
  description text not null,
  price numeric(10,2) not null,
  stock int not null default 0,
  cover_emoji text not null,
  cover_color text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table promotions (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  discount_percent int not null check (discount_percent > 0 and discount_percent <= 90),
  product_id bigint references products (id) on delete cascade,
  category text,
  starts_at date not null,
  ends_at date not null
);

create table orders (
  id bigint generated always as identity primary key,
  customer_name text not null,
  customer_phone text not null,
  total numeric(10,2) not null,
  status text not null default 'recebido' check (status in ('recebido', 'preparando', 'concluido')),
  created_at timestamptz not null default now()
);

create table order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders (id) on delete cascade,
  product_id bigint references products (id) on delete set null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────
-- Public visitors (anon) can read the catalog and active promotions, and
-- place orders only through the controlled function below. Only the
-- logged-in admin (bookstore staff) can manage products/promotions or read
-- order history.

alter table products enable row level security;
alter table promotions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "public read products" on products
  for select using (true);

create policy "admin manage products" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read promotions" on promotions
  for select using (true);

create policy "admin manage promotions" on promotions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin read orders" on orders
  for select using (auth.role() = 'authenticated');

create policy "admin manage orders" on orders
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin read order_items" on order_items
  for select using (auth.role() = 'authenticated');

-- ─── ORDER FUNCTION ───────────────────────────────────────────────────────
-- Anon calls this instead of writing to orders/order_items directly: prices
-- are looked up server-side from `products` (never trusted from the client),
-- the order total is computed here, and stock is decremented atomically.

create or replace function create_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb -- [{ "product_id": 1, "quantity": 2 }, ...]
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id bigint;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_product products%rowtype;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'O pedido está vazio';
  end if;

  insert into orders (customer_name, customer_phone, total)
  values (p_customer_name, p_customer_phone, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::bigint for update;

    if v_product.id is null then
      raise exception 'Produto não encontrado';
    end if;

    insert into order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product.id, v_product.name, (v_item->>'quantity')::int, v_product.price);

    v_total := v_total + v_product.price * (v_item->>'quantity')::int;

    update products set stock = greatest(stock - (v_item->>'quantity')::int, 0) where id = v_product.id;
  end loop;

  update orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order(text, text, jsonb) to anon;

-- ─── SEED DATA ────────────────────────────────────────────────────────────

insert into products (name, category, author, description, price, stock, cover_emoji, cover_color, featured) values
  ('O Dragão que Tinha Soluço', 'Infantil', 'Beatriz Andrade', 'Um dragão desajeitado descobre que seus soluços fazem chover doces sobre a vila.', 42.90, 18, '🐉', '#F2A93B', true),
  ('A Menina das Estrelas Perdidas', 'Infantil', 'Helena Souza Prado', 'Uma jornada noturna para devolver ao céu as estrelas que caíram no quintal.', 39.90, 22, '⭐', '#6B46C1', false),
  ('O Livro que Comia Palavras', 'Infantil', 'Rogério Vilas', 'Um livro travesso engole as palavras da história — e só o leitor pode devolvê-las.', 36.50, 15, '📖', '#2F9E67', false),
  ('Cartas para o Vento Sul', 'Romance', 'Marina Aquino', 'Duas cartas trocadas por décadas atravessam o oceano e reacendem um amor de juventude.', 54.90, 12, '💌', '#B5384C', true),
  ('Um Verão em Setembro', 'Romance', 'Caio Fontenele', 'Um reencontro inesperado numa cidade litorânea muda o rumo de duas vidas.', 49.90, 14, '🌅', '#D97B3F', false),
  ('O Jardim das Coisas Esquecidas', 'Romance', 'Larissa Nogueira', 'Uma casa antiga guarda memórias que só florescem quando alguém volta a regá-las.', 47.90, 9, '🌷', '#8A5FBF', false),
  ('Recomeços Possíveis', 'Autoajuda', 'Dr. André Kaplan', 'Um guia gentil para reconstruir rotinas depois de grandes mudanças de vida.', 44.90, 20, '🌱', '#3F8F6B', false),
  ('O Silêncio que Cura', 'Autoajuda', 'Renata Bittencourt', 'Práticas simples de pausa e respiração para dias difíceis.', 41.90, 17, '🕊️', '#4F7CAC', true),
  ('Pequenos Passos, Grandes Mudanças', 'Autoajuda', 'Felipe Uchôa', 'Como transformar metas grandes em hábitos diários realistas.', 38.90, 25, '👣', '#C77B3B', false),
  ('Lógica para Iniciantes', 'Técnico/Didático', 'Prof. Marcos Teles', 'Introdução clara ao raciocínio lógico, com exercícios comentados.', 62.90, 10, '🧩', '#375A9E', false),
  ('Redação Nota Mil — Guia Completo', 'Técnico/Didático', 'Camila Duarte', 'Estrutura, argumentação e repertório para a redação do vestibular e ENEM.', 58.90, 16, '✍️', '#A6472C', false),
  ('Matemática Sem Mistério — Ensino Médio', 'Técnico/Didático', 'Igor Salgado', 'Revisão completa de matemática do ensino médio com exemplos resolvidos.', 64.90, 11, '📐', '#2E7D6B', false),
  ('Caderno Universitário Encantado', 'Papelaria', null, 'Capa dura ilustrada, 200 folhas pautadas, elástico de fechamento.', 32.90, 30, '📓', '#6B46C1', true),
  ('Caneta Tinteiro Pena de Fada', 'Papelaria', null, 'Caneta tinteiro leve com ponta fina, ideal para caligrafia.', 28.50, 24, '🖋️', '#B5384C', false),
  ('Marcadores de Página Mágicos (kit 6un)', 'Papelaria', null, 'Kit com 6 marcadores ilustrados em fita de cetim.', 19.90, 40, '🔖', '#F2A93B', false),
  ('Kit Lápis de Cor Aquarelável (24 cores)', 'Papelaria', null, 'Lápis de cor com pigmento aquarelável, estojo reutilizável.', 46.90, 20, '🎨', '#2F9E67', false);

insert into promotions (title, description, discount_percent, category, starts_at, ends_at) values
  ('Semana da Leitura Infantil', 'Descontos em toda a categoria Infantil para incentivar a leitura em família.', 20, 'Infantil', current_date, current_date + interval '14 day'),
  ('Combo Volta às Aulas', 'Papelaria com condições especiais para o começo do semestre.', 15, 'Papelaria', current_date, current_date + interval '21 day');

insert into promotions (title, description, discount_percent, product_id, starts_at, ends_at)
select 'Lançamento em Destaque', 'Edição especial de "Cartas para o Vento Sul" com desconto por tempo limitado.', 10, id, current_date, current_date + interval '10 day'
from products where name = 'Cartas para o Vento Sul';
