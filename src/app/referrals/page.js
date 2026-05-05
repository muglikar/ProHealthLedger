"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/referrals")
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setReferrals(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Referral fetch error:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <section className="submit-hero">
        <h1>Your Referral Stats</h1>
        <p>Sign in to view your referral link stats and impact.</p>
        <button className="btn btn-primary" onClick={() => signIn("github")}>
          Sign in with GitHub
        </button>
      </section>
    );
  }

  const totalClicks = referrals.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalSignups = referrals.reduce(
    (s, r) => s + (r.signups?.length || 0),
    0
  );

  return (
    <>
      <section className="submit-hero">
        <h1>Your Referral Stats</h1>
        <p>
          Track the impact of your LinkedIn shares. Every click and signup is
          attributed to your unique referral links.
        </p>
      </section>

      <div className="referral-summary">
        <div className="referral-stat-card">
          <span className="referral-stat-number">{referrals.length}</span>
          <span className="referral-stat-label">Links shared</span>
        </div>
        <div className="referral-stat-card">
          <span className="referral-stat-number">{totalClicks}</span>
          <span className="referral-stat-label">Total clicks</span>
        </div>
        <div className="referral-stat-card">
          <span className="referral-stat-number">{totalSignups}</span>
          <span className="referral-stat-label">Signups attributed</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading referral data…</p>
        </div>
      ) : error ? (
        <div className="empty-state error-state">
          <p style={{ color: "var(--red)" }}>Error loading referrals: {error}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      ) : referrals.length === 0 ? (
        <div className="empty-state">
          <p>
            No referral links yet. Submit a positive vouch and share it on
            LinkedIn to get started!
          </p>
          <Link href="/submit" className="btn btn-primary">
            Submit a Vouch
          </Link>
        </div>
      ) : (
        <div className="referral-table-wrap">
          <table className="referral-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Ref Code</th>
                <th>Created</th>
                <th>Clicks</th>
                <th>Signups</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.ref_code}>
                  <td className="referral-profile-name">
                    {r.profile_name || r.profile_slug}
                  </td>
                  <td>
                    <code className="ref-code">{r.ref_code}</code>
                  </td>
                  <td>{r.created_at}</td>
                  <td className="referral-num">{r.clicks || 0}</td>
                  <td className="referral-num">
                    <div className="signup-count">{r.signups?.length || 0}</div>
                    {r.signup_names && r.signup_names.length > 0 && (
                      <div className="signup-names" title={r.signup_names.join(", ")}>
                        {r.signup_names.join(", ")}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
