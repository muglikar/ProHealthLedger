/**
 * Lightweight client-side telemetry helper.
 * Emits events to /api/telemetry for processing and storage.
 */
export async function trackEvent(name, metadata = {}) {
  try {
    // Only track in production or if explicitly enabled to avoid polluting logs in dev
    // For this "scientific" project, we'll track everywhere for now.
    
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        metadata,
        url: typeof window !== "undefined" ? window.location.href : null,
        referrer: typeof document !== "undefined" ? document.referrer : null,
      }),
    });
  } catch (err) {
    // Fail silently to avoid interrupting user experience
    console.warn("Telemetry failed:", err);
  }
}

/**
 * Track an error event.
 */
export function trackError(error, source = "client") {
  trackEvent("error", {
    message: error.message || String(error),
    stack: error.stack || null,
    source,
  });
}

/**
 * Track search queries with their result counts.
 */
export function trackSearch(query, resultCount) {
  if (!query || !query.trim()) return;
  const q = query.trim();
  if (resultCount === 0) {
    trackEvent("search_zero_results", { query: q });
  } else if (resultCount > 0 && resultCount <= 3) {
    trackEvent("search_low_results", { query: q, results: resultCount });
  } else {
    trackEvent("profile_search", { query: q, results: resultCount });
  }
}

