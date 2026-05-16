import Link from "next/link";
import SupportSection from "./components/SupportSection";

const siteUrl = "https://prohealthledger.org";
const OG_IMAGE = `${siteUrl}/og_banner.png`;

/** Homepage-only link preview art (root layout intentionally omits default og:image). */
export const metadata = {
  openGraph: {
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 627,
        alt: "ProHealthLedger — Know who you are working with before you commit.",
      },
    ],
  },
  twitter: {
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 627,
        alt: "ProHealthLedger — Know who you are working with before you commit.",
      },
    ],
  },
};

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
            GitHub or LinkedIn sign-in · Full transparency page · One voice per
            person, per professional — no duplicates
          </p>
          <div className="hero-actions">
            <Link href="/submit" className="btn btn-primary">
              Share Your Experience
            </Link>
            <Link href="/profiles" className="btn btn-secondary">
              Look Up Someone
            </Link>
          </div>

          <div className="trust-bar">
            <a
              href="https://github.com/muglikar/ProHealthLedger"
              target="_blank"
              rel="noopener noreferrer"
              className="trust-link"
            >
              <span aria-hidden="true">🔓</span> Open Source
            </a>
            <span className="trust-sep">·</span>
            <Link href="/transparency" className="trust-link">
              <span aria-hidden="true">🔍</span> Full Audit Trail
            </Link>
            <span className="trust-sep">·</span>
            <Link href="/privacy" className="trust-link">
              <span aria-hidden="true">🛡️</span> Privacy Policy
            </Link>
            <span className="trust-sep">·</span>
            <a
              href="https://StomatoBot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="trust-link"
            >
              <span aria-hidden="true">⭐</span> Powered by StomatoBot
            </a>
          </div>
        </header>

        <div
          className="home-how-block"
          aria-labelledby="home-how-heading"
        >
          <h2 id="home-how-heading" className="home-how-title">
            How does it work?
          </h2>
          <p className="home-how-sub">Three steps. Supported by professional sponsorship tiers.</p>
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

      <aside className="speak-up-box" aria-label="Your rights">
        <span className="speak-up-icon" aria-hidden>
          🛡️
        </span>
        <div className="speak-up-body">
          <h3>It&apos;s safe to speak up.</h3>
          <p>
            &ldquo;Would I work with them again?&rdquo; — only you can answer
            that. Your honest yes-or-no is a personal opinion, not a factual
            allegation, and good-faith opinions for public good are protected
            expression under law. Every reason or comment submission is reviewed
            by a moderator before publishing.
          </p>
          <p className="speak-up-disclaimer">
            This is not legal advice. Laws vary by jurisdiction; consult a
            qualified lawyer if you have specific concerns.
          </p>
        </div>
      </aside>

      <section className="why-section">
        <h2 className="section-title">Why does this exist?</h2>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-card-icon" style={{ fontSize: "2rem", marginBottom: "12px" }}>🔗</div>
            <h3>References are broken</h3>
            <p>
              Traditional references are curated — people only list contacts
              who&apos;ll say nice things. This gives the full, unfiltered
              picture.
            </p>
          </div>
          <div className="why-card">
            <div className="why-card-icon" style={{ fontSize: "2rem", marginBottom: "12px" }}>🎒</div>
            <h3>Reputation should be portable</h3>
            <p>
              Your professional track record shouldn&apos;t vanish when you
              leave a company. It belongs to you — and to the people
              considering working with you.
            </p>
          </div>
          <div className="why-card">
            <div className="why-card-icon" style={{ fontSize: "2rem", marginBottom: "12px" }}>👁️</div>
            <h3>Transparency protects everyone</h3>
            <p>
              When professional conduct is publicly visible, it creates
              accountability. Good actors are recognized. Bad patterns become
              visible.
            </p>
          </div>
        </div>
      </section>
      <SupportSection />
    </>
  );
}
