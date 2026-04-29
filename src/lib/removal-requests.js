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
  const token = pat();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export function isRemovalStoreConfigured() {
  return Boolean(repo() && pat());
}

async function readRepoJson(filePath) {
  const url = `https://api.github.com/repos/${owner()}/${repo()}/contents/${filePath}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`Removal store read failed: ${res.status}`);
  const json = await res.json();
  if (!json.content) return { data: null, sha: json.sha ?? null };
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  try {
    return { data: JSON.parse(decoded), sha: json.sha };
  } catch {
    return { data: null, sha: json.sha };
  }
}

async function writeRepoJson(filePath, data, sha, message) {
  const url = `https://api.github.com/repos/${owner()}/${repo()}/contents/${filePath}`;
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Removal store write failed: ${res.status} ${txt}`);
  }
}

function normalizeLinkedinUrl(raw) {
  const m = String(raw || "").match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (!m) return "";
  return `https://www.linkedin.com/in/${m[1].toLowerCase()}`;
}

function maskEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const m = e.match(/^([^@]+)@(.+)$/);
  if (!m) return "";
  const user = m[1];
  const maskedUser =
    user.length <= 2 ? `${user[0] || "*"}*` : `${user[0]}***${user.slice(-1)}`;
  return `${maskedUser}@${m[2]}`;
}

function makeRequestId(linkedinUrl, email) {
  const base = `${linkedinUrl}|${String(email || "").toLowerCase()}|${Date.now()}|${randomUUID()}`;
  return createHash("sha256").update(base).digest("hex").slice(0, 16);
}

export async function createRemovalRequest({
  linkedinUrl,
  email,
  verification,
  details,
  ip,
  ua,
}) {
  if (!isRemovalStoreConfigured()) {
    throw new Error("Removal request store is not configured.");
  }
  const normalized = normalizeLinkedinUrl(linkedinUrl);
  if (!normalized) throw new Error("Invalid LinkedIn profile URL.");
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes("@")) throw new Error("Invalid email.");
  const verificationText = String(verification || "").trim();
  if (!verificationText) throw new Error("Verification details are required.");

  const id = makeRequestId(normalized, emailNorm);
  const submittedAt = new Date().toISOString();
  const request = {
    id,
    status: "new",
    linkedin_url: normalized,
    contact_email: emailNorm,
    verification: verificationText,
    details: String(details || "").trim(),
    submitted_at: submittedAt,
    meta: {
      ip_hash: createHash("sha256").update(String(ip || "")).digest("hex"),
      user_agent: String(ua || "").slice(0, 500),
    },
  };

  await writeRepoJson(
    `requests/${id}.json`,
    request,
    null,
    `Create removal request ${id}`
  );

  const { data: idxData, sha: idxSha } = await readRepoJson("requests/_index.json");
  const idx = Array.isArray(idxData) ? idxData : [];
  idx.push({
    id,
    status: "new",
    linkedin_url: normalized,
    contact_email_masked: maskEmail(emailNorm),
    submitted_at: submittedAt,
  });
  await writeRepoJson(
    "requests/_index.json",
    idx,
    idxSha,
    `Index removal request ${id}`
  );
  return { id, submittedAt };
}

export async function listRemovalRequests() {
  if (!isRemovalStoreConfigured()) return [];
  const { data } = await readRepoJson("requests/_index.json");
  return Array.isArray(data) ? data : [];
}

