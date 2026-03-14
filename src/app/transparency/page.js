"use client";

import { useState, useEffect } from "react";

export default function TransparencyPage() {
  const [profiles, setProfiles] = useState([]);
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

  const allVotes = profiles
    .flatMap((p) =>
      p.submissions.map((s) => ({
        ...s,
        profile_slug: p.slug,
        linkedin_url: p.linkedin_url,
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatName = (slug) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const repoBase = "https://github.com/muglikar/ProHealthLedger";

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
              {allVotes.map((v, i) => (
                <tr key={i}>
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
                  <td>
                    <a
                      href={`https://github.com/${v.user}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @{v.user}
                    </a>
                  </td>
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
