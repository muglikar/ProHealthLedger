const PII_PATTERNS = [
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, // SSN-like
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, // phone
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // email
  /\b\d{1,5}\s+[A-Za-z0-9.\s]{2,}\s(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Boulevard|Blvd|Drive|Dr)\b/gi, // address-like
];

const HATE_PATTERNS = [
  /\b(?:kill|lynch|eliminate)\s+(?:all\s+)?(?:\w+\s+)?(?:people|group|community)\b/gi,
  /\b(?:nazi|genocide)\b/gi,
];

function collectMatches(text, patterns, type) {
  const hits = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    hits.push({
      type,
      pattern: re.source,
      count: m.length,
      examples: m.slice(0, 3),
    });
  }
  return hits;
}

async function llmModeration(text) {
  const key = process.env.OPENAI_API_KEY || "";
  if (!key || process.env.ENABLE_LLM_MODERATION !== "1") {
    return { enabled: false, flagged: false, categories: [] };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODERATION_MODEL || "omni-moderation-latest",
        input: text,
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      return { enabled: true, flagged: false, categories: [], error: "api-fail" };
    }
    const data = await res.json();
    const r = data?.results?.[0];
    const categories = Object.entries(r?.categories || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
    return {
      enabled: true,
      flagged: Boolean(r?.flagged),
      categories,
    };
  } catch {
    return { enabled: true, flagged: false, categories: [], error: "timeout-or-network" };
  }
}

/**
 * Returns policy hints used before publishing comments.
 */
export async function analyzeReasonSafety(reason) {
  const text = String(reason || "").trim();
  if (!text) return { hasRisk: false, blockApprove: false, hits: [], llm: null };

  const piiHits = collectMatches(text, PII_PATTERNS, "pii");
  const hateHits = collectMatches(text, HATE_PATTERNS, "hate");
  const llm = await llmModeration(text);

  const hasRisk = piiHits.length > 0 || hateHits.length > 0 || Boolean(llm?.flagged);
  const blockApprove =
    piiHits.length > 0 || hateHits.length > 0 || (llm?.categories || []).includes("violence");

  return {
    hasRisk,
    blockApprove,
    hits: [...piiHits, ...hateHits],
    llm,
  };
}

