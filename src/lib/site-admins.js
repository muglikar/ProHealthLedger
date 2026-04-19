import {
  REPO_MAINTAINER_LINKEDIN_CANONICAL,
  isRepoMaintainerUserId,
} from "@/lib/repo-owner-session";

const DEFAULT_ADMIN = "github:muglikar";

function parseList(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Normalize provider ids for comparison (GitHub login and LinkedIn sub are case-insensitive in practice). */
export function normalizeUserIdForAdmin(id) {
  if (!id || typeof id !== "string") return "";
  const i = id.indexOf(":");
  if (i <= 0) return id.trim().toLowerCase();
  const p = id.slice(0, i).toLowerCase();
  const rest = id.slice(i + 1).trim().toLowerCase();
  return `${p}:${rest}`;
}

/**
 * LinkedIn `sub` / account id may be a short token (ledger) or `urn:li:person:TOKEN`.
 * Normalize to `linkedin:<token>` so session ids match public `data/users` entries.
 */
export function canonicalUserIdForAdmin(userId) {
  const norm = normalizeUserIdForAdmin(userId);
  if (!norm.startsWith("linkedin:")) return norm;
  const rest = norm.slice("linkedin:".length);
  const urn = /^urn:li:person:(.+)$/.exec(rest);
  if (urn && urn[1]) {
    return normalizeUserIdForAdmin(`linkedin:${urn[1].trim()}`);
  }
  return norm;
}

export function normalizeAdminEmail(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function collectSiteAdminUserIds() {
  const set = new Set();
  set.add(canonicalUserIdForAdmin(DEFAULT_ADMIN));
  if (process.env.DISABLE_BUILTIN_LINKEDIN_ADMIN !== "1") {
    set.add(REPO_MAINTAINER_LINKEDIN_CANONICAL);
  }
  const extraBuiltin = process.env.BUILTIN_LINKEDIN_ADMIN_SUB?.trim();
  if (extraBuiltin) {
    set.add(canonicalUserIdForAdmin(`linkedin:${extraBuiltin}`));
  }
  for (const id of parseList(process.env.SITE_ADMIN_USER_IDS)) {
    set.add(canonicalUserIdForAdmin(id));
  }
  for (const sub of parseList(process.env.LINKEDIN_ADMIN_SUBS)) {
    const raw = sub.includes(":") ? sub : `linkedin:${sub}`;
    set.add(canonicalUserIdForAdmin(raw));
  }
  return set;
}

function collectAdminEmails() {
  const set = new Set();
  for (const raw of parseList(process.env.SITE_ADMIN_EMAILS)) {
    const e = normalizeAdminEmail(raw);
    if (e) set.add(e);
  }
  for (const raw of parseList(process.env.LINKEDIN_ADMIN_EMAILS)) {
    const e = normalizeAdminEmail(raw);
    if (e) set.add(e);
  }
  return set;
}

/** Env segment for https://www.linkedin.com/in/{slug}/ — not substring matching on arbitrary text. */
function normalizeLinkedinInSlug(raw) {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();
  const m = s.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (m) return m[1].replace(/\/$/, "").toLowerCase();
  const t = s.replace(/^\/+|\/+$/g, "");
  return t ? t.split(/[/\s]+/).pop().toLowerCase() : "";
}

function collectLinkedinAdminInSlugs() {
  const set = new Set();
  for (const raw of parseList(process.env.LINKEDIN_ADMIN_IN_SLUGS)) {
    const slug = normalizeLinkedinInSlug(raw);
    if (slug) set.add(slug);
  }
  return set;
}

/**
 * Admin for LinkedIn: exact OIDC `sub`, exact `/in/` slug (when token carries vanity from API),
 * or exact email allowlist — not by display name or fuzzy profile matching.
 *
 * @param {{ userId?: string, email?: string, linkedinVanity?: string }} args
 */
export function isSiteAdminForSession({ userId, email, linkedinVanity } = {}) {
  const uid = userId ? canonicalUserIdForAdmin(userId) : "";
  if (uid && collectSiteAdminUserIds().has(uid)) {
    return true;
  }
  const em = normalizeAdminEmail(email);
  if (em && collectAdminEmails().has(em)) return true;
  const v =
    typeof linkedinVanity === "string" ? linkedinVanity.trim().toLowerCase() : "";
  const slugAllow = collectLinkedinAdminInSlugs();
  /** OAuth-verified vanity from LinkedIn /v2/me; `muglikar` is globally unique on LinkedIn. */
  if (
    userId &&
    userId.toLowerCase().startsWith("linkedin:") &&
    v &&
    (slugAllow.has(v) || v === "muglikar")
  ) {
    return true;
  }
  return false;
}

/** Use with getServerSession / useSession result (reads user.email, token-backed authEmail). */
export function isSessionSiteAdmin(session) {
  if (!session?.userId) return false;
  if (isRepoMaintainerUserId(session.userId)) return true;
  const email =
    (session.user &&
      typeof session.user.email === "string" &&
      session.user.email) ||
    (typeof session.authEmail === "string" && session.authEmail) ||
    "";
  return isSiteAdminForSession({
    userId: session.userId,
    email,
    linkedinVanity: session.linkedinVanity,
  });
}
