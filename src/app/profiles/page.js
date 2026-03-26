"use client";

import { useState, useEffect } from "react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((res) => res.json())
      .then((data) => {
        setProfiles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setProfiles([]);
        setLoading(false);
      });
  }, []);

  const normalizeQuery = (q) => {
    const lower = q.toLowerCase().trim();
    const slugMatch = lower.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    return slugMatch ? slugMatch[1].toLowerCase() : lower;
  };

  const query = normalizeQuery(search);

  const filtered = profiles.filter((p) => {
    if (!p || typeof p !== "object") return false;
    const slug = typeof p.slug === "string" ? p.slug : "";
    const url =
      typeof p.linkedin_url === "string" ? p.linkedin_url.toLowerCase() : "";
    const pub =
      typeof p.public_name === "string" ? p.public_name.toLowerCase() : "";
    if (!slug && !url) return false;
    const display = formatProfessionalDisplayName(
      slug,
      p.public_name
    ).toLowerCase();
    return (
      slug.includes(query) ||
      url.includes(query) ||
      display.includes(query) ||
      pub.includes(query)
    );
  });

  return (
    <>
      <div className="page-header">
        <h1>Look Up a Professional</h1>
        <p>Search by name or paste a LinkedIn profile link.</p>
      </div>

      <input
        type="text"
        className="search-bar"
        placeholder="Type a name or paste a LinkedIn URL…"
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
                (b.votes?.yes ?? 0) +
                (b.votes?.no ?? 0) -
                ((a.votes?.yes ?? 0) + (a.votes?.no ?? 0))
            )
            .map((profile) => {
              const yes = profile.votes?.yes ?? 0;
              const no = profile.votes?.no ?? 0;
              const subs = Array.isArray(profile.submissions)
                ? profile.submissions
                : [];
              return (
                <div key={profile.slug || profile.linkedin_url} className="profile-card">
                  <div className="profile-slug">
                    {formatProfessionalDisplayName(
                      profile.slug,
                      profile.public_name
                    ) || "Profile"}
                  </div>
                  <div className="profile-url">
                    <a
                      href={profile.linkedin_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View LinkedIn Profile →
                    </a>
                  </div>
                  <div className="vote-counts">
                    <span className="vote-badge vote-yes">
                      ✓ {yes} would work with again
                    </span>
                    <span className="vote-badge vote-no">
                      ✗ {no} would not
                    </span>
                  </div>
                  <div className="submission-count">
                    {subs.length} vote
                    {subs.length !== 1 ? "s" : ""} from the community
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}
