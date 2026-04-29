import { recordClick } from "@/lib/referrals";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";

export async function POST(req) {
  const { refCode } = await req.json();

  if (!refCode || typeof refCode !== "string") {
    return Response.json(
      { error: "refCode is required." },
      { status: 400 }
    );
  }

  const clickLimit = envLimit("RL_REFERRAL_CLICK_LIMIT", 60);
  const clickWindowMs = envLimit("RL_REFERRAL_CLICK_WINDOW_MS", 60 * 60 * 1000);
  const clickRl = takeRateLimit({
    key: `referral-click:${getClientIp(req)}:${refCode}`,
    limit: clickLimit,
    windowMs: clickWindowMs,
  });
  if (!clickRl.allowed) {
    return Response.json(
      { error: "Too many referral click events. Please try again later." },
      { status: 429, headers: rateLimitHeaders(clickRl) }
    );
  }

  try {
    const referral = await recordClick(refCode);
    if (!referral) {
      return Response.json(
        { error: "Unknown referral code." },
        { status: 404 }
      );
    }
    return Response.json({ success: true, clicks: referral.clicks });
  } catch (err) {
    console.error("Failed to record click:", err);
    return Response.json(
      { error: "Failed to record click." },
      { status: 500 }
    );
  }
}
