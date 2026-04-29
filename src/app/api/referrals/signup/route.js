import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordSignup } from "@/lib/referrals";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  const signupLimit = envLimit("RL_REFERRAL_SIGNUP_LIMIT", 15);
  const signupWindowMs = envLimit(
    "RL_REFERRAL_SIGNUP_WINDOW_MS",
    60 * 60 * 1000
  );
  const signupRl = takeRateLimit({
    key: `referral-signup:${session.userId}:${getClientIp(req)}`,
    limit: signupLimit,
    windowMs: signupWindowMs,
  });
  if (!signupRl.allowed) {
    return Response.json(
      { error: "Too many referral signup events. Please try again later." },
      { status: 429, headers: rateLimitHeaders(signupRl) }
    );
  }

  const { refCode } = await req.json();

  if (!refCode || typeof refCode !== "string") {
    return Response.json(
      { error: "refCode is required." },
      { status: 400 }
    );
  }

  try {
    const referral = await recordSignup(refCode, session.userId);
    if (!referral) {
      return Response.json(
        { error: "Unknown referral code." },
        { status: 404 }
      );
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error("Failed to record signup:", err);
    return Response.json(
      { error: "Failed to record signup." },
      { status: 500 }
    );
  }
}
