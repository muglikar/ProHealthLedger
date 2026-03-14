const fs = require("fs");
const path = require("path");

const PROFILES_PATH = path.join(__dirname, "..", "data", "profiles", "_index.json");
const USERS_PATH = path.join(__dirname, "..", "data", "users", "_index.json");

async function main() {
  const issueBody = process.env.ISSUE_BODY || "";
  const issueNumber = parseInt(process.env.ISSUE_NUMBER, 10);
  const issueAuthor = process.env.ISSUE_AUTHOR || "";
  const repoFullName = process.env.REPO_FULL_NAME || "";
  const token = process.env.GITHUB_TOKEN || "";

  const linkedinUrl = extractField(issueBody, "LinkedIn Profile URL");
  const vote = extractField(issueBody, "Based on your experience, would you work with/for them again?");

  if (!linkedinUrl || !vote) {
    await commentAndClose(
      repoFullName,
      issueNumber,
      token,
      "Could not parse the LinkedIn URL or vote from this issue. Please use the issue template."
    );
    process.exit(0);
  }

  const normalizedVote = vote.trim().toLowerCase() === "yes" ? "yes" : "no";
  const slug = extractSlug(linkedinUrl);

  if (!slug) {
    await commentAndClose(
      repoFullName,
      issueNumber,
      token,
      "Invalid LinkedIn URL format. Please provide a URL like `https://www.linkedin.com/in/jane-doe`."
    );
    process.exit(0);
  }

  const profiles = readJSON(PROFILES_PATH);
  const users = readJSON(USERS_PATH);

  if (normalizedVote === "no") {
    const user = users.find((u) => u.github_username === issueAuthor);
    if (!user || user.yes_count < 1) {
      await commentAndClose(
        repoFullName,
        issueNumber,
        token,
        [
          "**Karma Rule:** You must have at least one 'Yes' contribution before submitting a 'No'.",
          "",
          "This ensures the community is built on positive engagement first.",
          "Please vouch for a professional you've had a great experience with, then come back.",
        ].join("\n")
      );
      process.exit(0);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const submission = {
    user: issueAuthor,
    vote: normalizedVote,
    issue: issueNumber,
    date: today,
  };

  let profile = profiles.find((p) => p.slug === slug);
  if (!profile) {
    profile = {
      linkedin_url: normalizeLinkedInUrl(linkedinUrl),
      slug,
      votes: { yes: 0, no: 0 },
      submissions: [],
    };
    profiles.push(profile);
  }
  profile.votes[normalizedVote]++;
  profile.submissions.push(submission);

  let userEntry = users.find((u) => u.github_username === issueAuthor);
  if (!userEntry) {
    userEntry = {
      github_username: issueAuthor,
      contributions: [],
      yes_count: 0,
      no_count: 0,
    };
    users.push(userEntry);
  }
  userEntry.contributions.push({
    profile_slug: slug,
    vote: normalizedVote,
    issue: issueNumber,
    date: today,
  });
  userEntry[`${normalizedVote}_count`]++;

  writeJSON(PROFILES_PATH, profiles);
  writeJSON(USERS_PATH, users);

  await commentAndClose(
    repoFullName,
    issueNumber,
    token,
    [
      `Vote recorded for **${slug}** (${normalizedVote.toUpperCase()}).`,
      "",
      `Profile now has ${profile.votes.yes} Yes / ${profile.votes.no} No votes.`,
      "",
      "Thank you for contributing to the Professional Health Ledger.",
    ].join("\n")
  );

  console.log(`Processed issue #${issueNumber}: ${normalizedVote} vote for ${slug} by ${issueAuthor}`);
}

function extractField(body, label) {
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(label)) {
      for (let j = i + 1; j < lines.length; j++) {
        const value = lines[j].trim();
        if (value && !value.startsWith("###") && !value.startsWith("_")) {
          return value;
        }
      }
    }
  }
  return null;
}

function extractSlug(url) {
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  return match ? match[1].toLowerCase() : null;
}

function normalizeLinkedInUrl(url) {
  const slug = extractSlug(url);
  return `https://www.linkedin.com/in/${slug}`;
}

function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function commentAndClose(repo, issueNumber, token, message) {
  const baseUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;

  await fetch(`${baseUrl}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: message }),
  });

  await fetch(baseUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: "closed" }),
  });
}

main().catch((err) => {
  console.error("Fatal error processing vote:", err);
  process.exit(1);
});
