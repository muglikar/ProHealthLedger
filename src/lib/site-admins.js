const DEFAULT_ADMIN = "github:muglikar";

function parseList(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Full user ids as stored in session, e.g. github:login, linkedin:sub */
export function collectSiteAdminUserIds() {
  const set = new Set([DEFAULT_ADMIN]);
  for (const id of parseList(process.env.SITE_ADMIN_USER_IDS)) {
    set.add(id);
  }
  for (const sub of parseList(process.env.LINKEDIN_ADMIN_SUBS)) {
    set.add(`linkedin:${sub}`);
  }
  return set;
}

export function isSiteAdmin(userId) {
  if (!userId) return false;
  return collectSiteAdminUserIds().has(userId);
}
