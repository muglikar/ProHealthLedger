import Link from "next/link";

const REPO_OWNER = "muglikar";
const REPO_NAME = "ProHealthLedger";

export default function SubmitPage() {
  const issueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?template=submit-vote.yml&title=%5BVOTE%5D+`;

  return (
    <>
      <section className="submit-hero">
        <h1>Submit a Vote</h1>
        <p>
          Share your genuine professional experience. Your vote is submitted as
          a GitHub Issue and processed automatically by our transparent,
          open-source pipeline.
        </p>
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Open Submission Form on GitHub →
        </a>
      </section>

      <div className="submit-steps">
        <div className="submit-step">
          <h3>1. Prepare</h3>
          <p>
            You will need the LinkedIn URL of the professional you want to vote
            on. Make sure you have a GitHub account — your GitHub username is
            your identity on the ledger.
          </p>
        </div>
        <div className="submit-step">
          <h3>2. Answer One Question</h3>
          <p>
            &ldquo;Based on your experience, would you work with/for them
            again?&rdquo; Choose Yes or No. Optionally add a brief,
            constructive reason.
          </p>
        </div>
        <div className="submit-step">
          <h3>3. Submit</h3>
          <p>
            Open the issue. Our GitHub Action picks it up within seconds,
            validates it, applies the Karma Rule, and updates the ledger
            automatically.
          </p>
        </div>
      </div>

      <div className="cta-box">
        <h2>Remember the Karma Rule</h2>
        <p>
          You must have at least one &ldquo;Yes&rdquo; vote on record before
          you can submit a &ldquo;No&rdquo; vote. This keeps the community
          constructive.
        </p>
        <Link href="/profiles" className="btn btn-secondary">
          Browse Existing Profiles
        </Link>
      </div>
    </>
  );
}
