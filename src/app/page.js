import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="home-above-fold" aria-labelledby="home-hero-title">
        <header className="home-hero-block">
          <span className="hero-badge">Free · Public · Permanent</span>
          <h1 id="home-hero-title">
            Know who you&apos;re working with{" "}
            <span className="hero-highlight hero-highlight--emphasis">before you commit.</span>
          </h1>
          <p className="hero-lede">
            One question:{" "}
            <strong className="hero-lede-quote">
              &ldquo;Would you work with them again?&rdquo;
            </strong>
            <span className="hero-lede-rest">
              Public ledger — no star ratings, no long reviews.
            </span>
          </p>
          <p className="hero-trust-line">
            GitHub or LinkedIn sign-in · Transparency page · One vote per person,
            per professional
          </p>
          <div className="hero-actions">
            <Link href="/submit" className="btn btn-primary">
              Share Your Experience
            </Link>
            <Link href="/profiles" className="btn btn-secondary">
              Look Up Someone
            </Link>
          </div>
        </header>

        <div
          className="home-how-block"
          aria-labelledby="home-how-heading"
        >
          <h2 id="home-how-heading" className="home-how-title">
            How does it work?
          </h2>
          <p className="home-how-sub">Three steps. No subscription or fees.</p>
          <ol className="home-steps-compact" role="list">
            <li>
              <span className="home-step-num">1</span>
              <strong className="home-step-label">Share</strong>
              <span className="home-step-desc">
                Paste a LinkedIn URL; answer the one question (optional reason).
              </span>
            </li>
            <li>
              <span className="home-step-num">2</span>
              <strong className="home-step-label">Public record</strong>
              <span className="home-step-desc">
                Stored in the open audit trail. No edits after submit.
              </span>
            </li>
            <li>
              <span className="home-step-num">3</span>
              <strong className="home-step-label">Look up</strong>
              <span className="home-step-desc">
                Check vouches and flags before you hire, partner, or join.
              </span>
            </li>
          </ol>
        </div>

        <aside className="karma-box karma-box--fold" aria-label="Voting rules">
          <span className="karma-icon" aria-hidden>
            ⚖️
          </span>
          <div>
            <h3>Positivity comes first</h3>
            <p>
              Your first contribution must be a positive vouch. After that, each
              vouch earns one flag credit; each flag uses one credit.
            </p>
          </div>
        </aside>
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
