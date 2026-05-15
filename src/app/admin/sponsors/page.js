import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSessionSiteAdmin } from "@/lib/site-admins";
import { readDataFile } from "@/lib/github";
import { redirect } from "next/navigation";

export default async function SponsorsAdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    redirect("/");
  }

  const { data: sponsors } = await readDataFile("data/sponsors/_index.json");

  // Sort sponsors by newest first
  const sortedSponsors = [...(sponsors || [])].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <>
      <div className="page-header">
        <h1>Sponsorships Dashboard</h1>
        <p>A complete ledger of all incoming sponsorships.</p>
      </div>

      <div className="mod-list" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e8e0d4", color: "#64748b" }}>
              <th style={{ padding: "12px 8px" }}>Date</th>
              <th style={{ padding: "12px 8px" }}>Name</th>
              <th style={{ padding: "12px 8px" }}>Email</th>
              <th style={{ padding: "12px 8px" }}>Org / Country</th>
              <th style={{ padding: "12px 8px" }}>Tier</th>
              <th style={{ padding: "12px 8px" }}>Amount</th>
              <th style={{ padding: "12px 8px" }}>Payment ID</th>
            </tr>
          </thead>
          <tbody>
            {sortedSponsors.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>No sponsorships recorded yet.</td>
              </tr>
            ) : (
              sortedSponsors.map((sponsor, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>{new Date(sponsor.timestamp).toLocaleDateString()}</td>
                  <td style={{ padding: "12px 8px", fontWeight: "600" }}>{sponsor.name}</td>
                  <td style={{ padding: "12px 8px" }}>{sponsor.email}</td>
                  <td style={{ padding: "12px 8px" }}>{sponsor.org} <br/><span style={{fontSize: "0.8rem", color: "#64748b"}}>{sponsor.country}</span></td>
                  <td style={{ padding: "12px 8px" }}>
                    <span className="vote-pill vote-pill-yes">{sponsor.tier}</span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>{sponsor.currency} {sponsor.amount}</td>
                  <td style={{ padding: "12px 8px", fontSize: "0.8rem", fontFamily: "monospace", color: "#64748b" }}>{sponsor.razorpay_payment_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
