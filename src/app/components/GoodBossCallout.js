import Link from "next/link";

export default function GoodBossCallout({ variant = "celebrate", style }) {
  if (variant === "accountability") {
    return (
      <aside className="good-boss-callout" aria-label="Accountability matters" style={style}>
        <span className="good-boss-callout-icon" aria-hidden>🛡️</span>
        <div className="good-boss-callout-body">
          <h3>Seen something that needs flagging?</h3>
          <p>
            Your voice matters here too. Help keep our professional ledger honest and accountable. 
            Remember: vouching for great leaders earns you flag credits.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="good-boss-callout" aria-label="Celebrate great leaders" style={style}>
      <span className="good-boss-callout-icon" aria-hidden>🌟</span>
      <div className="good-boss-callout-body">
        <h3>Know a great boss or colleague?</h3>
        <p>
          Vouch for them &mdash; it&apos;s the easiest way to protect great leadership. 
          Your first vouch unlocks all comments for 1 week.
        </p>
        <Link href="/submit" className="btn btn-primary" style={{ marginTop: 12 }}>
          Vouch Now
        </Link>
      </div>
    </aside>
  );
}
