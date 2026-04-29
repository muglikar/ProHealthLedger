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
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <strong>Compliance notice:</strong>
        <span>
          PHL is not a consumer report and must not be used for credit,
          insurance, housing, or employment eligibility decisions.
        </span>
        <Link href="/terms">Terms</Link>
        <span>·</span>
        <Link href="/privacy">Privacy</Link>
        <span>·</span>
        <Link href="/data-rights">Data Rights</Link>
      </div>
    </aside>
  );
}

