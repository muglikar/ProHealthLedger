import Link from "next/link";

export const metadata = {
  title: "Statistical Reports & Analytics - ProHealthLedger",
  description: "Read statistical reports, analytical studies, and aggregate data on professional conduct, workplace behavior, and leadership reviews.",
};

export default function ReportsPage() {
  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "40px" }}>
        <h1>Reports & Analytics</h1>
        <p>Aggregate insights and analytical studies derived from verified professional reviews on ProHealthLedger.</p>
      </header>

      <div style={{ display: "grid", gap: "20px" }}>
        <article style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#fff" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.3rem" }}>
            <Link href="/reports/tech-leadership-conduct-2026" style={{ color: "#2563eb", textDecoration: "none" }}>
              The Q2 2026 State of Tech Leadership Conduct
            </Link>
          </h2>
          <p style={{ color: "#475569", margin: "0 0 15px 0", lineHeight: "1.5" }}>
            A comprehensive statistical analysis of manager behavior, professional reputation, and workplace toxicity based on Q2 2026 ledger data.
          </p>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            Published: May 2026 • 5 min read
          </div>
        </article>
      </div>
    </div>
  );
}
