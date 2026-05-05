import { readDataFile, writeDataFile } from "@/lib/github";

const EVENTS_PATH = "data/telemetry/events.json";

/**
 * Server-side telemetry helper.
 * Appends events directly to the data file.
 */
export async function logServerEvent(name, metadata = {}, context = {}) {
  try {
    const timestamp = new Date().toISOString();
    const event = {
      timestamp,
      name,
      ...context,
      metadata,
    };

    const { data: events, sha } = await readDataFile(EVENTS_PATH).catch(() => ({ data: [], sha: null }));
    const updatedEvents = [...(Array.isArray(events) ? events : []), event].slice(-5000);

    await writeDataFile(
      EVENTS_PATH,
      updatedEvents,
      sha,
      `telemetry: record server event ${name}`
    );
  } catch (err) {
    console.warn("Server telemetry failed:", err);
  }
}
