// Selo de retorno para o site da Aruanã.
//
// Existe por dois motivos que se somam:
// 1) BRAND.md exige que estes projetos sejam sempre identificados como
//    demonstração — "empresa fictícia, software real", nunca cliente.
// 2) Sem ele, quem clica em "Abrir e testar ao vivo" no site da Aruanã chega
//    aqui e não tem caminho de volta. É o visitante mais convencido que se perde.
//
// A UTM permite medir esse retorno no GA4 da Aruanã, em vez de só supor.

const DESTINO =
  "https://aruanadigital.com/?utm_source=demo&utm_medium=selo&utm_campaign=pagina_magica";

export default function SeloAruana() {
  return (
    <a
      href={DESTINO}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Projeto de demonstração da Aruanã Digital — abrir o site da Aruanã em nova aba"
      style={{
        position: "fixed",
        left: "12px",
        bottom: "12px",
        zIndex: 2147483000,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 14px",
        borderRadius: "999px",
        background: "rgba(11,31,51,0.92)",
        color: "#ffffff",
        font: "500 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.28)",
        backdropFilter: "blur(6px)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          background: "#00C57A",
          flexShrink: 0,
        }}
      />
      <span>
        Projeto de demonstração ·{" "}
        <strong style={{ fontWeight: 700 }}>Aruanã Digital</strong>
      </span>
    </a>
  );
}
