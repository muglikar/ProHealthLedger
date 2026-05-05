import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile } from "@/lib/github";
import { getClientIp } from "@/lib/rate-limit";

const EVENTS_PATH = "data/telemetry/events.json";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { name, metadata, url, referrer } = body;

    if (!name) {
      return Response.json({ error: "Event name is required" }, { status: 400 });
    }

    // Capture identity: User ID if signed in, otherwise Client IP
    const userId = session?.userId || null;
    const ip = getClientIp(req);
    const timestamp = new Date().toISOString();

    const event = {
      timestamp,
      name,
      user_id: userId,
      ip: userId ? null : ip, // Only store IP for un-authenticated users as requested
      url,
      referrer,
      metadata,
    };

    // Append to events log
    // Note: In high traffic, we would buffer these, but for "scientific" Git-based data,
    // we'll append directly.
    const { data: events, sha } = await readDataFile(EVENTS_PATH).catch(() => ({ data: [], sha: null }));
    
    // Simple rotation: Keep only the last 5000 events to prevent file size bloat
    const updatedEvents = [...(Array.isArray(events) ? events : []), event].slice(-5000);

    await writeDataFile(
      EVENTS_PATH,
      updatedEvents,
      sha,
      `telemetry: record event ${name}${userId ? ` for ${userId}` : ` from IP ${ip}`}`
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("Telemetry API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
