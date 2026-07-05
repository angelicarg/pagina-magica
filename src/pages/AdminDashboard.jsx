import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProductsManager from "../components/ProductsManager";
import PromotionsManager from "../components/PromotionsManager";
import OrdersList from "../components/OrdersList";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [section, setSection] = useState("produtos");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setCheckingSession(false);
    });
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  if (checkingSession) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FBF7F0", fontFamily: "'Inter', sans-serif" }}>
      <header
        style={{
          background: "#fff", borderBottom: "1px solid #EEE4F7",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6B46C1, #3D2A66)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📖</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3D2A66" }}>Página Mágica · Painel da equipe</span>
        </div>
        <button onClick={handleLogout} style={{ background: "none", border: "1px solid #EEE4F7", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#5B4B78", cursor: "pointer" }}>
          Sair
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, borderBottom: "1px solid #EEE4F7", paddingBottom: 16 }}>
          {[
            ["produtos", "📚 Produtos"],
            ["promocoes", "🎉 Promoções"],
            ["pedidos", "🧾 Pedidos"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: "none",
                background: section === key ? "#3D2A66" : "transparent",
                color: section === key ? "#fff" : "#5B4B78",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {section === "produtos" && <ProductsManager />}
        {section === "promocoes" && <PromotionsManager />}
        {section === "pedidos" && <OrdersList />}
      </main>
    </div>
  );
}
