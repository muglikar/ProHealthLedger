import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <span className="hero-badge">Free · Public · Permanent</span>
        <h1>
          Know who you&apos;re working with{" "}
          <span className="hero-highlight">before you commit.</span>
        </h1>
        <p>
          A simple, honest directory where people share one thing: whether
          they&apos;d work with someone again. No long reviews, no star
          ratings — just a clear Yes or No from real professionals.
        </p>
        <div className="hero-actions">
          <Link href="/submit" className="btn btn-primary">
            Share Your Experience
          </Link>
          <Link href="/profiles" className="btn btn-secondary">
            Look Up Someone
          </Link>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How does it work?</h2>
        <p className="section-subtitle">
          Three steps. No sign-up forms, no subscriptions, no hidden fees.
        </p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Share your experience</h3>
            <p>
              Paste someone&apos;s LinkedIn profile link and answer one
              question: &ldquo;Would you work with them again?&rdquo; That&apos;s
              it.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>We record it publicly</h3>
            <p>
              Your answer is permanently saved in a public record that anyone
              can see. No edits, no takebacks — it&apos;s your honest word.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Anyone can look them up</h3>
            <p>
              Before hiring, partnering, or joining a team, check if others
              have vouched for — or flagged — that person.
            </p>
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
