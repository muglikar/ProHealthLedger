import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createReferral,
  getReferralsByUser,
  getAllReferrals,
} from "@/lib/referrals";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  const createLimit = envLimit("RL_REFERRAL_CREATE_LIMIT", 10);
  const createWindowMs = envLimit("RL_REFERRAL_CREATE_WINDOW_MS", 60 * 60 * 1000);
  const createRl = takeRateLimit({
    key: `referral-create:${session.userId}:${getClientIp(req)}`,
    limit: createLimit,
    windowMs: createWindowMs,
  });
  if (!createRl.allowed) {
    return Response.json(
      { error: "Too many referral requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(createRl) }
    );
  }

  const { profileSlug, profileName } = await req.json();

  if (!profileSlug) {
    return Response.json(
      { error: "profileSlug is required." },
      { status: 400 }
    );
  }

  const displayName =
    formatProfessionalDisplayName(profileSlug, profileName) ||
    profileSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    const referral = await createReferral(
      session.userId,
      session.displayName || session.userId,
      profileSlug,
      displayName
    );

    const shareUrl = `${SITE_URL}/?ref=${referral.ref_code}`;

    const linkedinText = `Hey, I just vouched for ${displayName} on Professional Health Ledger — a free, transparent directory of honest professional experiences.\n\nCheck it out and share your experience too!\n\n${shareUrl}\n\n#ProHealthLedger #OpenSource #ProfessionalReputation`;

    const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

    return Response.json({
      refCode: referral.ref_code,
      shareUrl,
      linkedinText,
      linkedinShareUrl,
    });
  } catch (err) {
    console.error("Failed to create referral:", err);
    return Response.json(
      { error: "Failed to create referral link. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const allMode = searchParams.get("all") === "true";

  try {
    if (allMode) {
      if (!session.siteAdmin) {
        return Response.json({ error: "Access denied." }, { status: 403 });
      }
      const all = await getAllReferrals();
      return Response.json(all);
    }
    const userReferrals = await getReferralsByUser(session.userId);

    // Identity tracking: Map signup IDs to names
    const { data: users } = await readDataFile("data/users/_index.json").catch(() => ({ data: [] }));
    const userMap = (Array.isArray(users) ? users : []).reduce((acc, u) => {
      acc[u.user_id] = u.display_name || u.github_username || u.user_id;
      return acc;
    }, {});

    const enrichedReferrals = userReferrals.map(r => ({
      ...r,
      signup_names: (r.signups || []).map(id => userMap[id] || id)
    }));

    // If no referrals found, it might be an ID mismatch. 
    // We'll return the current ID in metadata (only to the owner) to help debug.
    if (enrichedReferrals.length === 0) {
       console.log(`Referral check: No data found for ${session.userId}`);
    }

    return Response.json(enrichedReferrals);
  } catch (err) {
    console.error("Failed to fetch referrals:", err);
    return Response.json(
      { error: "Failed to load referral stats." },
      { status: 500 }
    );
  }
}
