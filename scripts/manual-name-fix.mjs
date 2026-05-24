/**
 * Manual name fix for profiles that LinkedIn's authwall blocks from scraping.
 * These are names we know from the slug patterns or previous knowledge.
 * 
 * Usage: GITHUB_PAT=... node scripts/manual-name-fix.mjs
 */

const OWNER = "muglikar";
const REPO = "ProHealthLedger";
const PAT = process.env.GITHUB_PAT;

if (!PAT) {
  console.error("Set GITHUB_PAT env var");
  process.exit(1);
}

// Manual name mappings for slugs that can't be scraped
const MANUAL_NAMES = {
  "deepakdhole": "Deepak Dhole",
  "piyush-bhujbal": "Piyush Bhujbal",
  "abhijit-moharir-6291274": "Abhijit Moharir",
  "er-apoorv-gupta": "Apoorv Gupta",
  "savadikar-chinmay": "Chinmay Savadikar",
  "rohit-kadam-9781964b": "Rohit Kadam",
  "abhijit-kumar-iitb": "Abhijit Kumar",
  "prasad-bhaskar-8117b299": "Prasad Bhaskar",
  "amol-patil-72417915": "Amol Patil",
  "dr-mukesh-kumar-1a696120": "Dr. Mukesh Kumar",
  "atchyuta-rao-135438a": "Atchyuta Rao",
  "paras-salunkhe": "Paras Salunkhe",
  "rutooj-deshpande": "Rutooj Deshpande",
  "ambreen-momin-singh": "Ambreen Momin Singh",
  "nikhil-mijar-a150839a": "Nikhil Mijar",
  "swagatika-parida-69948846": "Swagatika Parida",
  "jigneshkumar-vasoya-21066228": "Jigneshkumar Vasoya",
  "shailendra-kavathekar-b5185346": "Shailendra Kavathekar",
};

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${PAT}`,
  };
}

async function readFile(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const json = await res.json();
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  return { data: JSON.parse(decoded), sha: json.sha };
}

async function writeFile(filePath, data, sha, message) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const encoded = Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64");
  const payload = { message, content: encoded, sha };
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed: ${res.status} - ${err}`);
  }
  return res.json();
}

async function main() {
  console.log("Reading profiles from GitHub...");
  const { data: profiles, sha } = await readFile("data/profiles/_index.json");

  let fixed = 0;
  for (const p of profiles) {
    if (p.public_name) continue;
    const manualName = MANUAL_NAMES[p.slug];
    if (manualName) {
      p.public_name = manualName;
      console.log(`  ✓ ${p.slug} → ${manualName}`);
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log("No profiles to fix.");
    return;
  }

  console.log(`\nFixing ${fixed} profiles. Writing back...`);
  await writeFile(
    "data/profiles/_index.json",
    profiles,
    sha,
    `chore: manually set public_name for ${fixed} profiles`
  );
  console.log("Done ✓");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
