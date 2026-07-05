import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const STATUS_LABEL = { recebido: "Recebido", preparando: "Preparando", concluido: "Concluído" };
const STATUS_COLOR = { recebido: "#B7770D", preparando: "#4F7CAC", concluido: "#2F9E67" };

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(orderId) {
    if (expanded === orderId) {
      setExpanded(null);
      return;
    }
    setExpanded(orderId);
    if (!items[orderId]) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      setItems((prev) => ({ ...prev, [orderId]: data || [] }));
    }
  }

  async function updateStatus(orderId, status) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    load();
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3D2A66", marginBottom: 6 }}>Pedidos</h1>
      <p style={{ fontSize: 13, color: "#8A7A9E", marginBottom: 24 }}>Pedidos feitos pelo carrinho do site, com checkout confirmado no WhatsApp.</p>

      {loading ? (
        <p style={{ color: "#8A7A9E", fontSize: 14 }}>Carregando...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "#8A7A9E", fontSize: 14 }}>Nenhum pedido registrado ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ background: "#fff", border: "1px solid #EEE4F7", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#3D2A66" }}>Pedido #{o.id} · {o.customer_name}</div>
                  <div style={{ fontSize: 12, color: "#8A7A9E", marginTop: 2 }}>
                    {o.customer_phone} · {new Date(o.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#3D2A66" }}>R$ {Number(o.total).toFixed(2).replace(".", ",")}</span>
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 100, padding: "4px 10px", border: "none",
                      color: "#fff", background: STATUS_COLOR[o.status], cursor: "pointer",
                    }}
                  >
                    {Object.entries(STATUS_LABEL).map(([key, l]) => (
                      <option key={key} value={key}>{l}</option>
                    ))}
                  </select>
                  <button onClick={() => toggleExpand(o.id)} style={{ background: "none", border: "none", fontSize: 13, color: "#6B46C1", cursor: "pointer" }}>
                    {expanded === o.id ? "Ocultar itens" : "Ver itens"}
                  </button>
                </div>
              </div>

              {expanded === o.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #EEE4F7" }}>
                  {(items[o.id] || []).map((i) => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5B4B78", padding: "4px 0" }}>
                      <span>{i.quantity}x {i.product_name}</span>
                      <span>R$ {(Number(i.unit_price) * i.quantity).toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
