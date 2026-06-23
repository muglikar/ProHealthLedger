import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile, createIssue, writeRepoFile } from "@/lib/github";
import { canSubmitNegativeVote } from "@/lib/karma";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import { isFlagBlockedForLinkedinUrl } from "@/lib/protected-profiles";
import { verifyLinkedinSlug } from "@/lib/linkedin-slug-verify";
import { analyzeReasonSafety } from "@/lib/content-safety";
import { createProfileLinkChangeRequest } from "@/lib/profile-link-change-requests";
import { resolveLinkedinProfile } from "@/lib/linkedin-name-resolve";
import { notifyProfileWatchers } from "@/lib/push-notify";
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
  const { linkedinUrl, vote, reason, submitterLinkedinUrl, submitterCapacity, votedCapacity, photoFlagged, publicName, resolvedName, resolvedPhoto, manualPhotoUrl } = body;
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

  let sessionUserId = (userId || "").replace("github:", "").replace("linkedin:", "");
  if (sessionUserId === "CAOSO1oig0") sessionUserId = "muglikar";

  const existingUser = users.find((u) => {
    const uid = (u.user_id || u.github_username || "").replace("github:", "").replace("linkedin:", "");
    return uid === sessionUserId;
  });

  // 1.12 Sybil hardening (first-time contributors).
  const isFirstTimeContributor = !existingUser || !existingUser.contributions || existingUser.contributions.length === 0;
  const skipSybil = session.siteAdmin || !isFirstTimeContributor;

  if (isFirstTimeContributor && !session.siteAdmin) {
    const provider = String(session.provider || "").toLowerCase();
    if (provider !== "linkedin") {
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
    const ageDays = session.linkedinAccountAgeDays;
    const connections = session.linkedinConnections;

    // Only block if we have DEFINITIVE data that fails the check.
    // If the API returns null (unknown), we allow it to avoid false positives.
    if (ageDays !== null && Number.isFinite(Number(ageDays)) && Number(ageDays) < minAgeDays) {
      return Response.json(
        {
          error: `LinkedIn trust check failed: your account is too new (${ageDays} days). Account age must be at least ${minAgeDays} days for first-time contributors.`,
        },
        { status: 403 }
      );
    }
    if (connections !== null && Number.isFinite(Number(connections)) && Number(connections) < minConnections) {
      return Response.json(
        {
          error: `LinkedIn trust check failed: your account has too few connections (${connections}). At least ${minConnections} connections are required for first-time contributors.`,
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

  const today = new Date().toISOString().split("T")[0];

  const titleName =
    formatProfessionalDisplayName(slug, profileForTitle?.public_name || publicName) ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const alreadyVoted = existingUser?.contributions?.some(
    (c) => c.profile_slug === slug
  ) || false;

  if (alreadyVoted) {
    const existingSubmission = profileForTitle?.submissions?.find(
      (s) => s.user === userId
    );
    if (existingSubmission) {
      if (existingSubmission.vote !== vote) {
        return Response.json(
          {
            error: `You cannot change your vote. Votes are permanent; you can only edit your comment/reason.`,
          },
          { status: 409 }
        );
      }
      if (existingSubmission.reason_edited) {
        return Response.json(
          {
            error: `You have already edited your comment/reason for this profile. You can only edit it once.`,
          },
          { status: 409 }
        );
      }
      const newReason = (reason || "").trim();
      const oldReason = (existingSubmission.reason || "").trim();

      const validManualPhoto = manualPhotoUrl && isValidLinkedinImageUrl(manualPhotoUrl) ? manualPhotoUrl : null;

      if (
        newReason === oldReason &&
        !validManualPhoto
      ) {
        return Response.json(
          {
            error: `No changes detected in your comment or photo.`,
          },
          { status: 400 }
        );
      }

      const isCommentChanged = newReason !== oldReason;
      const needsModeration = isCommentChanged && newReason.length > 0;
      const safety = needsModeration
        ? await analyzeReasonSafety(newReason)
        : { hasRisk: false, blockApprove: false, hits: [], llm: null };

      // Handle manual photo update
      if (validManualPhoto) {
        profileForTitle.profile_photo_url = validManualPhoto;
        profileForTitle.original_photo_url = validManualPhoto;
        profileForTitle.photo_storage = "placeholder";

        try {
          console.log(`[submit-vote-edit] Downloading photo from manual URL: ${validManualPhoto}`);
          const downloadRes = await fetch(validManualPhoto);
          if (downloadRes.ok) {
            const contentType = downloadRes.headers.get("content-type") || "image/jpeg";
            const ext = contentType.includes("png") ? "png" : "jpeg";
            const buffer = await downloadRes.arrayBuffer();
            const filePath = `public/${slug}.${ext}`;
            await writeRepoFile(filePath, buffer, `chore: save local profile photo for ${slug}`);
            profileForTitle.profile_photo_url = `/${slug}.${ext}`;
            profileForTitle.photo_storage = "local";
          } else {
            profileForTitle.photo_storage = "linkedin_cdn";
          }
        } catch (imgErr) {
          console.error("[submit-vote-edit] Non-fatal image download/commit failure:", imgErr);
          profileForTitle.photo_storage = "linkedin_cdn";
        }
      }

      // Create GitHub Audit issue for the edit
      const issueBody = [
        `### LinkedIn Profile URL`,
        ``,
        linkedinUrlCanonical,
        ``,
        `### Action`,
        ``,
        `Comment / reason edited by **${displayName}** (${userId})`,
        ``,
        `### New Brief Reason`,
        ``,
        isCommentChanged ? (newReason || "_No response (comment removed)_") : (oldReason || "_No response_"),
        ``,
        ...(validManualPhoto
          ? [
              `### Manual Photo URL Added`,
              ``,
              validManualPhoto,
              ``,
            ]
          : []),
        `### Submitted via`,
        ``,
        `Website form (Edit Comment)`,
        ``,
        `---`,
        `*This comment edit was submitted programmatically and pre-validated.*`,
      ].join("\n");

      const issueLabels = ["vote", "comment-edit"];
      if (needsModeration) issueLabels.push("moderation-pending");

      let editIssue;
      try {
        editIssue = await createIssue(
          `[EDIT COMMENT] ${titleName}`,
          issueBody,
          issueLabels
        );
      } catch {
        return Response.json(
          { error: "Failed to create audit record for the comment edit. Please try again." },
          { status: 500 }
        );
      }

      const issueNumber = editIssue.number;

      // Update existingSubmission fields
      if (isCommentChanged) {
        existingSubmission.reason = newReason || undefined;
        if (!newReason) {
          delete existingSubmission.reason;
        }
        existingSubmission.reason_edited = true;
        
        if (needsModeration) {
          existingSubmission.reason_pending = true;
          if (safety.hasRisk) {
            existingSubmission.reason_safety_flags = {
              block_approve: Boolean(safety.blockApprove),
              hits: safety.hits,
              llm: safety.llm,
            };
          } else {
            delete existingSubmission.reason_safety_flags;
          }
        } else {
          delete existingSubmission.reason_pending;
          delete existingSubmission.reason_safety_flags;
        }
      }

      existingSubmission.issue = issueNumber;

      // Write updated profiles list back to data
      try {
        await writeDataFile(
          "data/profiles/_index.json",
          profiles,
          profilesSha,
          `Edit comment for ${slug} from ${userId} (issue #${issueNumber})`
        );
      } catch {
        return Response.json(
          {
            error: "Comment updated locally but data update failed. An admin will resolve this.",
          },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        message: needsModeration
          ? `Your comment for ${titleName} has been updated and is pending admin review.`
          : `Your comment for ${titleName} has been updated.`,
        profile: {
          slug,
          votes: profileForTitle.votes,
        },
        issue: issueNumber,
      });
    }

    return Response.json(
      {
        error: `You have already voted on ${slug}. Each person can only vote once per profile — votes are permanent.`,
      },
      { status: 409 }
    );
  }

  if (vote === "no") {
    if (!existingUser || !existingUser.yes_count || existingUser.yes_count < 1) {
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

  const issueBody = [
    `### LinkedIn Profile URL`,
    ``,
    linkedinUrlCanonical,
    ``,
    `### Based on your experience, would you work with/for them again?`,
    ``,
    vote === "yes" ? "Yes" : "No",
    ``,
    ...(submitterCapacity?.trim()
      ? [
          `### Voter's Role / Company`,
          ``,
          submitterCapacity.trim(),
          ``,
        ]
      : []),
    ...(votedCapacity?.trim()
      ? [
          `### Their Role / Company`,
          ``,
          votedCapacity.trim(),
          ``,
        ]
      : []),
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
    ...( (session.provider === "linkedin" && session.linkedinVanity) || submitterLinkedinUrl
      ? {
        submitter_linkedin_url: submitterLinkedinUrl || `https://www.linkedin.com/in/${String(
          session.linkedinVanity
        ).toLowerCase()}`,
      }
      : {}),
    vote,
    issue: issueNumber,
    date: today,
    ...(submitterCapacity?.trim() ? { submitter_capacity: submitterCapacity.trim() } : {}),
    ...(votedCapacity?.trim() ? { voted_capacity: votedCapacity.trim() } : {}),
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

  // If the voter provided a manual name (e.g. because lookup failed), use it.
  if (publicName && typeof publicName === "string" && publicName.trim()) {
    if (!profile.public_name) {
      profile.public_name = publicName.trim();
      profile.resolution_source = "manual";
      profile.confidence = 1.0;
      profile.resolved_at = new Date().toISOString();
    }
  }

  // Auto-resolve the real name and profile photo from LinkedIn if not already set.
  let resolved = null;
  const validManualPhoto = manualPhotoUrl && isValidLinkedinImageUrl(manualPhotoUrl) ? manualPhotoUrl : null;

  if (validManualPhoto) {
    profile.profile_photo_url = validManualPhoto;
    profile.original_photo_url = validManualPhoto;
    profile.photo_storage = "placeholder"; // force download
  }

  if (!profile.public_name || !profile.profile_photo_url || validManualPhoto || (profile.profile_photo_url && profile.profile_photo_url.startsWith("http"))) {
    try {
      if (resolvedName || resolvedPhoto || validManualPhoto) {
        resolved = {
          name: resolvedName || null,
          photo: validManualPhoto || resolvedPhoto || null,
          source: validManualPhoto ? "manual-photo-input" : "client-preview",
          confidence: 0.95
        };
      } else {
        resolved = await resolveLinkedinProfile(slug);
      }

      if (resolved.name && !profile.public_name) {
        profile.public_name = resolved.name;
      }

      // Store resolution metadata
      if (resolved.source) {
        profile.resolution_source = resolved.source;
        profile.confidence = resolved.confidence ?? 0;
        profile.resolved_at = new Date().toISOString();
      }

      if (resolved.photo) {
        profile.original_photo_url = resolved.photo;
      }
    } catch (err) {
      console.warn("[submit-vote] resolve profile failed:", err);
    }
  }

  // Handle local photo download and commit if the photo URL starts with http
  const photoUrlToDownload = resolved?.photo || (profile.profile_photo_url && profile.profile_photo_url.startsWith("http") ? profile.profile_photo_url : null);
  const localPhotoPath = profile.profile_photo_url;
  const isLocalPhotoValid = localPhotoPath && localPhotoPath.startsWith("/");

  if (photoUrlToDownload && !isLocalPhotoValid) {
    try {
      console.log(`[submit-vote] Downloading photo from CDN: ${photoUrlToDownload}`);
      const downloadRes = await fetch(photoUrlToDownload);
      if (downloadRes.ok) {
        const contentType = downloadRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpeg";
        const buffer = await downloadRes.arrayBuffer();

        const filePath = `public/${slug}.${ext}`;
        console.log(`[submit-vote] Committing image to repository: ${filePath}`);

        // This is non-blocking to vote submission, caught errors won't bubble up.
        await writeRepoFile(filePath, buffer, `chore: save local profile photo for ${slug}`);

        // Update database photo URL to point to the local path
        profile.profile_photo_url = `/${slug}.${ext}`;
        profile.photo_storage = "local";
      } else {
        console.warn(`[submit-vote] CDN photo fetch returned status: ${downloadRes.status}`);
        profile.profile_photo_url = photoUrlToDownload;
        profile.photo_storage = "linkedin_cdn";
      }
    } catch (imgErr) {
      console.error("[submit-vote] Non-fatal image download/commit failure:", imgErr);
      profile.profile_photo_url = photoUrlToDownload;
      profile.photo_storage = "linkedin_cdn";
    }
  } else if (isLocalPhotoValid) {
    profile.photo_storage = "local";
  } else {
    profile.photo_storage = "placeholder";
  }

  // If the voter flagged the photo as wrong, clear it so it can be re-resolved
  // on the next vote submission, and record the flag on this submission.
  if (photoFlagged) {
    profile.profile_photo_url = null;
    profile.original_photo_url = null;
    profile.photo_storage = "placeholder";
    submission.photo_flagged = true;
  }

  profile.votes[vote]++;
  profile.submissions.push(submission);

  let userEntry = existingUser;
  if (!userEntry) {
    userEntry = {
      user_id: sessionUserId,
      display_name: displayName,
      contributions: [],
      yes_count: 0,
      no_count: 0,
    };
    users.push(userEntry);
  } else {
    if (!userEntry.contributions) userEntry.contributions = [];
    if (userEntry.yes_count === undefined) userEntry.yes_count = 0;
    if (userEntry.no_count === undefined) userEntry.no_count = 0;
  }
  userEntry.display_name = displayName;
  if (submitterLinkedinUrl) {
    userEntry.linkedin_url = submitterLinkedinUrl;
  } else if (session.provider === "linkedin" && session.linkedinVanity && !userEntry.linkedin_url) {
    userEntry.linkedin_url = `https://www.linkedin.com/in/${String(session.linkedinVanity).toLowerCase()}`;
  }
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

  // Trigger push notifications for profile watchers (non-blocking)
  notifyProfileWatchers(slug, { vote, displayName }).catch((err) => {
    console.error("Failed to notify watchers in background:", err);
  });

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

function isValidLinkedinImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith("licdn.com") &&
      parsed.pathname.includes("/dms/image") &&
      !url.includes("ghost") &&
      !url.includes("default")
    );
  } catch {
    return false;
  }
}
