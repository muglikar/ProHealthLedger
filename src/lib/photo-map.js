/**
 * Builds a unified photo lookup map from all available sources:
 * - profiles/_index.json  → profile_photo_url (professionals)
 * - users/_index.json     → image (contributors/voters)
 *
 * Returns { [key]: imageUrl } where key can be:
 *   - user_id (e.g. "muglikar", "linkedin:XYZ")
 *   - stripped user_id (e.g. "XYZ" without "linkedin:" prefix)
 *   - display_name (lowercased)
 *   - profile slug (e.g. "piyush-bhujbal")
 *   - linkedin vanity slug extracted from linkedin_url
 *
 * This means any page can look up a photo by any identifier it has.
 */
export function buildUnifiedPhotoMap(profiles, users) {
  const map = {};

  // Index professional profile photos
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      if (!p || !p.profile_photo_url) continue;
      const url = p.profile_photo_url;

      if (p.slug) map[p.slug] = url;
      if (p.public_name) map[p.public_name.trim().toLowerCase()] = url;
      if (p.linkedin_url) {
        const vanity = p.linkedin_url.match(
          /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
        );
        if (vanity) map[vanity[1].toLowerCase()] = url;
      }
    }
  }

  // Index contributor/voter photos (these take priority for the person's own avatar)
  if (Array.isArray(users)) {
    for (const u of users) {
      if (!u || !u.image) continue;
      const url = u.image;

      if (u.user_id) {
        map[u.user_id] = url;
        const stripped = u.user_id
          .replace("github:", "")
          .replace("linkedin:", "");
        map[stripped] = url;
      }
      if (u.display_name) {
        map[u.display_name.trim().toLowerCase()] = url;
      }
      if (u.linkedin_url) {
        const vanity = u.linkedin_url.match(
          /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
        );
        if (vanity) map[vanity[1].toLowerCase()] = url;
      }
    }
  }

  return map;
}

/**
 * Look up a photo from the unified map using any available identifier.
 */
export function lookupPhoto(map, { userId, displayName, slug, linkedinUrl }) {
  if (!map) return null;

  if (userId) {
    if (map[userId]) return map[userId];
    const stripped = userId.replace("github:", "").replace("linkedin:", "");
    if (map[stripped]) return map[stripped];
  }
  if (displayName) {
    const key = displayName.trim().toLowerCase();
    if (map[key]) return map[key];
  }
  if (slug) {
    if (map[slug]) return map[slug];
  }
  if (linkedinUrl) {
    const vanity = linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (vanity && map[vanity[1].toLowerCase()]) {
      return map[vanity[1].toLowerCase()];
    }
  }
  return null;
}
