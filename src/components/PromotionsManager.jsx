import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const CATEGORIES = ["Infantil", "Romance", "Autoajuda", "Técnico/Didático", "Papelaria"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  title: "", description: "", discount_percent: "10",
  target_type: "category", category: CATEGORIES[0], product_id: "",
  starts_at: todayISO(), ends_at: todayISO(),
};

export default function PromotionsManager() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: promo }, { data: prod }] = await Promise.all([
      supabase.from("promotions").select("*").order("starts_at", { ascending: false }),
      supabase.from("products").select("id, name").order("name"),
    ]);
    setPromotions(promo || []);
    setProducts(prod || []);
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
      title: p.title, description: p.description, discount_percent: String(p.discount_percent),
      target_type: p.product_id ? "product" : "category",
      category: p.category || CATEGORIES[0],
      product_id: p.product_id ? String(p.product_id) : "",
      starts_at: p.starts_at, ends_at: p.ends_at,
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      discount_percent: parseInt(form.discount_percent, 10),
      category: form.target_type === "category" ? form.category : null,
      product_id: form.target_type === "product" ? parseInt(form.product_id, 10) : null,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
    };

    if (editingId) {
      await supabase.from("promotions").update(payload).eq("id", editingId);
    } else {
      await supabase.from("promotions").insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Remover esta promoção?")) return;
    await supabase.from("promotions").delete().eq("id", id);
    load();
  }

  function isActive(p) {
    const today = todayISO();
    return p.starts_at <= today && today <= p.ends_at;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3D2A66", margin: 0 }}>Promoções</h1>
          <p style={{ fontSize: 13, color: "#8A7A9E", marginTop: 4 }}>Descontos por categoria ou produto específico.</p>
        </div>
        <button onClick={startNew} style={primaryBtn}>+ Nova promoção</button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} style={formBox}>
          <div style={formGrid}>
            <div>
              <label style={label}>Título</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Desconto (%)</label>
              <input required type="number" min="1" max="90" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Aplicar em</label>
              <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })} style={input}>
                <option value="category">Categoria inteira</option>
                <option value="product">Produto específico</option>
              </select>
            </div>
            {form.target_type === "category" ? (
              <div>
                <label style={label}>Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label style={label}>Produto</label>
                <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} style={input}>
                  <option value="">Selecione...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={label}>Início</label>
              <input required type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>Fim</label>
              <input required type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} style={input} />
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
      ) : promotions.length === 0 ? (
        <p style={{ color: "#8A7A9E", fontSize: 14 }}>Nenhuma promoção cadastrada.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {promotions.map((p) => (
            <div key={p.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#3D2A66" }}>
                  {p.title}
                  <span style={{ ...badge, background: isActive(p) ? "#2F9E67" : "#B4A6C6" }}>{isActive(p) ? "Ativa" : "Inativa"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8A7A9E" }}>
                  {p.discount_percent}% OFF · {p.category ? p.category : `Produto #${p.product_id}`} · {p.starts_at} a {p.ends_at}
                </div>
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
const badge = { fontSize: 10, fontWeight: 700, color: "#fff", borderRadius: 6, padding: "2px 6px", marginLeft: 8 };
