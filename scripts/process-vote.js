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

  if (issueBody.includes("pre-validated (Karma Rule checked")) {
    console.log(
      `Skipping issue #${issueNumber}: vote already recorded by website API.`
    );
    process.exit(0);
  }

  const linkedinUrl = extractField(issueBody, "LinkedIn Profile URL");
  const vote = extractField(issueBody, "Based on your experience, would you work with/for them again?");

  if (!linkedinUrl || !vote) {
    await commentAndClose(
      repoFullName, issueNumber, token,
      "Could not read the LinkedIn URL or vote from this submission. Please use the submission form and fill in all required fields."
    );
    process.exit(0);
  }

  const normalizedVote = vote.trim().toLowerCase() === "yes" ? "yes" : "no";
  const slug = extractSlug(linkedinUrl);

  if (!slug) {
    await commentAndClose(
      repoFullName, issueNumber, token,
      "That doesn't look like a valid LinkedIn URL. Please use a link like `https://www.linkedin.com/in/jane-doe`."
    );
    process.exit(0);
  }

  const profiles = readJSON(PROFILES_PATH);
  const users = readJSON(USERS_PATH);

  const userId = `github:${issueAuthor}`;
  const existingUser = users.find((u) => u.user_id === userId);
  const alreadyVoted = existingUser?.contributions.some(
    (c) => c.profile_slug === slug
  );
  if (alreadyVoted) {
    await commentAndClose(
      repoFullName, issueNumber, token,
      `You have already submitted a vote for **${slug}**. Each person can only vote once per profile — votes are permanent and cannot be changed.`
    );
    process.exit(0);
  }

  if (normalizedVote === "no") {
    if (!existingUser || existingUser.yes_count < 1) {
      await commentAndClose(
        repoFullName, issueNumber, token,
        [
          "**Your first contribution must be a positive one.**",
          "",
          "Before you can flag someone, you need to vouch for at least one professional you've had a good experience with.",
          "",
          "This keeps the community constructive. Come back after your first positive submission!",
        ].join("\n")
      );
      process.exit(0);
    }
    const yes = existingUser.yes_count ?? 0;
    const no = existingUser.no_count ?? 0;
    if (yes <= no) {
      await commentAndClose(
        repoFullName,
        issueNumber,
        token,
        [
          "**No flag credits left.**",
          "",
          "Each **positive vouch** earns **1 flag** credit. Each **negative** vote uses **one credit**.",
          "",
          `You currently have **${yes}** vouch${yes === 1 ? "" : "es"} and **${no}** negative submission${no === 1 ? "" : "s"}. Add another positive vouch to earn a new credit.`,
        ].join("\n")
      );
      process.exit(0);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const submission = {
    user: userId,
    display_name: issueAuthor,
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

  let userEntry = users.find((u) => u.user_id === userId);
  if (!userEntry) {
    userEntry = {
      user_id: userId,
      display_name: issueAuthor,
      contributions: [],
      yes_count: 0,
      no_count: 0,
    };
    users.push(userEntry);
  }
  userEntry.display_name = userEntry.display_name || issueAuthor;
  userEntry.contributions.push({
    profile_slug: slug,
    vote: normalizedVote,
    issue: issueNumber,
    date: today,
  });
  userEntry[`${normalizedVote}_count`]++;

  writeJSON(PROFILES_PATH, profiles);
  writeJSON(USERS_PATH, users);

  const titleSlug = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await setIssueTitle(repoFullName, issueNumber, token, `[${normalizedVote.toUpperCase()}] ${titleSlug}`);

  await commentAndClose(
    repoFullName, issueNumber, token,
    [
      `Your vote has been recorded for **${titleSlug}** — ${normalizedVote === "yes" ? "you'd work with them again" : "you would not work with them again"}.`,
      "",
      `This profile now has **${profile.votes.yes}** positive and **${profile.votes.no}** negative votes.`,
      "",
      "Thank you for contributing. Your vote is permanent and publicly visible.",
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
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ body: message }),
  });
  await fetch(baseUrl, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state: "closed" }),
  });
}

async function setIssueTitle(repo, issueNumber, token, title) {
  const baseUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
  await fetch(baseUrl, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

main().catch((err) => {
  console.error("Fatal error processing vote:", err);
  process.exit(1);
});
