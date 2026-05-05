"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("links"); // "links" or "recruits"
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState("");
  const [mounted, setMounted] = useState(false);

  const fetchReferrals = useCallback(() => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReferrals();
    }
  }, [status, fetchReferrals]);

  if (!mounted || status === "loading") {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }

  const handleCreateGeneralReferral = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileSlug: "__home__",
          profileName: "ProHealthLedger Homepage",
        }),
      });
      if (!res.ok) throw new Error("Failed to create link");
      fetchReferrals();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const generalReferral = referrals.find((r) => r.profile_slug === "__home__");

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

  // Aggregate unique recruits
  const recruitsMap = new Map();
  for (const r of referrals) {
    if (Array.isArray(r.signups)) {
      r.signups.forEach((id, idx) => {
        if (!recruitsMap.has(id)) {
          recruitsMap.set(id, {
            id,
            name: r.signup_names?.[idx] || id,
            source: r.profile_name || r.profile_slug,
            date: r.created_at,
          });
        }
      });
    }
  }
  const recruitsList = Array.from(recruitsMap.values());

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

      <div className="referral-tabs">
        <button
          className={`tab-btn ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          Referral Links
        </button>
        <button
          className={`tab-btn ${activeTab === "recruits" ? "active" : ""}`}
          onClick={() => setActiveTab("recruits")}
        >
          My Recruits ({recruitsList.length})
        </button>
      </div>

      {activeTab === "links" && (
        <div className="general-ref-card" style={{ marginBottom: "24px", padding: "20px", background: "var(--accent-bg)", borderRadius: "var(--radius)", border: "1px solid var(--accent-border)" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--accent)" }}>Share ProHealthLedger</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Use this general link to share the homepage. Any signups will be attributed to your scientific track record.
          </p>
          {generalReferral ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                readOnly
                value={origin ? `${origin}/?ref=${generalReferral.ref_code}` : "Loading link..."}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-card)", fontSize: "0.9rem" }}
                onClick={(e) => e.target.select()}
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  if (!origin) return;
                  navigator.clipboard.writeText(`${origin}/?ref=${generalReferral.ref_code}`);
                  alert("Copied to clipboard!");
                }}
              >
                Copy Link
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={handleCreateGeneralReferral}
              disabled={creating}
            >
              {creating ? "Generating..." : "Generate My General Referral Link"}
            </button>
          )}
        </div>
      )}

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
      ) : activeTab === "links" ? (
        referrals.length === 0 ? (
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
                  <tr key={r.ref_code} style={r.profile_slug === "__home__" ? { background: "rgba(0, 119, 181, 0.05)" } : {}}>
                    <td className="referral-profile-name">
                      {r.profile_slug === "__home__" ? (
                        <strong>✨ General Platform Link</strong>
                      ) : (
                        r.profile_name || r.profile_slug
                      )}
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
        )
      ) : (
        /* Recruits View */
        <div className="recruits-view">
          {recruitsList.length === 0 ? (
            <div className="empty-state">
              <p>No recruits yet. Your impact starts here—share your first link!</p>
            </div>
          ) : (
            <div className="recruit-grid">
              {recruitsList.map((recruit) => (
                <div key={recruit.id} className="recruit-card">
                  <div className="recruit-avatar">
                    {recruit.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="recruit-info">
                    <div className="recruit-name">{recruit.name}</div>
                    <div className="recruit-meta">
                      Joined via <span className="recruit-source">{recruit.source}</span>
                    </div>
                    <div className="recruit-meta">ID: {recruit.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
