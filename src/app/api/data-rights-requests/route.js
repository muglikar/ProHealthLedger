import {
  createDataRightsRequest,
  isDataRightsStoreConfigured,
} from "@/lib/data-rights-requests";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";

export async function POST(req) {
  const limit = envLimit("RL_DATA_RIGHTS_REQUEST_LIMIT", 5);
  const windowMs = envLimit("RL_DATA_RIGHTS_REQUEST_WINDOW_MS", 60 * 60 * 1000);
  const rl = takeRateLimit({
    key: `data-rights-request:${getClientIp(req)}`,
    limit,
    windowMs,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many data-rights requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }
  if (!isDataRightsStoreConfigured()) {
    return Response.json(
      { error: "Data-rights intake is temporarily unavailable." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const out = await createDataRightsRequest({
      name: body?.name,
      email: body?.email,
      jurisdiction: body?.jurisdiction,
      requestType: body?.requestType,
      details: body?.details,
      ip: getClientIp(req),
      ua: req.headers.get("user-agent") || "",
    });
    return Response.json({
      success: true,
      requestId: out.id,
      submittedAt: out.submittedAt,
    });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Failed to submit request." },
      { status: 400 }
    );
  }
}

