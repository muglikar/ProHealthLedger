import { readDataFile } from "@/lib/github";
import DirectoryClient from "./DirectoryClient";

export const metadata = {
  title: "Professional Directory - ProHealthLedger",
  description: "Browse the complete directory of verified professionals, workplace conduct reviews, and human vouches on ProHealthLedger.",
};

export default async function DirectoryPage() {
  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const publicProfiles = Array.isArray(profiles) ? profiles : [];

  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "40px" }}>
        <h1>Professional Directory</h1>
        <p>Browse the complete directory of verified professionals.</p>
      </header>

      <DirectoryClient profiles={publicProfiles} />
    </div>
  );
}
