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
    </div>
  );
}
