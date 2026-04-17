/**
 * Normalize a LinkedIn /in/ URL for sharing (HTTPS, www host, lowercase slug).
 * @param {string} [url]
 * @returns {string} empty string if not a valid /in/ URL
 */
export function normalizeRevieweeLinkedInUrl(url) {
  if (!url || typeof url !== "string") return "";
  const match = url.trim().match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (!match) return "";
  return `https://www.linkedin.com/in/${match[1].toLowerCase()}`;
}
