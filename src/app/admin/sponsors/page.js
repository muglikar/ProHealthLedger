import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSessionSiteAdmin } from "@/lib/site-admins";
import { readDataFile } from "@/lib/github";
import { redirect } from "next/navigation";
import SponsorRow from "./SponsorRow";
import { buildUnifiedPhotoMap, lookupPhoto } from "@/lib/photo-map";

export default async function SponsorsAdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    redirect("/");
  }

  const { data: sponsors } = await readDataFile("data/sponsors/_index.json");
  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const { data: users } = await readDataFile("data/users/_index.json");

  const photoMap = buildUnifiedPhotoMap(profiles || [], users || []);

  // Sort sponsors by newest first
  const sortedSponsors = [...(sponsors || [])].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Pre-compute profile matches for each sponsor (server-side)
  const sponsorData = sortedSponsors.map((sponsor) => {
    const profileMatch = (profiles || []).find(
      (p) =>
        p.public_name &&
        sponsor.name &&
        p.public_name.toLowerCase() === sponsor.name.toLowerCase()
    );

    const resolvedPhoto = lookupPhoto(photoMap, { displayName: sponsor.name });

    return {
      sponsor: JSON.parse(JSON.stringify(sponsor)),
      profileMatch: {
        linkedin_url: profileMatch?.linkedin_url || null,
        profile_photo_url: resolvedPhoto || profileMatch?.profile_photo_url || null,
      },
    };
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
            {sponsorData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "12px" }}>
                  No sponsorships recorded yet.
                </td>
              </tr>
            ) : (
              sponsorData.map((item, index) => (
                <SponsorRow
                  key={index}
                  sponsor={item.sponsor}
                  profileMatch={item.profileMatch}
                  index={index}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
