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

function buildShareText(displayName, profileSlug, firstPerson = false) {
  if (firstPerson) {
    return (
      `I've been vouched for i.e. positively reviewed on Pro-Health Ledger.\n\n` +
      `Please check it out and share your experiences too!`
    );
  }
  return (
    `Hey ${displayName}, I have vouched for you i.e. positively reviewed you on Pro-Health Ledger.\n\n` +
    `Please check it out and share your experiences too!`
  );
}

function ShareModal({ data, onClose, firstPerson = false }) {
  const [copied, setCopied] = useState(false);

  const displayName = formatProfessionalDisplayName(
    data.profile_slug,
    data.public_name
  );
  const shareText = buildShareText(displayName, data.profile_slug, firstPerson);
  const profileUrl = `${SITE_URL}/profiles?search=${encodeURIComponent(data.profile_slug)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

  const handlePostToLinkedIn = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.open(linkedinShareUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setCopied(false), 3000);
  }, [shareText, linkedinShareUrl]);

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
            Clicking &ldquo;Copy &amp; Post to LinkedIn&rdquo; will copy this
            text and open LinkedIn with the profile preview card. Paste the
            text into your post — the preview card provides the link.
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
            className="btn-linkedin-open"
            onClick={handlePostToLinkedIn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            {copied ? "Copied & Opening…" : "Copy & Post to LinkedIn"}
          </button>
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
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  const updateThumb = useCallback(() => {
    const el = tableWrapRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      track.style.display = "none";
      return;
    }
    track.style.display = "";
    const trackW = track.clientWidth;
    const ratio = clientWidth / scrollWidth;
    const thumbW = Math.max(30, Math.round(trackW * ratio));
    const maxLeft = trackW - thumbW;
    const thumbLeft = Math.round((scrollLeft / (scrollWidth - clientWidth)) * maxLeft);
    thumb.style.width = thumbW + "px";
    thumb.style.left = thumbLeft + "px";
    setScrolledEnd(scrollLeft + clientWidth >= scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = tableWrapRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track) return;

    el.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb);
    const raf = requestAnimationFrame(updateThumb);

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onDown = (e) => {
      e.preventDefault();
      dragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      startX = clientX;
      startScrollLeft = el.scrollLeft;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
    };

    const onMove = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = clientX - startX;
      const { scrollWidth, clientWidth } = el;
      const trackW = track.clientWidth;
      const ratio = clientWidth / scrollWidth;
      const thumbW = Math.max(30, Math.round(trackW * ratio));
      const maxThumbLeft = trackW - thumbW;
      const scrollRange = scrollWidth - clientWidth;
      el.scrollLeft = startScrollLeft + (dx / maxThumbLeft) * scrollRange;
    };

    const onUp = () => {
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };

    if (thumb) {
      thumb.addEventListener("mousedown", onDown);
      thumb.addEventListener("touchstart", onDown, { passive: false });
    }

    const onTrackClick = (e) => {
      if (e.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const clickX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const { scrollWidth, clientWidth } = el;
      el.scrollLeft = (clickX / rect.width) * (scrollWidth - clientWidth);
    };
    track.addEventListener("click", onTrackClick);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
      if (thumb) {
        thumb.removeEventListener("mousedown", onDown);
        thumb.removeEventListener("touchstart", onDown);
      }
      track.removeEventListener("click", onTrackClick);
      onUp();
    };
  }, [loading, updateThumb]);

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
    if (submission.reason_pending) {
      return <span className="audit-comment-pending">Pending review</span>;
    }
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
          <div className="audit-scroll-track" ref={trackRef}>
            <span className="audit-scroll-track-label">← drag or tap to scroll →</span>
            <div className="audit-scroll-thumb" ref={thumbRef} />
          </div>
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
                    <td className="audit-col-vote">
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
                          onClick={() => setShareModalData({ ...v, _firstPerson: false })}
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
          firstPerson={!!shareModalData._firstPerson}
        />
      )}
    </>
  );
}
