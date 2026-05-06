import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile } from "@/lib/github";
import { takeRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json(
      { error: "You must be signed in to submit feedback." },
      { status: 401 }
    );
  }

  const rl = takeRateLimit({
    key: `feedback:${session.userId}:${getClientIp(req)}`,
    limit: 3,
    windowMs: 60 * 60 * 1000, // 3 per hour
  });

  if (!rl.allowed) {
    return Response.json(
      { error: "Too many feedback submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { type, message, recommend } = await req.json();

    if (!type || !message) {
      return Response.json(
        { error: "Type and message are required." },
        { status: 400 }
      );
    }

    const feedbackPath = "data/feedback.json";
    const { data: feedbackList, sha } = await readDataFile(feedbackPath).catch(() => ({ data: [], sha: null }));

    const newEntry = {
      user_id: session.userId,
      display_name: session.displayName || session.userId,
      type,
      message: message.slice(0, 1000),
      recommend: Boolean(recommend),
      timestamp: new Date().toISOString(),
    };

    feedbackList.push(newEntry);

    await writeDataFile(
      feedbackPath,
      feedbackList,
      sha,
      `Add feedback from ${session.userId} [skip ci]`
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return Response.json(
      { error: "Failed to save feedback." },
      { status: 500 }
    );
  }
}
