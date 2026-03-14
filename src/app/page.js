import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <span className="hero-badge">Open Source · Community Driven</span>
        <h1>Professional Health Ledger</h1>
        <p>
          A transparent, GitHub-native system where professionals are
          community-verified through genuine work experiences. No algorithms, no
          gatekeepers — just honest, subjective voices.
        </p>
        <div className="hero-actions">
          <Link href="/submit" className="btn btn-primary">
            Submit a Vote
          </Link>
          <Link href="/profiles" className="btn btn-secondary">
            Browse Profiles
          </Link>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          Three simple steps to contribute to the professional ledger.
        </p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Open a GitHub Issue</h3>
            <p>
              Use our structured issue template to submit a vote. Paste a
              LinkedIn URL and answer one question: &ldquo;Would you work with
              them again?&rdquo;
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Automated Processing</h3>
            <p>
              A GitHub Action validates your submission, checks the Karma Rule,
              and updates the public ledger data — all transparently in the
              repository.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Public Verification</h3>
            <p>
              The professional&apos;s profile is updated with community votes.
              Anyone can browse the ledger and see the aggregate sentiment.
            </p>
          </div>
        </div>
      </section>

      <section className="karma-section">
        <div className="karma-box">
          <div className="karma-icon">⚖️</div>
          <div>
            <h3>The Karma Rule</h3>
            <p>
              Before you can submit a &ldquo;No&rdquo; vote, you must first
              vouch for someone with a &ldquo;Yes.&rdquo; This ensures the
              community is rooted in positive engagement and prevents drive-by
              negativity. Pay it forward, then speak your truth.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
