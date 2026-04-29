import { createHash } from "node:crypto";

/**
 * Moderation redaction helpers.
 *
 * Public profile JSON keeps a tamper-evident hash of the original `reason`;
 * the original text itself is moved to a separate **private** GitHub repo so
 * it can be restored on un-redact and reviewed in audit/regulator scenarios
 * without exposing it on the public ledger. If the private repo isn't
 * configured the redaction still goes through, but the original text is lost.
 *
 * Public ledger entry shape after redaction:
 *   reason_redacted: true
 *   redacted_by:       "github:..." | "linkedin:..."
 *   redacted_at:       ISO-8601 UTC
 *   redaction_category: one of REDACTION_CATEGORIES
 *   reason_hash:       "sha256:<64 hex chars>"
 *   reason:            <removed from this entry>
 */

export const REDACTION_CATEGORIES = Object.freeze([
  "abuse",
  "pii",
  "off-topic",
  "unverified",
  "miscellaneous",
]);

export const DEFAULT_REDACTION_CATEGORY = "miscellaneous";

export function normalizeCategory(raw) {
  const t = String(raw || "").trim().toLowerCase();
  return REDACTION_CATEGORIES.includes(t) ? t : DEFAULT_REDACTION_CATEGORY;
}

/**
 * SHA-256 with public per-record salt (issue number + domain prefix).
 *
 * Salting with the issue number prevents cross-record rainbow-table lookups,
 * but the salt is public so anyone holding the original text can verify the
 * hash. This is intentional: the goal is tamper-evidence, not concealment of
 * short distinct strings (those are already weak against brute force; for
 * concealment we rely on the private store, not the hash).
 */
export function hashReasonForIssue(issueNumber, originalText) {
  const issuePart = String(issueNumber ?? "");
  const textPart = String(originalText ?? "");
  const digest = createHash("sha256")
    .update(`prohl:redaction:v1:${issuePart}:${textPart}`, "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

/** Owner of the private redactions repo. Falls back to the public repo's owner. */
function privateOwner() {
  const o =
    process.env.GITHUB_REDACTIONS_OWNER ||
    process.env.GITHUB_OWNER ||
    "muglikar";
  return o.trim();
}

/** Repo name of the private redactions repo. Empty => private store disabled. */
function privateRepo() {
  return (process.env.GITHUB_REDACTIONS_REPO || "").trim();
}

/** PAT for the private repo. Falls back to the main GITHUB_PAT. */
function privatePat() {
  return (
    process.env.GITHUB_REDACTIONS_PAT ||
    process.env.GITHUB_PAT ||
    ""
  ).trim();
}

/**
 * Whether the private redactions store is configured. When false, redactions
 * still happen on the public side; they just don't preserve the original
 * text and can't be un-redacted back to the original later.
 */
export function isPrivateRedactionStoreConfigured() {
  return Boolean(privateRepo() && privatePat());
}

function privateHeaders() {
  const pat = privatePat();
  const h = { "Content-Type": "application/json" };
  if (pat) h.Authorization = `Bearer ${pat}`;
  return h;
}

function fileForIssue(issueNumber) {
  return `redactions/${issueNumber}.json`;
}

async function readPrivateFile(filePath) {
  const owner = privateOwner();
  const repo = privateRepo();
  if (!repo) return { data: null, sha: null };
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const res = await fetch(url, { headers: privateHeaders(), cache: "no-store" });
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

async function writePrivateFile(filePath, data, sha, message) {
  const owner = privateOwner();
  const repo = privateRepo();
  if (!repo) {
    throw new Error("Private redactions repo is not configured.");
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const encoded = Buffer.from(
    JSON.stringify(data, null, 2) + "\n"
  ).toString("base64");
  const payload = { message, content: encoded };
  if (sha) payload.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: privateHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Private redactions GitHub API error: ${res.status} - ${err}`
    );
  }
  return res.json();
}

/**
 * Persist the original reason text + redaction history to the private repo.
 * Idempotent for the same `issueNumber`: if a record already exists, the new
 * action is appended to its history instead of overwriting.
 *
 * @returns {Promise<{stored:boolean}>}
 */
export async function recordPrivateRedaction({
  issueNumber,
  originalText,
  moderatorId,
  category,
  at,
}) {
  if (!isPrivateRedactionStoreConfigured()) {
    return { stored: false };
  }
  const path = fileForIssue(issueNumber);
  const { data: existing, sha } = await readPrivateFile(path);
  const event = {
    action: "redact",
    moderator: moderatorId,
    at,
    category: normalizeCategory(category),
  };
  const next = existing
    ? {
        ...existing,
        // Original text always preserved (don't overwrite if already set).
        original_reason:
          typeof existing.original_reason === "string" && existing.original_reason
            ? existing.original_reason
            : String(originalText ?? ""),
        history: Array.isArray(existing.history)
          ? [...existing.history, event]
          : [event],
      }
    : {
        issue: issueNumber,
        original_reason: String(originalText ?? ""),
        first_redacted_at: at,
        history: [event],
      };
  await writePrivateFile(
    path,
    next,
    sha,
    `Redact reason for issue #${issueNumber} (${event.category})`
  );
  return { stored: true };
}

/**
 * Read the original reason text for a previously-redacted issue from the
 * private store. Returns null if the private store isn't configured or no
 * record exists.
 */
export async function readPrivateOriginalReason(issueNumber) {
  if (!isPrivateRedactionStoreConfigured()) return null;
  const { data } = await readPrivateFile(fileForIssue(issueNumber));
  if (!data || typeof data.original_reason !== "string") return null;
  return data.original_reason;
}

/**
 * Append an "unredact" event to the private record (so the audit trail in
 * the private repo stays complete). No-op if the private store isn't
 * configured.
 */
export async function recordPrivateUnredaction({
  issueNumber,
  moderatorId,
  at,
}) {
  if (!isPrivateRedactionStoreConfigured()) return { stored: false };
  const path = fileForIssue(issueNumber);
  const { data: existing, sha } = await readPrivateFile(path);
  if (!existing) return { stored: false };
  const event = { action: "unredact", moderator: moderatorId, at };
  const next = {
    ...existing,
    history: Array.isArray(existing.history)
      ? [...existing.history, event]
      : [event],
  };
  await writePrivateFile(
    path,
    next,
    sha,
    `Un-redact reason for issue #${issueNumber}`
  );
  return { stored: true };
}
