import { recordClick } from "@/lib/referrals";

export async function POST(req) {
  const { refCode } = await req.json();

  if (!refCode || typeof refCode !== "string") {
    return Response.json(
      { error: "refCode is required." },
      { status: 400 }
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
