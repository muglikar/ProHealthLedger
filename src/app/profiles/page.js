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

  const formatName = (slug) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <div className="page-header">
        <h1>Look Up a Professional</h1>
        <p>Search by name to see what the community says about them.</p>
      </div>

      <input
        type="text"
        className="search-bar"
        placeholder="Type a name to search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>
            {search ? "No one matches that search" : "No profiles yet"}
          </h3>
          <p>
            {search
              ? "Try a different name or spelling."
              : "Be the first to share your experience and add someone to the ledger."}
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
                <div className="profile-slug">{formatName(profile.slug)}</div>
                <div className="profile-url">
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View LinkedIn Profile →
                  </a>
                </div>
                <div className="vote-counts">
                  <span className="vote-badge vote-yes">
                    ✓ {profile.votes.yes} would work with again
                  </span>
                  <span className="vote-badge vote-no">
                    ✗ {profile.votes.no} would not
                  </span>
                </div>
                <div className="submission-count">
                  {profile.submissions.length} vote
                  {profile.submissions.length !== 1 ? "s" : ""} from the
                  community
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
