import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 * 
 * Migration to v2/ugcPosts protocol.
 * - Guaranteed Support for bracketed @[Name](urn:li:person:...) markdown.
 * - Optimized for ARTICLE shares with automatic crawler triggers.
 * - Standard V2 headers (no LinkedIn-Version).
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    articleUrl = "",
    voucherUrn = "",
    cleanVoucher = "",
    cleanVouchee = "",
  } = body;

  const commentaryText = `Big thanks to @[${cleanVoucher}](urn:li:person:${voucherUrn}) and others who have already staked their reputation to vouch for my work.\n\nYour career's reputation belongs to you — not to your previous company's HR department.\n\nCheck out my public Professional Health Ledger:\n${articleUrl}\n\n#ProfessionalIntegrity #WorkplaceCulture #Transparency`;

  const payload = {
    author: `urn:li:person:${linkedinSub}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: commentaryText
        },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            description: {
              text: "Professional Health Ledger — Verified Vouch"
            },
            originalUrl: articleUrl.trim(),
            title: {
              text: `${cleanVoucher} vouched for ${cleanVouchee}`
            }
          }
        ]
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
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
      error: "Backend failure.", 
      details: err.message 
    }, { status: 500 });
  }
}
