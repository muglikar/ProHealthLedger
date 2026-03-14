"use client";

import { useState, useEffect } from "react";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((res) => res.json())
      .then((data) => {
        setProfiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = profiles.filter(
    (p) =>
      p.slug.includes(search.toLowerCase()) ||
      p.linkedin_url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h1>Verified Profiles</h1>
        <p>Browse community-verified professionals on the ledger.</p>
      </div>

      <input
        type="text"
        className="search-bar"
        placeholder="Search by name or LinkedIn URL…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="empty-state">
          <p>Loading profiles…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No profiles yet</h3>
          <p>
            {search
              ? "No profiles match your search."
              : "Be the first to submit a vote and add a professional to the ledger."}
          </p>
        </div>
      ) : (
        <div className="profile-grid">
          {filtered
            .sort(
              (a, b) =>
                b.votes.yes + b.votes.no - (a.votes.yes + a.votes.no)
            )
            .map((profile) => (
              <div key={profile.slug} className="profile-card">
                <div className="profile-slug">{profile.slug}</div>
                <div className="profile-url">
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.linkedin_url}
                  </a>
                </div>
                <div className="vote-counts">
                  <span className="vote-badge vote-yes">
                    ✓ {profile.votes.yes} Yes
                  </span>
                  <span className="vote-badge vote-no">
                    ✗ {profile.votes.no} No
                  </span>
                </div>
                <div className="submission-count">
                  {profile.submissions.length} total submission
                  {profile.submissions.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
