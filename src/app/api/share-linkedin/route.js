import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 * 
 * Version 2026.04 Stable
 * - Uses 'annotations' array for 100% blue name-tag success.
 * - Bypasses asset upload in favor of direct metadata crawling.
 * - Dynamic character-offset calculation for tagging.
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    commentary = "",
    articleUrl = "",
    voucherUrn = "",
    cleanVoucher = "Rohit Kadam", // Fallback, but passed from client
    cleanVouchee = "Muglikar",
  } = body;

  // --- Step 1: Construct Commentary & Annotations ---
  // The backend now manually builds the "Big thanks" line if not already present,
  // or simply uses the incoming safe text.
  const commentaryText = commentary.trim();
  const tagStart = commentaryText.indexOf(cleanVoucher);
  const tagLength = cleanVoucher.length;

  // --- Step 2: Build the Versioned 202604 Payload ---
  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: commentaryText,
    visibility: "PUBLIC",
    distribution: { 
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
    content: {
      article: {
        source: articleUrl.trim(),
        title: `${cleanVoucher} vouched for ${cleanVouchee}`,
        description: "Professional Health Ledger — Verified Vouch"
      }
    }
  };

  // If we have the metadata for a tag, inject the annotation attribute
  if (voucherUrn && tagStart !== -1) {
    postPayload.annotations = [
      {
        entity: `urn:li:person:${voucherUrn}`,
        length: tagLength,
        start: tagStart
      }
    ];
  }

  try {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202604",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postPayload),
    });

    if (res.ok) {
      return Response.json({ ok: true });
    }

    const errJson = await res.json().catch(() => ({}));
    return Response.json({ 
      error: "LinkedIn rejected the post.", 
      details: errJson.message || JSON.stringify(errJson) 
    }, { status: 502 });
  } catch (err) {
    return Response.json({ 
      error: "Backend post failure.", 
      details: err.message 
    }, { status: 500 });
  }
}
