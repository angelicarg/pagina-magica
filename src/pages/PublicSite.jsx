import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import ChatBot from "../components/ChatBot";

const CATEGORIES = ["Infantil", "Romance", "Autoajuda", "Técnico/Didático", "Papelaria"];

const STORE = {
  phone: "5534998880042",
  phoneDisplay: "(34) 99888-0042",
  address: "Rua das Palmeiras, 245 — Centro, Uberlândia – MG",
  hours: "Segunda a Sábado, das 9h às 19h",
};

function formatBRL(value) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function todayInRange(startsAt, endsAt) {
  const today = new Date().toISOString().slice(0, 10);
  return startsAt <= today && today <= endsAt;
}

function activePromotion(product, promotions) {
  const active = promotions.filter((p) => todayInRange(p.starts_at, p.ends_at));
  const byProduct = active.find((p) => p.product_id === product.id);
  if (byProduct) return byProduct;
  return active.find((p) => p.category === product.category) || null;
}

function priceAfterPromo(product, promo) {
  if (!promo) return product.price;
  return product.price * (1 - promo.discount_percent / 100);
}

export default function PublicSite() {
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: prod }, { data: promo }] = await Promise.all([
        supabase.from("products").select("*").order("category").order("name"),
        supabase.from("promotions").select("*"),
      ]);
      setProducts(prod || []);
      setPromotions(promo || []);
      setLoading(false);
    }
    load();
  }, []);

  const visibleProducts = useMemo(
    () => (category === "Todos" ? products : products.filter((p) => p.category === category)),
    [products, category]
  );

  const featured = useMemo(() => products.filter((p) => p.featured), [products]);
  const activePromos = useMemo(
    () => promotions.filter((p) => todayInRange(p.starts_at, p.ends_at)),
    [promotions]
  );

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }, []);

  function updateQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const cartTotal = cart.reduce((sum, i) => {
    const promo = activePromotion(i.product, promotions);
    return sum + priceAfterPromo(i.product, promo) * i.quantity;
  }, 0);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

  async function handleCheckout() {
    setCheckoutError("");
    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutError("Preencha seu nome e telefone para finalizar.");
      return;
    }
    if (cart.length === 0) return;

    setCheckingOut(true);
    const items = cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
    const { data: orderId, error } = await supabase.rpc("create_order", {
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim(),
      p_items: items,
    });
    setCheckingOut(false);

    if (error) {
      setCheckoutError("Não foi possível registrar o pedido. Tente novamente.");
      return;
    }

    const lines = cart.map((i) => {
      const promo = activePromotion(i.product, promotions);
      const price = priceAfterPromo(i.product, promo);
      return `• ${i.quantity}x ${i.product.name} — ${formatBRL(price * i.quantity)}`;
    });
    const text = [
      `Olá! Quero confirmar meu pedido #${orderId} na Página Mágica 📖✨`,
      "",
      ...lines,
      "",
      `Total: ${formatBRL(cartTotal)}`,
      `Nome: ${customerName.trim()}`,
    ].join("\n");

    window.open(`https://wa.me/${STORE.phone}?text=${encodeURIComponent(text)}`, "_blank");

    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCartOpen(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#FBF7F0", color: "#2E1F47", minHeight: "100vh" }}>
      <Header cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <Hero />
      {activePromos.length > 0 && <Promotions promos={activePromos} />}
      {featured.length > 0 && (
        <Section id="destaques" title="✨ Destaques" subtitle="Nossas escolhas favoritas do mês">
          <Grid>
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} promo={activePromotion(p, promotions)} onAdd={addToCart} />
            ))}
          </Grid>
        </Section>
      )}
      <Section id="catalogo" title="📚 Catálogo" subtitle="Livros e papelaria para todas as idades">
        <CategoryFilter category={category} setCategory={setCategory} />
        {loading ? (
          <p style={{ color: "#8A7A9E" }}>Carregando catálogo...</p>
        ) : (
          <Grid>
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} promo={activePromotion(p, promotions)} onAdd={addToCart} />
            ))}
          </Grid>
        )}
      </Section>
      <About />
      <Contact />
      <Footer />
      {cartOpen && (
        <CartDrawer
          cart={cart}
          promotions={promotions}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          onCheckout={handleCheckout}
          checkingOut={checkingOut}
          checkoutError={checkoutError}
        />
      )}
      <ChatBot />
    </div>
  );
}

function Header({ cartCount, onCartClick }) {
  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#FBF7F0", borderBottom: "1px solid #E9DFF2",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
      }}
    >
      <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #6B46C1, #3D2A66)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📖</div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 19, color: "#3D2A66" }}>Página Mágica</span>
      </a>

      <nav style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <a href="#catalogo" style={navLink}>Catálogo</a>
        <a href="#sobre" style={navLink}>Sobre</a>
        <a href="#contato" style={navLink}>Contato</a>
        <button
          onClick={onCartClick}
          style={{
            position: "relative", background: "#6B46C1", color: "#fff", border: "none",
            borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          🛒 Carrinho
          {cartCount > 0 && (
            <span style={{ background: "#F2A93B", color: "#3D2A66", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {cartCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}

const navLink = { color: "#5B4B78", textDecoration: "none", fontSize: 14, fontWeight: 600 };

function Hero() {
  return (
    <section
      style={{
        background: "linear-gradient(160deg, #3D2A66 0%, #6B46C1 100%)",
        color: "#fff", padding: "72px 28px", textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#F2A93B" }}>
          ✨ Livraria & Papelaria
        </span>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, margin: "14px 0", lineHeight: 1.2 }}>
          Onde cada página é uma aventura
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
          Livros para todas as idades, papelaria encantada e recomendações sob medida — tudo pertinho de você.
        </p>
        <a
          href="#catalogo"
          style={{
            display: "inline-block", marginTop: 22, background: "#F2A93B", color: "#3D2A66",
            padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}
        >
          Ver catálogo
        </a>
      </div>
    </section>
  );
}

function Promotions({ promos }) {
  return (
    <section style={{ background: "#FFF3DC", padding: "20px 28px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {promos.map((p) => (
          <div key={p.id} style={{ background: "#fff", border: "1px solid #F2D8A0", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, minWidth: 260 }}>
            <span style={{ fontSize: 22 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#3D2A66" }}>{p.title} — {p.discount_percent}% OFF</div>
              <div style={{ fontSize: 12, color: "#8A7A9E" }}>{p.description}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} style={{ padding: "48px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#3D2A66", marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#8A7A9E", marginBottom: 24 }}>{subtitle}</p>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
      {children}
    </div>
  );
}

function CategoryFilter({ category, setCategory }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
      {["Todos", ...CATEGORIES].map((c) => (
        <button
          key={c}
          onClick={() => setCategory(c)}
          style={{
            padding: "7px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: category === c ? "none" : "1px solid #E9DFF2",
            background: category === c ? "#6B46C1" : "#fff",
            color: category === c ? "#fff" : "#5B4B78",
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function ProductCard({ product, promo, onAdd }) {
  const finalPrice = priceAfterPromo(product, promo);
  return (
    <div style={{ background: "#fff", border: "1px solid #EEE4F7", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ background: `${product.cover_color}22`, padding: "26px 16px", textAlign: "center", fontSize: 40 }}>
        {product.cover_emoji}
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: product.cover_color, textTransform: "uppercase", letterSpacing: 0.4 }}>{product.category}</span>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "#3D2A66", margin: "4px 0 2px" }}>{product.name}</h3>
        {product.author && <p style={{ fontSize: 12, color: "#8A7A9E", margin: 0 }}>{product.author}</p>}
        <p style={{ fontSize: 12, color: "#6B5C82", margin: "8px 0", flex: 1, lineHeight: 1.5 }}>{product.description}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          {promo && <span style={{ fontSize: 12, color: "#B4A6C6", textDecoration: "line-through" }}>{formatBRL(product.price)}</span>}
          <span style={{ fontSize: 16, fontWeight: 800, color: "#3D2A66" }}>{formatBRL(finalPrice)}</span>
          {promo && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#B5384C", borderRadius: 6, padding: "2px 6px" }}>-{promo.discount_percent}%</span>}
        </div>
        <button
          onClick={() => onAdd(product)}
          disabled={product.stock <= 0}
          style={{
            marginTop: "auto", background: product.stock > 0 ? "#6B46C1" : "#D9D0E5", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: product.stock > 0 ? "pointer" : "not-allowed",
          }}
        >
          {product.stock > 0 ? "Adicionar ao carrinho" : "Esgotado"}
        </button>
      </div>
    </div>
  );
}

function About() {
  return (
    <section id="sobre" style={{ background: "#F3EBFB", padding: "48px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#3D2A66", marginBottom: 12 }}>Sobre a Página Mágica</h2>
        <p style={{ fontSize: 14, color: "#5B4B78", lineHeight: 1.7 }}>
          Somos uma livraria de bairro que acredita no poder de um bom livro para transformar o dia de alguém.
          Selecionamos cada título com carinho e mantemos uma papelaria completa para acompanhar leitores de
          todas as idades — do primeiro gibi ao próximo best-seller.
        </p>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contato" style={{ padding: "48px 28px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#3D2A66", marginBottom: 16 }}>Visite ou fale conosco</h2>
      <p style={{ fontSize: 14, color: "#5B4B78", margin: "6px 0" }}>📍 {STORE.address}</p>
      <p style={{ fontSize: 14, color: "#5B4B78", margin: "6px 0" }}>🕐 {STORE.hours}</p>
      <a
        href={`https://wa.me/${STORE.phone}`}
        target="_blank" rel="noreferrer"
        style={{ display: "inline-block", marginTop: 16, background: "#25D366", color: "#fff", padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}
      >
        💬 WhatsApp {STORE.phoneDisplay}
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#3D2A66", color: "rgba(255,255,255,0.7)", padding: "24px 28px", textAlign: "center", fontSize: 12 }}>
      <p>© {new Date().getFullYear()} Página Mágica — livraria e papelaria</p>
      <a href="/admin/login" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline", fontSize: 12 }}>Acesso da equipe</a>
    </footer>
  );
}

function CartDrawer({
  cart, promotions, total, onClose, onUpdateQty, onRemove,
  customerName, setCustomerName, customerPhone, setCustomerPhone,
  onCheckout, checkingOut, checkoutError,
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,42,102,0.4)", zIndex: 600 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 601,
        width: "min(400px, 100vw)", background: "#fff", boxShadow: "-8px 0 30px rgba(61,42,102,0.2)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #EEE4F7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#3D2A66", margin: 0 }}>🛒 Seu carrinho</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#8A7A9E" }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {cart.length === 0 ? (
            <p style={{ color: "#8A7A9E", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              Seu carrinho está vazio.{" "}
              <a href="#catalogo" onClick={onClose} style={{ color: "#6B46C1" }}>Ver catálogo</a>
            </p>
          ) : (
            cart.map(({ product, quantity }) => {
              const promo = activePromotion(product, promotions);
              const price = priceAfterPromo(product, promo);
              return (
                <div key={product.id} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${product.cover_color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {product.cover_emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2A66" }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: "#8A7A9E" }}>{formatBRL(price)} cada</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <button onClick={() => onUpdateQty(product.id, -1)} style={qtyBtn}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{quantity}</span>
                      <button onClick={() => onUpdateQty(product.id, 1)} style={qtyBtn}>+</button>
                      <button onClick={() => onRemove(product.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#B5384C", fontSize: 12, cursor: "pointer" }}>Remover</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ borderTop: "1px solid #EEE4F7", padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#3D2A66", marginBottom: 14 }}>
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>

            <input
              placeholder="Seu nome"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={cartInput}
            />
            <input
              placeholder="WhatsApp (com DDD)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{ ...cartInput, marginTop: 8 }}
            />

            {checkoutError && <p style={{ color: "#B5384C", fontSize: 12, marginTop: 8 }}>{checkoutError}</p>}

            <button
              onClick={onCheckout}
              disabled={checkingOut}
              style={{
                marginTop: 12, width: "100%", background: "#25D366", color: "#fff", border: "none",
                borderRadius: 10, padding: "12px 20px", fontWeight: 700, fontSize: 14,
                cursor: checkingOut ? "wait" : "pointer", opacity: checkingOut ? 0.7 : 1,
              }}
            >
              {checkingOut ? "Enviando..." : "Finalizar pedido no WhatsApp"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const qtyBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid #E9DFF2", background: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 };
const cartInput = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E9DFF2", fontSize: 13, outline: "none", fontFamily: "inherit" };
