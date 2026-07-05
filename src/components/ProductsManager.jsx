import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const CATEGORIES = ["Infantil", "Romance", "Autoajuda", "Técnico/Didático", "Papelaria"];

const EMPTY_FORM = {
  name: "", category: CATEGORIES[0], author: "", description: "",
  price: "", stock: "", cover_emoji: "📖", cover_color: "#6B46C1", featured: false,
};

export default function ProductsManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("category").order("name");
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name, category: p.category, author: p.author || "", description: p.description,
      price: String(p.price), stock: String(p.stock), cover_emoji: p.cover_emoji,
      cover_color: p.cover_color, featured: p.featured,
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      author: form.author.trim() || null,
      description: form.description.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      cover_emoji: form.cover_emoji.trim() || "📖",
      cover_color: form.cover_color,
      featured: form.featured,
    };

    if (editingId) {
      await supabase.from("products").update(payload).eq("id", editingId);
    } else {
      await supabase.from("products").insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Remover este produto do catálogo?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3D2A66", margin: 0 }}>Produtos</h1>
          <p style={{ fontSize: 13, color: "#8A7A9E", marginTop: 4 }}>Livros e papelaria disponíveis na loja.</p>
        </div>
        <button onClick={startNew} style={primaryBtn}>+ Novo produto</button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} style={formBox}>
          <div style={formGrid}>
            <div>
              <label style={label}>Nome</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Categoria</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Autor (opcional)</label>
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Preço (R$)</label>
              <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Estoque</label>
              <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Emoji de capa</label>
              <input value={form.cover_emoji} onChange={(e) => setForm({ ...form, cover_emoji: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Cor de destaque</label>
              <input type="color" value={form.cover_color} onChange={(e) => setForm({ ...form, cover_color: e.target.value })} style={{ ...input, padding: 4, height: 40 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} id="featured" />
              <label htmlFor="featured" style={{ fontSize: 13, color: "#5B4B78" }}>Destaque na home</label>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={label}>Descrição</label>
            <textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => setShowForm(false)} style={secondaryBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#8A7A9E", fontSize: 14 }}>Carregando...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => (
            <div key={p.id} style={row}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p.cover_color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.cover_emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#3D2A66" }}>{p.name} {p.featured && <span style={badge}>Destaque</span>}</div>
                <div style={{ fontSize: 12, color: "#8A7A9E" }}>{p.category}{p.author ? ` · ${p.author}` : ""} · Estoque: {p.stock}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#3D2A66", whiteSpace: "nowrap" }}>
                R$ {Number(p.price).toFixed(2).replace(".", ",")}
              </div>
              <button onClick={() => startEdit(p)} style={iconBtn}>✏️</button>
              <button onClick={() => handleDelete(p.id)} style={{ ...iconBtn, color: "#B5384C" }}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const primaryBtn = { background: "#6B46C1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const secondaryBtn = { background: "#fff", color: "#5B4B78", border: "1px solid #E9DFF2", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const formBox = { background: "#fff", border: "1px solid #EEE4F7", borderRadius: 14, padding: 20, marginBottom: 20 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
const label = { display: "block", fontSize: 12, fontWeight: 600, color: "#5B4B78", marginBottom: 4 };
const input = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E9DFF2", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const row = { background: "#fff", border: "1px solid #EEE4F7", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 };
const iconBtn = { background: "none", border: "none", fontSize: 15, cursor: "pointer" };
const badge = { fontSize: 10, fontWeight: 700, color: "#fff", background: "#F2A93B", borderRadius: 6, padding: "2px 6px", marginLeft: 6 };
