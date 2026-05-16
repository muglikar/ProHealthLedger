function normalizeDisplayWhitespace(s) {
  return String(s || "")
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean common LinkedIn professional decorators (prefixes like Er, Dr and suffixes like IITB, MBA).
 */
export function cleanLinkedInNameDecorators(name) {
  if (!name || typeof name !== "string") return "";
  
  let cleaned = name.trim();
  
  // 1. Remove common professional prefixes (case-insensitive, followed by space or dot)
  // Er: Engineer, Ar: Architect, Adv: Advocate, Prof: Professor, etc.
  const prefixRegex = /^\s*(?:Er|Ar|Dr|Adv|Prof|Vaidya|Engr|Capt|Major|Col|Gen|Ms|Mr|Mrs)\.?\s+/i;
  cleaned = cleaned.replace(prefixRegex, "");
  
  // 2. Remove common institutional/degree suffixes (case-insensitive, at the end)
  // IITB, IIM, BITS, NIT, MBA, PhD, CA, CS, etc.
  // We look for these either in brackets or as standalone tokens at the end.
  const suffixRegex = /\s*[\(\[]?(?:IIT[A-Z]?|IIM[A-Z]?|BITS|NIT[A-Z]?|IIIT[A-Z]?|VIT|SRM|MBA|PHD|CA|CS|CFA|FRM|BE|BTECH|MTECH|MBBS|MD|MS)[\)\]]?\s*$/i;
  
  // Loop a couple of times to catch multiple suffixes (e.g. "Name IITB MBA")
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(suffixRegex, "");
  } while (cleaned !== prev);

  return cleaned.trim();
}

/**
 * Standalone token that looks like a LinkedIn-style opaque id (e.g. A150839a), not a normal name word.
 */
function isOpaqueAffixToken(t) {
  if (!t || typeof t !== "string") return false;
  const x = t.trim();
  if (x.length < 5 || x.length > 36) return false;
  if (/^[A-Za-z]\d{3,}[A-Za-z0-9]*$/i.test(x)) return true;
  if (/^[A-Fa-f0-9]{8,}$/i.test(x) && /[a-f]/i.test(x) && /\d/.test(x)) return true;
  return false;
}

function stripOpaqueAffixTokensFromParts(parts) {
  const out = [...parts];
  while (out.length > 1 && isOpaqueAffixToken(out[out.length - 1])) {
    out.pop();
  }
  while (out.length > 1 && isOpaqueAffixToken(out[0])) {
    out.shift();
  }
  return out;
}

/** Remove trailing opaque segment glued with hyphen/underscore (e.g. "...-A150839a"). */
function stripOpaqueSuffixFromHyphenated(s) {
  let t = s;
  const re = /(?:^|[\s_-])([A-Za-z]\d{3,}[A-Za-z0-9]*)$/i;
  for (let guard = 0; guard < 6; guard++) {
    const m = t.match(re);
    if (!m || m.index === undefined) break;
    t = t.slice(0, m.index).replace(/[\s_-]+$/u, "").trim();
  }
  return t;
}

function sanitizeProfessionalDisplayString(raw) {
  let s = normalizeDisplayWhitespace(String(raw || ""));
  if (!s) return "";
  s = cleanLinkedInNameDecorators(s);
  s = stripOpaqueSuffixFromHyphenated(s);
  let parts = s.split(" ").filter(Boolean);
  parts = stripOpaqueAffixTokensFromParts(parts);
  const joined = parts.join(" ").trim();
  if (!joined) return "";
  if (parts.length === 1 && isOpaqueAffixToken(parts[0])) return "";
  return joined;
}

/**
 * @param {string} slug - LinkedIn /in/ handle segment
 * @param {string} [publicName] - Optional curated display name from profile JSON
 */
export function formatProfessionalDisplayName(slug, publicName) {
  const curatedRaw =
    typeof publicName === "string" && publicName.trim()
      ? publicName.trim()
      : "";
  const curated = curatedRaw ? sanitizeProfessionalDisplayString(curatedRaw) : "";
  if (curated) return curated;

  if (!slug || typeof slug !== "string") return "";

  let s = slug.trim().toLowerCase();
  s = s.replace(/(-\d[\da-z]*)+$/u, "");
  const words = s.split("-").filter(Boolean);
  if (words.length === 0) return "";
  const titled = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return sanitizeProfessionalDisplayString(titled);
}
