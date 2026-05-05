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
