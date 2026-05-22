import { readDataFile } from "@/lib/github";
import Link from "next/link";
import { formatProfessionalDisplayName } from "@/lib/profiles";

export const metadata = {
  title: "Professional Directory - ProHealthLedger",
  description: "Browse the complete directory of verified professionals, workplace conduct reviews, and human vouches on ProHealthLedger.",
};

export default async function DirectoryPage() {
  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const publicProfiles = Array.isArray(profiles) ? profiles : [];

  // Sort alphabetically by public name or slug
  const sortedProfiles = [...publicProfiles].sort((a, b) => {
    const nameA = formatProfessionalDisplayName(a.slug, a.public_name).toLowerCase();
    const nameB = formatProfessionalDisplayName(b.slug, b.public_name).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "40px" }}>
        <h1>Professional Directory</h1>
        <p>Browse the complete directory of verified professionals.</p>
      </header>

      <div className="directory-list" style={{ display: "grid", gap: "15px" }}>
        {sortedProfiles.map((p) => {
          const displayName = formatProfessionalDisplayName(p.slug, p.public_name);
          const rawUrl = typeof p.linkedin_url === "string" ? p.linkedin_url : "";
          const urlSlug = rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || p.slug;
          
          return (
            <article key={p.slug} className="directory-item" style={{ padding: "15px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#fff" }}>
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 10px 0" }}>
                <Link href={`/p/directory/directory/${encodeURIComponent(urlSlug)}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: "bold" }}>
                  {displayName}
                </Link>
              </h2>
              <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                {p.submissions?.length || 0} verified community vote(s)
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
