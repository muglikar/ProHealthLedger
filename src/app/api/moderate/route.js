import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile } from "@/lib/github";
import { isSessionSiteAdmin } from "@/lib/site-admins";
import {
  DEFAULT_REDACTION_CATEGORY,
  hashReasonForIssue,
  normalizeCategory,
  readPrivateOriginalReason,
  recordPrivateRedaction,
  recordPrivateUnredaction,
} from "@/lib/redactions";
import { appendModerationLog } from "@/lib/moderation-log";

function moderatorIdFromSession(session) {
  return (
    (session && typeof session.userId === "string" && session.userId) ||
    "unknown"
  );
}

function nowIso() {
  return new Date().toISOString();
}

function pendingItem(profile, submission) {
  return {
    profile_slug: profile.slug,
    public_name: profile.public_name,
    issue: submission.issue,
    user: submission.user,
    display_name: submission.display_name,
    vote: submission.vote,
    reason: submission.reason,
    date: submission.date,
  };
}

function redactedItem(profile, submission) {
  return {
    profile_slug: profile.slug,
    public_name: profile.public_name,
    issue: submission.issue,
    user: submission.user,
    display_name: submission.display_name,
    vote: submission.vote,
    redacted_by: submission.redacted_by,
    redacted_at: submission.redacted_at,
    redaction_category: submission.redaction_category,
    reason_hash: submission.reason_hash,
    date: submission.date,
  };
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "pending").toLowerCase();

  const { data: profiles } = await readDataFile("data/profiles/_index.json");

  if (status === "redacted") {
    const out = [];
    for (const p of profiles) {
      for (const s of p.submissions || []) {
        if (s.reason_redacted) out.push(redactedItem(p, s));
      }
    }
    out.sort((a, b) =>
      String(b.redacted_at || "").localeCompare(String(a.redacted_at || ""))
    );
    return Response.json(out);
  }

  // Default: pending
  const pending = [];
  for (const p of profiles) {
    for (const s of p.submissions || []) {
      if (s.reason_pending) pending.push(pendingItem(p, s));
    }
  }
  return Response.json(pending);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { issue, action } = body;
  const issueNum = Number(issue);
  if (
    !Number.isFinite(issueNum) ||
    !["approve", "reject", "unredact"].includes(action)
  ) {
    return Response.json(
      {
        error:
          "issue (number) and action (approve|reject|unredact) are required.",
      },
      { status: 400 }
    );
  }

  const moderator = moderatorIdFromSession(session);
  const at = nowIso();

  const { data: profiles, sha } = await readDataFile(
    "data/profiles/_index.json"
  );

  let target = null;
  for (const p of profiles) {
    for (const s of p.submissions || []) {
      if (Number(s.issue) === issueNum) {
        if (action === "unredact" && s.reason_redacted) {
          target = s;
          break;
        }
        if (action !== "unredact" && s.reason_pending) {
          target = s;
          break;
        }
      }
    }
    if (target) break;
  }

  if (!target) {
    return Response.json(
      {
        error:
          action === "unredact"
            ? "No redacted submission found for that issue."
            : "No pending submission found for that issue.",
      },
      { status: 404 }
    );
  }

  if (action === "approve") {
    delete target.reason_pending;
    try {
      await writeDataFile(
        "data/profiles/_index.json",
        profiles,
        sha,
        `Moderate comment on issue #${issueNum}: approve`
      );
    } catch {
      return Response.json(
        { error: "Failed to write public ledger." },
        { status: 500 }
      );
    }
    try {
      await appendModerationLog({
        issue: issueNum,
        action: "approve",
        moderator,
        at,
      });
    } catch {
      // Public log write failure is non-fatal: the primary state already updated.
    }
    return Response.json({ success: true, action, issue: issueNum });
  }

  if (action === "reject") {
    const category = normalizeCategory(body.category || DEFAULT_REDACTION_CATEGORY);
    const originalText = typeof target.reason === "string" ? target.reason : "";

    // Persist the original text in the private store first; only mutate the
    // public ledger if the private write either succeeds or is intentionally
    // not configured (so we never lose user content silently).
    try {
      await recordPrivateRedaction({
        issueNumber: issueNum,
        originalText,
        moderatorId: moderator,
        category,
        at,
      });
    } catch (err) {
      return Response.json(
        {
          error:
            "Failed to store original reason in private redactions store. Aborting reject so no content is silently lost.",
          details: err?.message || null,
        },
        { status: 502 }
      );
    }

    target.reason_redacted = true;
    target.redacted_by = moderator;
    target.redacted_at = at;
    target.redaction_category = category;
    target.reason_hash = hashReasonForIssue(issueNum, originalText);
    delete target.reason;
    delete target.reason_pending;

    try {
      await writeDataFile(
        "data/profiles/_index.json",
        profiles,
        sha,
        `Moderate comment on issue #${issueNum}: redact (${category})`
      );
    } catch {
      return Response.json(
        { error: "Failed to write public ledger." },
        { status: 500 }
      );
    }

    try {
      await appendModerationLog({
        issue: issueNum,
        action: "reject",
        moderator,
        at,
        category,
      });
    } catch {
      /* see approve branch */
    }
    return Response.json({ success: true, action, issue: issueNum, category });
  }

  // action === "unredact"
  const original = await readPrivateOriginalReason(issueNum);
  if (!original) {
    return Response.json(
      {
        error:
          "Cannot un-redact: original text is not available in the private redactions store.",
      },
      { status: 410 }
    );
  }

  target.reason = original;
  delete target.reason_redacted;
  delete target.redacted_by;
  delete target.redacted_at;
  delete target.redaction_category;
  delete target.reason_hash;

  try {
    await writeDataFile(
      "data/profiles/_index.json",
      profiles,
      sha,
      `Moderate comment on issue #${issueNum}: un-redact`
    );
  } catch {
    return Response.json(
      { error: "Failed to write public ledger." },
      { status: 500 }
    );
  }

  try {
    await recordPrivateUnredaction({
      issueNumber: issueNum,
      moderatorId: moderator,
      at,
    });
  } catch {
    /* private audit append is best-effort */
  }
  try {
    await appendModerationLog({
      issue: issueNum,
      action: "unredact",
      moderator,
      at,
    });
  } catch {
    /* see approve branch */
  }
  return Response.json({ success: true, action, issue: issueNum });
}
