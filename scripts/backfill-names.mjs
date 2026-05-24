/**
 * One-time script: resolve public_name for all profiles that are missing it.
 * 
 * Usage: node scripts/backfill-names.mjs
 * 
 * Reads data/profiles/_index.json from the GitHub API, attempts to resolve
 * the real name for each profile missing a public_name via LinkedIn page
 * scraping, then writes back the updated file.
 */

const OWNER = "muglikar";
const REPO = "ProHealthLedger";
const PAT = process.env.GITHUB_PAT;
const FETCH_TIMEOUT_MS = 6000;

if (!PAT) {
  console.error("Set GITHUB_PAT env var");
  process.exit(1);
}

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

async function resolveLinkedinName(slug) {
  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 32768) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</title>")) break;
    }
    reader.cancel().catch(() => {});

    // Extract from <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      let s = titleMatch[1].trim();
      s = s.replace(/^\(\d+\)\s*/, "");
      s = s.replace(/\s*\|\s*LinkedIn\s*$/i, "");
      const firstSegment = s.split(/\s+-\s+/)[0].trim();
      if (firstSegment && firstSegment.length >= 2 && !/linkedin/i.test(firstSegment)) {
        return firstSegment
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .trim();
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log("Reading profiles from GitHub...");
  const { data: profiles, sha } = await readFile("data/profiles/_index.json");

  const missing = profiles.filter((p) => !p.public_name);
  console.log(`Found ${missing.length} profiles without public_name.`);

  let resolved = 0;
  for (const p of missing) {
    const slug = p.slug;
    console.log(`  Resolving: ${slug}...`);
    const name = await resolveLinkedinName(slug);
    if (name) {
      p.public_name = name;
      console.log(`    ✓ ${name}`);
      resolved++;
    } else {
      console.log(`    ✗ Could not resolve`);
    }
    // Small delay to avoid LinkedIn rate limiting
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (resolved === 0) {
    console.log("No names resolved. Nothing to write.");
    return;
  }

  console.log(`\nResolved ${resolved}/${missing.length} names. Writing back...`);
  await writeFile(
    "data/profiles/_index.json",
    profiles,
    sha,
    `chore: backfill public_name for ${resolved} profiles via LinkedIn`
  );
  console.log("Done ✓");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
