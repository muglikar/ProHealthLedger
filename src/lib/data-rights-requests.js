import { createHash, randomUUID } from "node:crypto";

function owner() {
  return (
    process.env.GITHUB_REMOVALS_OWNER ||
    process.env.GITHUB_REDACTIONS_OWNER ||
    process.env.GITHUB_OWNER ||
    "muglikar"
  ).trim();
}

function repo() {
  return (
    process.env.GITHUB_REMOVALS_REPO ||
    process.env.GITHUB_REDACTIONS_REPO ||
    ""
  ).trim();
}

function pat() {
  return (
    process.env.GITHUB_REMOVALS_PAT ||
    process.env.GITHUB_REDACTIONS_PAT ||
    process.env.GITHUB_PAT ||
    ""
  ).trim();
}

function headers() {
  const h = { "Content-Type": "application/json" };
  if (pat()) h.Authorization = `Bearer ${pat()}`;
  return h;
}

export function isDataRightsStoreConfigured() {
  return Boolean(repo() && pat());
}

async function readJson(path) {
  const url = `https://api.github.com/repos/${owner()}/${repo()}/contents/${path}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`Read failed ${res.status}`);
  const json = await res.json();
  if (!json.content) return { data: null, sha: json.sha ?? null };
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  try {
    return { data: JSON.parse(decoded), sha: json.sha };
  } catch {
    return { data: null, sha: json.sha };
  }
}

async function writeJson(path, data, sha, message) {
  const url = `https://api.github.com/repos/${owner()}/${repo()}/contents/${path}`;
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n").toString(
    "base64"
  );
  const payload = { message, content };
  if (sha) payload.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Write failed ${res.status}`);
}

function maskEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const m = e.match(/^([^@]+)@(.+)$/);
  if (!m) return "";
  return `${(m[1] || "*").slice(0, 1)}***@${m[2]}`;
}

export async function createDataRightsRequest({
  name,
  email,
  jurisdiction,
  requestType,
  details,
  ip,
  ua,
}) {
  const n = String(name || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const j = String(jurisdiction || "").trim();
  const rt = String(requestType || "").trim();
  const d = String(details || "").trim();
  if (!n || !e || !j || !rt || !d) throw new Error("All fields are required.");
  if (!isDataRightsStoreConfigured()) throw new Error("Data rights store not configured.");

  const id = createHash("sha256")
    .update(`${e}|${Date.now()}|${randomUUID()}`)
    .digest("hex")
    .slice(0, 16);
  const submittedAt = new Date().toISOString();
  const payload = {
    id,
    status: "new",
    name: n,
    email: e,
    jurisdiction: j,
    request_type: rt,
    details: d,
    submitted_at: submittedAt,
    meta: {
      ip_hash: createHash("sha256").update(String(ip || "")).digest("hex"),
      user_agent: String(ua || "").slice(0, 500),
    },
  };
  await writeJson(`data-rights/${id}.json`, payload, null, `Create data-rights request ${id}`);

  const { data, sha } = await readJson("data-rights/_index.json");
  const list = Array.isArray(data) ? data : [];
  list.push({
    id,
    status: "new",
    name: n,
    email_masked: maskEmail(e),
    jurisdiction: j,
    request_type: rt,
    submitted_at: submittedAt,
  });
  await writeJson("data-rights/_index.json", list, sha, `Index data-rights request ${id}`);
  return { id, submittedAt };
}

