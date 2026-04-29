import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSessionSiteAdmin } from "@/lib/site-admins";
import {
  createRemovalRequest,
  isRemovalStoreConfigured,
  listRemovalRequests,
} from "@/lib/removal-requests";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";

export async function POST(req) {
  const limit = envLimit("RL_REMOVAL_REQUEST_LIMIT", 5);
  const windowMs = envLimit("RL_REMOVAL_REQUEST_WINDOW_MS", 60 * 60 * 1000);
  const rl = takeRateLimit({
    key: `removal-request:${getClientIp(req)}`,
    limit,
    windowMs,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many removal requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  if (!isRemovalStoreConfigured()) {
    return Response.json(
      {
        error:
          "Removal request intake is temporarily unavailable. Please contact support directly.",
      },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { linkedinUrl, email, verification, details } = body || {};
  try {
    const out = await createRemovalRequest({
      linkedinUrl,
      email,
      verification,
      details,
      ip: getClientIp(req),
      ua: req.headers.get("user-agent") || "",
    });
    return Response.json({
      success: true,
      requestId: out.id,
      submittedAt: out.submittedAt,
      message:
        "Your request was received privately. We will review and contact you.",
    });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Failed to submit removal request." },
      { status: 400 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isRemovalStoreConfigured()) {
    return Response.json(
      { configured: false, requests: [] },
      { status: 200 }
    );
  }
  try {
    const requests = await listRemovalRequests();
    return Response.json({ configured: true, requests });
  } catch {
    return Response.json(
      { error: "Failed to read removal requests." },
      { status: 500 }
    );
  }
}

