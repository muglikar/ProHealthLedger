import Link from "next/link";

export default function ComplianceBanner() {
  return (
    <aside
      style={{
        background: "#fff7ed",
        borderBottom: "1px solid #fdba74",
        color: "#7c2d12",
        fontSize: "0.85rem",
      }}
    >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "8px 16px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
          }}
        >
          <span style={{ fontSize: "0.8rem" }}>
            <strong>Compliance notice:</strong> PHL is not a consumer report and must not be used for credit, insurance, housing, or employment eligibility decisions.
          </span>
          <span style={{ color: "#fdba74" }}>|</span>
          <div style={{ display: "flex", gap: "8px", fontSize: "0.8rem", flexShrink: 0 }}>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <span>·</span>
            <Link href="/privacy">Privacy</Link>
            <span>·</span>
            <Link href="/data-rights">Data Rights</Link>
          </div>
        </div>
    </aside>
  );
}

