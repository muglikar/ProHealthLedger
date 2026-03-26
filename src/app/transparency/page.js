"use client";

import { useState, useEffect } from "react";

function formatName(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** One row per GitHub audit issue; JSON can list the same issue twice (e.g. API + legacy Action). */
function preferSubmissionRow(a, b) {
  if (b.display_name && !a.display_name) return b;
  if (a.display_name && !b.display_name) return a;
  const len = (s) => (s?.display_name || "").length;
  if (len(b) > len(a)) return b;
  return a;
}

function dedupeVotesByAuditRecord(votes) {
  const map = new Map();
  for (const v of votes) {
    const key =
      v.issue != null && v.issue !== ""
        ? `issue:${v.issue}`
        : `row:${v.profile_slug}:${v.date}:${String(v.user || "")}:${v.vote}`;
    if (!map.has(key)) {
      map.set(key, v);
    } else {
      map.set(key, preferSubmissionRow(map.get(key), v));
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function TransparencyPage() {
  const [profiles, setProfiles] = useState([]);
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

  const allVotes = dedupeVotesByAuditRecord(
    profiles
      .flatMap((p) => {
        if (!p || !Array.isArray(p.submissions)) return [];
        return p.submissions.map((s) => ({
          ...s,
          profile_slug: p.slug,
          linkedin_url: p.linkedin_url,
        }));
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  );

  const repoBase = "https://github.com/muglikar/ProHealthLedger";

  function voterDisplay(submission) {
    const userId = submission.user || submission.github_username || "";
    if (!userId) return <span>—</span>;
    const label =
      submission.display_name ||
      (userId.startsWith("github:") ? userId.slice(7) : userId);
    if (userId.startsWith("github:")) {
      const gh = userId.slice(7);
      return (
        <a
          href={`https://github.com/${gh}`}
          target="_blank"
          rel="noopener noreferrer"
          className="issue-link"
        >
          {label}
        </a>
      );
    }
    return <span>{label}</span>;
  }

  return (
    <>
      <div className="page-header">
        <h1>Full Transparency — Every Vote</h1>
        <p>
          Every vote ever cast on the ledger is listed here. Nothing is
          hidden, nothing is edited. This is the complete, unfiltered public
          record.
        </p>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : allVotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <h3>No votes recorded yet</h3>
          <p>Once people start voting, every single vote will appear here.</p>
        </div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Professional</th>
                <th>Vote</th>
                <th>Submitted By</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {allVotes.map((v) => (
                <tr
                  key={
                    v.issue != null
                      ? `issue-${v.issue}`
                      : `${v.profile_slug}-${v.date}-${v.user}-${v.vote}`
                  }
                >
                  <td>{v.date}</td>
                  <td>
                    <a
                      href={v.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {formatName(v.profile_slug)}
                    </a>
                  </td>
                  <td>
                    <span
                      className={`vote-pill ${v.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}
                    >
                      {v.vote === "yes"
                        ? "Would work with again"
                        : "Would not"}
                    </span>
                  </td>
                  <td>{voterDisplay(v)}</td>
                  <td>
                    <a
                      href={`${repoBase}/issues/${v.issue}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      #{v.issue}
                    </a>
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
