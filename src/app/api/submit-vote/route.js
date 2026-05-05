import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile, createIssue } from "@/lib/github";
import { canSubmitNegativeVote } from "@/lib/karma";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import { isFlagBlockedForLinkedinUrl } from "@/lib/protected-profiles";
import { verifyLinkedinSlug } from "@/lib/linkedin-slug-verify";
import { analyzeReasonSafety } from "@/lib/content-safety";
import { createProfileLinkChangeRequest } from "@/lib/profile-link-change-requests";
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
      { error: "You must be signed in to vote." },
      { status: 401 }
    );
  }

  const voteLimit = envLimit("RL_SUBMIT_VOTE_LIMIT", 5);
  const voteWindowMs = envLimit("RL_SUBMIT_VOTE_WINDOW_MS", 10 * 60 * 1000);
  const voteRl = takeRateLimit({
    key: `submit-vote:${session.userId}:${getClientIp(req)}`,
    limit: voteLimit,
    windowMs: voteWindowMs,
  });
  if (!voteRl.allowed) {
    return Response.json(
      { error: "Too many vote submissions. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(voteRl) }
    );
  }

  const body = await req.json();
  const { linkedinUrl, vote, reason } = body;
  const userId = session.userId;
  const displayName = session.displayName || userId;

  if (!linkedinUrl || !vote) {
    return Response.json(
      { error: "LinkedIn URL and vote are required." },
      { status: 400 }
    );
  }

  if (!["yes", "no"].includes(vote)) {
    return Response.json(
      { error: "Vote must be 'yes' or 'no'." },
      { status: 400 }
    );
  }

  const initialSlug = extractSlug(linkedinUrl);
  if (!initialSlug) {
    return Response.json(
      {
        error:
          "That doesn't look like a valid LinkedIn URL. Use a link like https://www.linkedin.com/in/jane-doe",
      },
      { status: 400 }
    );
  }

  // Profiles are read first so we can skip LinkedIn verification for slugs
  // already validated on a previous submission (policy D).
  const { data: profiles, sha: profilesSha } = await readDataFile(
    "data/profiles/_index.json"
  );

  /**
   * Kill-switch for policy C ("block on persistent ambiguous").
   * - Default (unset, "1", "true"): block ambiguous => safer, recommended.
   * - "0" / "false": allow ambiguous => use this if LinkedIn is rate-limiting
   *   our egress IP heavily and legit submissions are getting blocked. Pair
   *   with rate limiting (item 1.6) before flipping permanently.
   */
  const blockAmbiguousSlugs = !["0", "false"].includes(
    String(process.env.SLUG_VERIFY_BLOCK_AMBIGUOUS || "").trim().toLowerCase()
  );

  let slug = initialSlug;
  const alreadyKnownProfile = profiles.find((p) => p.slug === slug);
  if (!alreadyKnownProfile) {
    const verifyResult = await verifyLinkedinSlug(slug);
    const verdict = verifyResult.verdict;
    const shouldBlock =
      verdict === "missing" || (blockAmbiguousSlugs && verdict === "ambiguous");
    if (shouldBlock) {
      return Response.json(
        {
          error:
            "That LinkedIn URL doesn't resolve. Please double-check the link.",
        },
        { status: 400 }
      );
    }
    if (verifyResult.canonicalSlug && verifyResult.canonicalSlug !== slug) {
      // LinkedIn redirected `/in/<old>` → `/in/<new>` (policy J): collapse
      // votes onto the canonical slug so the same person isn't tracked twice.
      slug = verifyResult.canonicalSlug;
    }
  }

  const linkedinUrlCanonical = canonicalLinkedinUrl(slug);
  const profileForTitle = profiles.find((p) => p.slug === slug);

  /**
   * Anti-impersonation guard:
   * Once a profile slug is on the ledger, its LinkedIn URL is immutable via
   * public vote submissions. This prevents users from attempting to "move"
   * an existing ledger identity to a different LinkedIn target.
   */
  if (
    profileForTitle &&
    typeof profileForTitle.linkedin_url === "string" &&
    profileForTitle.linkedin_url &&
    canonicalLinkedinUrl(extractSlug(profileForTitle.linkedin_url) || slug) !==
    linkedinUrlCanonical
  ) {
    const { request } = await createProfileLinkChangeRequest({
      profileSlug: slug,
      currentLinkedinUrl: profileForTitle.linkedin_url,
      proposedLinkedinUrl: linkedinUrlCanonical,
      requestedBy: userId,
      requestedByDisplayName: displayName,
    });
    return Response.json(
      {
        error:
          "This profile link change requires moderator approval and has been added to the admin review queue.",
        requestId: request.id,
      },
      { status: 409 }
    );
  }

  if (vote === "no" && isFlagBlockedForLinkedinUrl(linkedinUrlCanonical, slug)) {
    return Response.json(
      {
        error:
          "Negative votes cannot be submitted for this LinkedIn profile.",
      },
      { status: 403 }
    );
  }

  const { data: users, sha: usersSha } = await readDataFile(
    "data/users/_index.json"
  );

  const existingUser = users.find((u) => u.user_id === userId);

  // 1.12 Sybil hardening (first-time contributors).
  if (!existingUser) {
    if (session.provider !== "linkedin") {
      return Response.json(
        {
          error:
            "First-time contributors must sign in with LinkedIn before submitting a vote.",
        },
        { status: 403 }
      );
    }

    const minAgeDays = envLimit("SYBIL_LINKEDIN_MIN_AGE_DAYS", 30);
    const minConnections = envLimit("SYBIL_LINKEDIN_MIN_CONNECTIONS", 10);
    const ageDays = Number(session.linkedinAccountAgeDays);
    const connections = Number(session.linkedinConnections);

    if (!Number.isFinite(ageDays) || ageDays < minAgeDays) {
      return Response.json(
        {
          error: `LinkedIn trust check failed: account age must be at least ${minAgeDays} days for first-time contributors.`,
        },
        { status: 403 }
      );
    }
    if (!Number.isFinite(connections) || connections < minConnections) {
      return Response.json(
        {
          error: `LinkedIn trust check failed: at least ${minConnections} connections are required for first-time contributors.`,
        },
        { status: 403 }
      );
    }
  }

  const weeklyVouchCap = envLimit("SYBIL_VOUCHES_PER_WEEK_CAP", 20);
  const weeklyYes = countRecentYesVouches(existingUser, 7);
  if (vote === "yes" && weeklyYes >= weeklyVouchCap) {
    return Response.json(
      {
        error: `Weekly vouch cap reached (${weeklyVouchCap}). Please try again next week.`,
      },
      { status: 403 }
    );
  }

  const alreadyVoted = existingUser?.contributions.some(
    (c) => c.profile_slug === slug
  );

  if (alreadyVoted) {
    return Response.json(
      {
        error: `You have already voted on ${slug}. Each person can only vote once per profile — votes are permanent.`,
      },
      { status: 409 }
    );
  }

  if (vote === "no") {
    if (!existingUser || existingUser.yes_count < 1) {
      return Response.json(
        {
          error:
            "Your first contribution must be a positive one. Vouch for someone you've had a good experience with before you can flag anyone.",
          karma: true,
        },
        { status: 403 }
      );
    }
    if (!canSubmitNegativeVote(existingUser)) {
      return Response.json(
        {
          error: `Each positive vouch earns 1 flag credit; each negative vote uses one credit. Add another positive vouch to get a new credit.`,
          karma: true,
        },
        { status: 403 }
      );
    }
  }

  const today = new Date().toISOString().split("T")[0];

  const titleName =
    formatProfessionalDisplayName(slug, profileForTitle?.public_name) ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const issueBody = [
    `### LinkedIn Profile URL`,
    ``,
    linkedinUrlCanonical,
    ``,
    `### Based on your experience, would you work with/for them again?`,
    ``,
    vote === "yes" ? "Yes" : "No",
    ``,
    `### Brief Reason (optional)`,
    ``,
    reason || "_No response_",
    ``,
    `### Submitted via`,
    ``,
    `Website form by **${displayName}** (${userId})`,
    ``,
    `---`,
    `*This vote was submitted programmatically and pre-validated (Karma Rule checked, duplicate vote checked).*`,
  ].join("\n");

  const issueLabels = ["vote"];
  if (reason && reason.trim()) issueLabels.push("moderation-pending");

  let issue;
  try {
    issue = await createIssue(
      `[${vote.toUpperCase()}] ${titleName}`,
      issueBody,
      issueLabels
    );
  } catch {
    return Response.json(
      { error: "Failed to create audit record. Please try again." },
      { status: 500 }
    );
  }

  const issueNumber = issue.number;
  const reasonTrimmed =
    typeof reason === "string" && reason.trim() ? reason.trim() : "";
  const needsModeration = reasonTrimmed.length > 0;
  const safety = reasonTrimmed
    ? await analyzeReasonSafety(reasonTrimmed)
    : { hasRisk: false, blockApprove: false, hits: [], llm: null };
  const submission = {
    user: userId,
    display_name: displayName,
    display_image: session.user?.image || null,
    ...(session.provider === "linkedin" && session.linkedinVanity
      ? {
        submitter_linkedin_url: `https://www.linkedin.com/in/${String(
          session.linkedinVanity
        ).toLowerCase()}`,
      }
      : {}),
    vote,
    issue: issueNumber,
    date: today,
    ...(reasonTrimmed
      ? {
        reason: reasonTrimmed,
        reason_pending: true,
        ...(safety.hasRisk
          ? {
            reason_safety_flags: {
              block_approve: Boolean(safety.blockApprove),
              hits: safety.hits,
              llm: safety.llm,
            },
          }
          : {}),
      }
      : {}),
  };

  let profile = profileForTitle;
  if (!profile) {
    profile = {
      linkedin_url: linkedinUrlCanonical,
      slug,
      votes: { yes: 0, no: 0 },
      submissions: [],
    };
    profiles.push(profile);
  }
  profile.votes[vote]++;
  profile.submissions.push(submission);

  let userEntry = users.find((u) => u.user_id === userId);
  if (!userEntry) {
    userEntry = {
      user_id: userId,
      display_name: displayName,
      contributions: [],
      yes_count: 0,
      no_count: 0,
    };
    users.push(userEntry);
  }
  userEntry.display_name = displayName;
  userEntry.contributions.push({
    profile_slug: slug,
    vote,
    issue: issueNumber,
    date: today,
  });
  userEntry[`${vote}_count`]++;

  try {
    await writeDataFile(
      "data/profiles/_index.json",
      profiles,
      profilesSha,
      `Add ${vote} vote for ${slug} from ${userId} (issue #${issueNumber})`
    );

    const { sha: freshUsersSha } = await readDataFile(
      "data/users/_index.json"
    );
    await writeDataFile(
      "data/users/_index.json",
      users,
      freshUsersSha || usersSha,
      `Update contributor ${userId} (issue #${issueNumber})`
    );
  } catch {
    return Response.json(
      {
        error:
          "Vote recorded as issue but data update failed. An admin will resolve this.",
      },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: needsModeration
      ? `Your ${vote === "yes" ? "positive" : "negative"} vote for ${titleName} has been recorded permanently. Your comment is pending admin review before it will be publicly visible.`
      : `Your ${vote === "yes" ? "positive" : "negative"} vote for ${titleName} has been recorded permanently.`,
    moderation: needsModeration,
    profile: {
      slug,
      votes: profile.votes,
    },
    issue: issueNumber,
  });
}

function extractSlug(url) {
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  return match ? match[1].toLowerCase() : null;
}

function canonicalLinkedinUrl(slug) {
  return `https://www.linkedin.com/in/${String(slug || "").toLowerCase()}`;
}

function countRecentYesVouches(userEntry, lookbackDays) {
  if (!userEntry || !Array.isArray(userEntry.contributions)) return 0;
  const now = Date.now();
  const windowMs = lookbackDays * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const c of userEntry.contributions) {
    if (c?.vote !== "yes") continue;
    const t = Date.parse(String(c?.date || ""));
    if (!Number.isFinite(t)) continue;
    if (now - t <= windowMs) count += 1;
  }
  return count;
}
