import Link from "next/link";

const REPO_OWNER = "muglikar";
const REPO_NAME = "ProHealthLedger";

export default function SubmitPage() {
  const issueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?template=submit-vote.yml`;

  return (
    <>
      <section className="submit-hero">
        <h1>Share Your Experience</h1>
        <p>
          Worked with someone great — or not so great? Share your honest
          experience so others can make informed decisions.
        </p>
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Submit Your Vote →
        </a>
      </section>

      <div className="submit-steps">
        <div className="submit-step">
          <h3>1. You&apos;ll need two things</h3>
          <p>
            A free GitHub account (to identify yourself) and the LinkedIn URL
            of the person you&apos;re voting on.
          </p>
        </div>
        <div className="submit-step">
          <h3>2. Answer one question</h3>
          <p>
            &ldquo;Would you work with this person again?&rdquo; Pick Yes or
            No. You can optionally share a brief reason.
          </p>
        </div>
        <div className="submit-step">
          <h3>3. It&apos;s permanent</h3>
          <p>
            Your vote is recorded publicly and cannot be edited or deleted.
            It&apos;s tied to your GitHub username forever. Be honest.
          </p>
        </div>
      </div>

      <div className="cta-box">
        <h2>Remember: positivity comes first</h2>
        <p>
          Your first vote must be a &ldquo;Yes&rdquo; — vouch for someone
          you&apos;ve had a good experience with before you can flag anyone.
        </p>
        <Link href="/profiles" className="btn btn-secondary">
          See Who&apos;s Been Voted On
        </Link>
      </div>
    </>
  );
}
