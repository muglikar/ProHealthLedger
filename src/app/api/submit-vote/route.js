import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile, createIssue } from "@/lib/github";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json(
      { error: "You must be signed in to vote." },
      { status: 401 }
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

  const slug = extractSlug(linkedinUrl);
  if (!slug) {
    return Response.json(
      {
        error:
          "That doesn't look like a valid LinkedIn URL. Use a link like https://www.linkedin.com/in/jane-doe",
      },
      { status: 400 }
    );
  }

  const { data: profiles, sha: profilesSha } = await readDataFile(
    "data/profiles/_index.json"
  );
  const { data: users, sha: usersSha } = await readDataFile(
    "data/users/_index.json"
  );

  const existingUser = users.find((u) => u.user_id === userId);
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
  }

  const today = new Date().toISOString().split("T")[0];

  const titleName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const issueBody = [
    `### LinkedIn Profile URL`,
    ``,
    normalizeUrl(linkedinUrl),
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

  let issue;
  try {
    issue = await createIssue(
      `[${vote.toUpperCase()}] ${titleName}`,
      issueBody,
      ["vote"]
    );
  } catch {
    return Response.json(
      { error: "Failed to create audit record. Please try again." },
      { status: 500 }
    );
  }

  const issueNumber = issue.number;
  const submission = {
    user: userId,
    display_name: displayName,
    vote,
    issue: issueNumber,
    date: today,
  };

  let profile = profiles.find((p) => p.slug === slug);
  if (!profile) {
    profile = {
      linkedin_url: normalizeUrl(linkedinUrl),
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
    message: `Your ${vote === "yes" ? "positive" : "negative"} vote for ${titleName} has been recorded permanently.`,
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

function normalizeUrl(url) {
  const slug = extractSlug(url);
  return `https://www.linkedin.com/in/${slug}`;
}
