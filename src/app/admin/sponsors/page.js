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

      <div className="mod-table-container" style={{ 
        background: '#ffffff', 
        borderRadius: '20px', 
        boxShadow: '0 4px 25px rgba(0,0,0,0.06)',
        padding: '30px',
        marginTop: '30px',
        overflowX: 'auto'
      }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 12px", textAlign: "left", fontSize: "0.92rem" }}>
          <thead>
            <tr style={{ color: "#64748b", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
              <th style={{ padding: "0 16px 8px" }}>Date</th>
              <th style={{ padding: "0 16px 8px" }}>Sponsor Details</th>
              <th style={{ padding: "0 16px 8px" }}>Organization</th>
              <th style={{ padding: "0 16px 8px" }}>Tier</th>
              <th style={{ padding: "0 16px 8px" }}>Amount</th>
              <th style={{ padding: "0 16px 8px" }}>Transaction Info</th>
            </tr>
          </thead>
          <tbody>
            {sortedSponsors.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "12px" }}>
                  No sponsorships recorded yet.
                </td>
              </tr>
            ) : (
              sortedSponsors.map((sponsor, index) => (
                <tr key={index} style={{ background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "16px", borderTopLeftRadius: "12px", borderBottomLeftRadius: "12px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: "600" }}>{new Date(sponsor.timestamp).toLocaleDateString()}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{new Date(sponsor.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: "16px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "1rem" }}>{sponsor.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{sponsor.email}</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{sponsor.mobile}</div>
                  </td>
                  <td style={{ padding: "16px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: "600" }}>{sponsor.org || sponsor.organization || "Individual"}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{sponsor.country}</div>
                  </td>
                  <td style={{ padding: "16px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ 
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      background: "#fff7ed",
                      color: "#9a3412",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      textTransform: "uppercase"
                    }}>
                      {sponsor.tier}
                    </span>
                  </td>
                  <td style={{ padding: "16px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: "800", color: "#059669", fontSize: "1rem" }}>{sponsor.currency} {sponsor.amount}</div>
                  </td>
                  <td style={{ padding: "16px", borderTopRightRadius: "12px", borderBottomRightRadius: "12px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>ID: <span style={{ fontFamily: "monospace" }}>{sponsor.razorpay_payment_id}</span></div>
                    {sponsor.razorpay_order_id && <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Order: <span style={{ fontFamily: "monospace" }}>{sponsor.razorpay_order_id}</span></div>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
