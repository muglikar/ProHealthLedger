/**
 * LinkedIn sometimes appends an opaque token to display names (e.g. "Jane Doe A150839a").
 * Strip a trailing space-separated token that looks like that suffix (letter + 4+ digits + optional alphanum).
 */
function stripTrailingOpaqueNameSuffix(displayName) {
  const trimmed = String(displayName || "").trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return trimmed;
  const last = parts[parts.length - 1];
  if (/^[A-Za-z]\d{4,}[A-Za-z0-9]*$/.test(last)) {
    return parts.slice(0, -1).join(" ");
  }
  return trimmed;
}

/**
 * @param {string} slug - LinkedIn /in/ handle segment
 * @param {string} [publicName] - Optional curated display name from profile JSON
 */
export function formatProfessionalDisplayName(slug, publicName) {
  const curated =
    typeof publicName === "string" && publicName.trim()
      ? publicName.trim()
      : "";
  if (curated) return stripTrailingOpaqueNameSuffix(curated);

  if (!slug || typeof slug !== "string") return "";

  let s = slug.trim().toLowerCase();
  s = s.replace(/(-\d[\da-z]*)+$/u, "");
  const words = s.split("-").filter(Boolean);
  if (words.length === 0) return "";
  const titled = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return stripTrailingOpaqueNameSuffix(titled);
}
