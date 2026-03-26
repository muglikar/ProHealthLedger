import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="home-first-fold" aria-label="Overview">
        <div className="home-first-fold-grid">
          <div className="home-hero-col">
            <span className="hero-badge">Free · Public · Permanent</span>
            <h1>
              Know who you&apos;re working with{" "}
              <span className="hero-highlight">before you commit.</span>
            </h1>
            <p className="hero-lede">
              One question per person: would you work with them again? Real
              identities, public ledger — no star ratings or essay reviews.
            </p>
            <p className="hero-trust-line">
              LinkedIn or GitHub sign-in · Full transparency page · One vote per
              person per profile
            </p>
            <div className="hero-actions">
              <Link href="/submit" className="btn btn-primary">
                Share Your Experience
              </Link>
              <Link href="/profiles" className="btn btn-secondary">
                Look Up Someone
              </Link>
            </div>
          </div>

          <div className="home-steps-col">
            <h2 className="home-steps-heading">How does it work?</h2>
            <p className="home-steps-sub">Three steps. No fees or subscription.</p>
            <div className="steps-grid steps-grid--fold">
              <div className="step-card step-card--compact">
                <div className="step-number">1</div>
                <h3>Share your experience</h3>
                <p>
                  Paste a LinkedIn URL and answer: &ldquo;Would you work with
                  them again?&rdquo; Optional short reason.
                </p>
              </div>
              <div className="step-card step-card--compact">
                <div className="step-number">2</div>
                <h3>Recorded in public</h3>
                <p>
                  Saved in an open audit trail (GitHub). No edits — your word
                  stays on the record.
                </p>
              </div>
              <div className="step-card step-card--compact">
                <div className="step-number">3</div>
                <h3>Anyone can look them up</h3>
                <p>
                  Before you hire, partner, or join a team, see how others have
                  vouched or flagged.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="karma-section">
        <div className="karma-box">
          <div className="karma-icon">⚖️</div>
          <div>
            <h3>Positivity comes first</h3>
            <p>
              Your first contribution must be a positive vouch. After that,
              each positive vouch earns one flag (negative vote) credit, and each
              flag uses one credit. That keeps the platform constructive.
            </p>
          </div>
        </div>
      </section>

      <section className="why-section">
        <h2 className="section-title">Why does this exist?</h2>
        <div className="why-grid">
          <div className="why-card">
            <h3>References are broken</h3>
            <p>
              Traditional references are curated — people only list contacts
              who&apos;ll say nice things. This gives the full, unfiltered
              picture.
            </p>
          </div>
          <div className="why-card">
            <h3>Reputation should be portable</h3>
            <p>
              Your professional track record shouldn&apos;t vanish when you
              leave a company. It belongs to you — and to the people
              considering working with you.
            </p>
          </div>
          <div className="why-card">
            <h3>Transparency protects everyone</h3>
            <p>
              When professional conduct is publicly visible, it creates
              accountability. Good actors are recognized. Bad patterns become
              visible.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
