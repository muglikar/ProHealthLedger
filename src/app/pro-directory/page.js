import { readDataFile } from "@/lib/github";
import DirectoryClient from "./DirectoryClient";

export const metadata = {
  title: "The Good Boss & Colleagues Directory - ProHealthLedger",
  description: "Browse the complete directory of verified professionals, vouches, and accountability records on the Good Boss & Good Colleagues Ledger.",
};

export default async function DirectoryPage() {
  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const publicProfiles = Array.isArray(profiles) ? profiles : [];

  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "40px" }}>
        <h1>The Good Boss &amp; Colleagues Directory</h1>
        <p>Browse the complete directory of verified professionals.</p>
      </header>

      <DirectoryClient profiles={publicProfiles} />

      {/* Visually hidden comments for crawlers and screen readers */}
      <div className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {publicProfiles.map((p) => {
          if (!p.submissions || p.submissions.length === 0) return null;
          return (
            <div key={p.slug}>
              <h2>Comments for {p.public_name || p.slug}</h2>
              {p.submissions.map((sub, i) => (
                <article key={i}>
                  <p><strong>{sub.display_name || sub.user || "Verified Professional"}</strong> voted {sub.vote}</p>
                  <p>{sub.reason || sub.comment || "Verified professional review for conduct and behavior."}</p>
                  <p>Date: {sub.date}</p>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
