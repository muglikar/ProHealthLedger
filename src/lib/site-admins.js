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

export function normalizeAdminEmail(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function collectSiteAdminUserIds() {
  const set = new Set();
  set.add(normalizeUserIdForAdmin(DEFAULT_ADMIN));
  for (const id of parseList(process.env.SITE_ADMIN_USER_IDS)) {
    set.add(normalizeUserIdForAdmin(id));
  }
  for (const sub of parseList(process.env.LINKEDIN_ADMIN_SUBS)) {
    set.add(normalizeUserIdForAdmin(`linkedin:${sub}`));
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

/** LinkedIn OIDC: same browser login as the repo owner without Vercel env. Word-boundary avoids substring false positives. */
function isTrustedLinkedInMuglikarIdentity({ userId, email, displayName }) {
  if (process.env.DISABLE_MUGLIKAR_TRUSTED_LINKEDIN_ADMIN === "1") {
    return false;
  }
  if (!userId || !userId.toLowerCase().startsWith("linkedin:")) return false;
  if (typeof displayName === "string" && /\bmuglikar\b/i.test(displayName)) {
    return true;
  }
  const em = normalizeAdminEmail(email);
  if (em && /\bmuglikar\b/i.test(em)) return true;
  return false;
}

/**
 * @param {{ userId?: string, email?: string, displayName?: string }} args
 */
export function isSiteAdminForSession({
  userId,
  email,
  displayName,
} = {}) {
  if (userId && collectSiteAdminUserIds().has(normalizeUserIdForAdmin(userId))) {
    return true;
  }
  const em = normalizeAdminEmail(email);
  if (em && collectAdminEmails().has(em)) return true;
  if (isTrustedLinkedInMuglikarIdentity({ userId, email, displayName })) {
    return true;
  }
  return false;
}

/** Use with getServerSession / useSession result (reads user.email, token-backed authEmail). */
export function isSessionSiteAdmin(session) {
  if (!session?.userId) return false;
  const email =
    (session.user &&
      typeof session.user.email === "string" &&
      session.user.email) ||
    (typeof session.authEmail === "string" && session.authEmail) ||
    "";
  const displayName =
    (typeof session.displayName === "string" && session.displayName) ||
    (session.user && typeof session.user.name === "string" && session.user.name) ||
    "";
  return isSiteAdminForSession({ userId: session.userId, email, displayName });
}
