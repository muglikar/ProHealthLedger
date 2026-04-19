const OWNER = process.env.GITHUB_OWNER || "muglikar";
const REPO = process.env.GITHUB_REPO || "ProHealthLedger";

function headers() {
  const pat = process.env.GITHUB_PAT;
  const h = { "Content-Type": "application/json" };
  if (pat) h.Authorization = `Bearer ${pat}`;
  return h;
}

export async function readDataFile(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) return { data: [], sha: null };
  const json = await res.json();
  if (!json.content) return { data: [], sha: null };
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  try {
    const data = JSON.parse(decoded);
    return { data: Array.isArray(data) ? data : [], sha: json.sha };
  } catch {
    return { data: [], sha: json.sha };
  }
}

export async function writeDataFile(filePath, data, sha, message) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const encoded = Buffer.from(
    JSON.stringify(data, null, 2) + "\n"
  ).toString("base64");
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ message, content: encoded, sha }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} - ${err}`);
  }
  return res.json();
}

/** Read arbitrary JSON (object or array). For array profile files prefer {@link readDataFile}. */
export async function readRepoJson(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) return { data: null, sha: null };
  const json = await res.json();
  if (!json.content) return { data: null, sha: json.sha ?? null };
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  try {
    return { data: JSON.parse(decoded), sha: json.sha };
  } catch {
    return { data: null, sha: json.sha };
  }
}

/** Create or update JSON. Omit `sha` when creating a new file. */
export async function writeRepoJson(filePath, data, sha, message) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const encoded = Buffer.from(
    JSON.stringify(data, null, 2) + "\n"
  ).toString("base64");
  const payload = { message, content: encoded };
  if (sha) payload.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function createIssue(title, body, labels = []) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub Issue creation failed: ${res.status} - ${err}`);
  }
  return res.json();
}
