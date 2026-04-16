"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatProfessionalDisplayName } from "@/lib/profiles";

function dedupeSubmissions(submissions) {
  if (!Array.isArray(submissions)) return [];
  const map = new Map();
  for (const s of submissions) {
    const key =
      s.issue != null && s.issue !== ""
        ? `issue:${s.issue}`
        : `row:${s.date}:${String(s.user || "")}:${s.vote}`;
    if (!map.has(key)) map.set(key, s);
  }
  return [...map.values()];
}

function countVotes(submissions) {
  const deduped = dedupeSubmissions(submissions);
  let yes = 0;
  let no = 0;
  for (const s of deduped) {
    if (s.vote === "yes") yes++;
    else if (s.vote === "no") no++;
  }
  return { yes, no, total: yes + no };
}

export default function ProfilesPage() {
  return (
    <Suspense fallback={<div className="empty-state"><p>Loading…</p></div>}>
      <ProfilesContent />
    </Suspense>
  );
}

function ProfilesContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState(initialSearch || null);

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
            .sort((a, b) => {
              const va = countVotes(a.submissions);
              const vb = countVotes(b.submissions);
              return vb.total - va.total;
            })
            .map((profile) => {
              const { yes, no, total } = countVotes(profile.submissions);
              const deduped = dedupeSubmissions(profile.submissions);
              const isExpanded = expandedSlug === profile.slug;
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
                    {total} vote
                    {total !== 1 ? "s" : ""} from the community
                    {deduped.length > 0 && (
                      <button
                        type="button"
                        className="profile-toggle-details"
                        onClick={() => setExpandedSlug(isExpanded ? null : profile.slug)}
                      >
                        {isExpanded ? "Hide details ▲" : "View details ▼"}
                      </button>
                    )}
                  </div>
                  {isExpanded && deduped.length > 0 && (
                    <div className="profile-vouch-details">
                      <table className="profile-vouch-table">
                        <thead>
                          <tr>
                            <th>Vote</th>
                            <th>Comment</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deduped.map((s, i) => (
                            <tr key={s.issue != null ? `i-${s.issue}` : `r-${i}`}>
                              <td>
                                <span className={`vote-pill ${s.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
                                  {s.vote === "yes" ? "Yes" : "No"}
                                </span>
                              </td>
                              <td className="profile-vouch-comment">
                                {s.reason || s.comment || "—"}
                              </td>
                              <td>{s.date || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}
