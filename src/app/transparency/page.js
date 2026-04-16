"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

const SITE_URL = "https://pro-health-ledger.vercel.app";

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

function buildShareText(displayName, profileSlug) {
  const profileLink = `${SITE_URL}/profiles?search=${encodeURIComponent(profileSlug)}`;
  const submitLink = `${SITE_URL}/submit`;
  return (
    `Hey, I have vouched / positively reviewed you ${displayName} on Pro-Health Ledger. ` +
    `Please check out and share your experiences too.\n\n` +
    `See their profile: ${profileLink}\n` +
    `Share your experience: ${submitLink}`
  );
}

function ShareModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  const displayName = formatProfessionalDisplayName(
    data.profile_slug,
    data.public_name
  );
  const shareText = buildShareText(displayName, data.profile_slug);
  const profileUrl = `${SITE_URL}/profiles?search=${encodeURIComponent(data.profile_slug)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [shareText]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div className="share-modal" role="dialog" aria-modal="true" aria-label="Share vouch on LinkedIn">
        <div className="share-modal-header">
          <h3>Share this vouch on LinkedIn</h3>
          <button
            type="button"
            className="share-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="share-modal-body">
          <p className="share-modal-hint">
            Copy the text below, then click &ldquo;Open LinkedIn&rdquo; to share.
            Paste the copied text into your LinkedIn post.
          </p>
          <div className="share-modal-text">{shareText}</div>
          <div className="share-modal-links">
            <span className="share-modal-link-label">Profile link:</span>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              {profileUrl}
            </a>
          </div>
        </div>
        <div className="share-modal-actions">
          <button
            type="button"
            className="btn-copy-share"
            onClick={handleCopy}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            {copied ? "Copied!" : "Copy Text"}
          </button>
          <a
            href={linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-linkedin-open"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Open LinkedIn
          </a>
        </div>
      </div>
    </>
  );
}

export default function TransparencyPage() {
  const { data: session } = useSession();
  const currentUserId = session?.userId || "";
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("flags");
  const [shareModalData, setShareModalData] = useState(null);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const tableWrapRef = useRef(null);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const check = () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setScrolledEnd(atEnd);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [loading]);

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
              <span className="audit-sort-btn-long">Most flags on profile</span>
              <span className="audit-sort-btn-short">Most flags</span>
            </button>
            <button
              type="button"
              className={`audit-sort-btn${sortMode === "vouches" ? " is-active" : ""}`}
              onClick={() => setSortMode("vouches")}
              aria-pressed={sortMode === "vouches"}
            >
              <span className="audit-sort-btn-long">Most vouches on profile</span>
              <span className="audit-sort-btn-short">Most vouches</span>
            </button>
            <button
              type="button"
              className={`audit-sort-btn${sortMode === "date" ? " is-active" : ""}`}
              onClick={() => setSortMode("date")}
              aria-pressed={sortMode === "date"}
            >
              <span className="audit-sort-btn-long">Newest by date</span>
              <span className="audit-sort-btn-short">By date</span>
            </button>
          </div>
          <p className="audit-table-hint">
            Scroll the table horizontally to see every column, including comments.
          </p>
          <div className={`audit-table-outer${scrolledEnd ? " scrolled-end" : ""}`}>
          <div className="audit-table-wrap" ref={tableWrapRef}>
            <table className="audit-table">
              <thead>
                <tr>
                  <th className="audit-col-prof">Professional</th>
                  <th className="audit-col-vote">Would work with again?</th>
                  <th className="audit-col-share">Share</th>
                  <th className="audit-table-col-comment">Comment</th>
                  <th>Submitted By</th>
                  <th>Record</th>
                  <th>Date</th>
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
                    <td className="audit-col-prof">
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
                        {v.vote === "yes" ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="audit-col-share">
                      {v.vote === "yes" && currentUserId && currentUserId === v.user ? (
                        <button
                          type="button"
                          className="share-linkedin-btn"
                          title="Share this vouch on LinkedIn"
                          onClick={() => setShareModalData(v)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </button>
                      ) : null}
                    </td>
                    <td className="audit-table-col-comment">{commentCell(v)}</td>
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
                    <td>{v.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}

      {shareModalData && (
        <ShareModal
          data={shareModalData}
          onClose={() => setShareModalData(null)}
        />
      )}
    </>
  );
}
