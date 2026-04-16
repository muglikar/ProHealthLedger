/**
 * @param {string} slug - LinkedIn /in/ handle segment
 * @param {string} [publicName] - Optional curated display name from profile JSON
 */
export function formatProfessionalDisplayName(slug, publicName) {
  const curated =
    typeof publicName === "string" && publicName.trim()
      ? publicName.trim()
      : "";
  if (curated) return curated;

  if (!slug || typeof slug !== "string") return "";

  let s = slug.trim().toLowerCase();
  s = s.replace(/(-\d[\da-z]*)+$/u, "");
  const words = s.split("-").filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
