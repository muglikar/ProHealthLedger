"use client";

import { useState, useEffect, useMemo } from "react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

function parseVoteDate(d) {
  if (!d || typeof d !== "string") return 0;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
}

/** One row per GitHub audit issue; JSON can list the same issue twice (e.g. API + legacy Action). */
function preferSubmissionRow(a, b) {
  const ra = a?.reason && String(a.reason).trim();
  const rb = b?.reason && String(b.reason).trim();
  if (rb && !ra) return b;
  if (ra && !rb) return a;
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
  return [...map.values()];
}

function compareByDateThenIssue(a, b) {
  const d = parseVoteDate(b.date) - parseVoteDate(a.date);
  if (d !== 0) return d;
  return (Number(b.issue) || 0) - (Number(a.issue) || 0);
}

export default function TransparencyPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("flags");

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

  const slugToFlagCount = useMemo(() => {
    const m = new Map();
    for (const p of profiles) {
      if (!p?.slug) continue;
      m.set(p.slug, p.votes?.no ?? 0);
    }
    return m;
  }, [profiles]);

  const slugToVouchCount = useMemo(() => {
    const m = new Map();
    for (const p of profiles) {
      if (!p?.slug) continue;
      m.set(p.slug, p.votes?.yes ?? 0);
    }
    return m;
  }, [profiles]);

  const dedupedVotes = useMemo(
    () =>
      dedupeVotesByAuditRecord(
        profiles.flatMap((p) => {
          if (!p || !Array.isArray(p.submissions)) return [];
          return p.submissions.map((s) => ({
            ...s,
            profile_slug: p.slug,
            linkedin_url: p.linkedin_url,
            public_name: p.public_name,
          }));
        })
      ),
    [profiles]
  );

  const sortedVotes = useMemo(() => {
    const copy = [...dedupedVotes];
    if (sortMode === "date") {
      copy.sort(compareByDateThenIssue);
      return copy;
    }
    if (sortMode === "vouches") {
      copy.sort((a, b) => {
        const va = slugToVouchCount.get(a.profile_slug) ?? 0;
        const vb = slugToVouchCount.get(b.profile_slug) ?? 0;
        if (vb !== va) return vb - va;
        return compareByDateThenIssue(a, b);
      });
      return copy;
    }
    copy.sort((a, b) => {
      const fa = slugToFlagCount.get(a.profile_slug) ?? 0;
      const fb = slugToFlagCount.get(b.profile_slug) ?? 0;
      if (fb !== fa) return fb - fa;
      return compareByDateThenIssue(a, b);
    });
    return copy;
  }, [dedupedVotes, sortMode, slugToFlagCount, slugToVouchCount]);

  const repoBase = "https://github.com/muglikar/ProHealthLedger";

  function commentCell(submission) {
    const raw =
      typeof submission.reason === "string" ? submission.reason.trim() : "";
    if (!raw) {
      return <span className="audit-comment-empty">—</span>;
    }
    return (
      <span className="audit-comment" title={raw}>
        {raw}
      </span>
    );
  }

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
      ) : sortedVotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <h3>No votes recorded yet</h3>
          <p>Once people start voting, every single vote will appear here.</p>
        </div>
      ) : (
        <>
          <div className="audit-sort-bar" role="group" aria-label="Sort votes">
            <span className="audit-sort-label">Sort</span>
            <button
              type="button"
              className={`audit-sort-btn${sortMode === "flags" ? " is-active" : ""}`}
              onClick={() => setSortMode("flags")}
              aria-pressed={sortMode === "flags"}
            >
              Most flags on profile
            </button>
            <button
              type="button"
              className={`audit-sort-btn${sortMode === "vouches" ? " is-active" : ""}`}
              onClick={() => setSortMode("vouches")}
              aria-pressed={sortMode === "vouches"}
            >
              Most vouches on profile
            </button>
            <button
              type="button"
              className={`audit-sort-btn${sortMode === "date" ? " is-active" : ""}`}
              onClick={() => setSortMode("date")}
              aria-pressed={sortMode === "date"}
            >
              Newest by date
            </button>
          </div>
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Professional</th>
                  <th>Vote</th>
                  <th>Comment</th>
                  <th>Submitted By</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {sortedVotes.map((v) => (
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
                        {formatProfessionalDisplayName(
                          v.profile_slug,
                          v.public_name
                        )}
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
                    <td className="audit-table-comment">{commentCell(v)}</td>
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
        </>
      )}
    </>
  );
}
