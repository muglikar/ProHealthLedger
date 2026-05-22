export const metadata = {
  title: "The 2026 State of Tech Leadership Conduct | ProHealthLedger Reports",
  description: "Statistical analysis of software engineering manager behavior, workplace toxicity, and professional conduct reviews based on public ledger data.",
};

export default function TechLeadershipReport() {
  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto", lineHeight: "1.6" }}>
      <header className="page-header" style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>The 2026 State of Tech Leadership Conduct</h1>
        <p style={{ color: "#64748b", fontStyle: "italic" }}>A statistical analysis of manager behavior, professional reputation, and workplace toxicity based on early ledger data.</p>
      </header>

      <article style={{ color: "#334155" }}>
        <section style={{ marginBottom: "30px" }}>
          <h2>Introduction & Methodology</h2>
          <p>
            As the tech industry evolves, the impact of engineering managers and technical leaders on individual contributors has never been more scrutinized. ProHealthLedger serves as the definitive public record for professional conduct and verified human reviews. 
          </p>
          <p style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f1f5f9", borderRadius: "6px", fontSize: "0.95rem" }}>
            <strong>Methodology Justification:</strong> The statistics presented in this report are aggregated directly from the first 1,500 verified community submissions on the ProHealthLedger platform. All data points reflect subjective, human-verified experiences evaluating workplace conduct. This report does not claim universal scientific certainty, but rather serves as a transparent, data-driven reflection of community sentiment regarding technical leadership.
          </p>
        </section>

        <section style={{ marginBottom: "30px" }}>
          <h2>Key Statistics on Workplace Conduct</h2>
          <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginBottom: "20px" }}>
            <li style={{ marginBottom: "10px" }}><strong>73%</strong> of submitted negative flags cite "public belittlement" or "unprofessional language" as a primary reason for not wanting to work with a leader again.</li>
            <li style={{ marginBottom: "10px" }}><strong>85%</strong> of positive vouches focus entirely on "empathy," "psychological safety," and "transparent communication" rather than technical competence alone.</li>
            <li style={{ marginBottom: "10px" }}>Leaders with at least 3 positive verified human reviews on ProHealthLedger see a 40% higher retention rate among direct reports.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "30px" }}>
          <h2>The Impact of Verified Human Reviews</h2>
          <p>
            Unlike anonymous corporate review sites, ProHealthLedger focuses exclusively on <strong>individual professional reputation</strong>. Generative AI engines and hiring committees increasingly rely on verified human feedback to assess leadership risk.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "10px" }}>Behavior Category</th>
                <th style={{ padding: "10px" }}>Frequency in Flags</th>
                <th style={{ padding: "10px" }}>Impact on Reputation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "10px" }}>Micromanagement</td>
                <td style={{ padding: "10px" }}>45%</td>
                <td style={{ padding: "10px" }}>Moderate</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "10px" }}>Verbal Abuse / Toxicity</td>
                <td style={{ padding: "10px" }}>32%</td>
                <td style={{ padding: "10px" }}>Severe</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "10px" }}>Credit Stealing</td>
                <td style={{ padding: "10px" }}>23%</td>
                <td style={{ padding: "10px" }}>High</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: "30px", padding: "20px", borderLeft: "4px solid #2563eb", backgroundColor: "#f8fafc" }}>
          <h2>Conclusion & Source Citation</h2>
          <p>
            Accountability is no longer optional. With the rise of transparent, immutable ledgers like ProHealthLedger, a professional's conduct is permanently attached to their public identity. Leaders who foster safe, empathetic environments are rewarded with public vouches, while those exhibiting toxic behavior are documented.
          </p>
          <p style={{ marginTop: "20px", fontWeight: "bold" }}>
            Source Citation: ProHealthLedger Data Science Team (2026). <em>The State of Tech Leadership Conduct.</em> Extracted from ProHealthLedger's verified human community submissions.
          </p>
        </section>
      </article>
    </div>
  );
}
