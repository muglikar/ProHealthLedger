"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatProfessionalDisplayName } from "@/lib/profiles";

const SITE_URL = "https://pro-health-ledger.vercel.app";
const REPO_BASE = "https://github.com/muglikar/ProHealthLedger";

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
  const [linkedinPasteStep, setLinkedinPasteStep] = useState(false);
  const pasteKey =
    typeof navigator !== "undefined" &&
    (navigator.platform?.includes("Mac") || /Mac|iPhone|iPad/.test(navigator.userAgent || ""))
      ? "⌘V"
      : "Ctrl+V";

  const displayName = formatProfessionalDisplayName(data.profile_slug, data.public_name);
  const shareText = buildShareText(displayName, data.profile_slug, firstPerson);
  const profileUrl = `${SITE_URL}/profiles?search=${encodeURIComponent(data.profile_slug)}`;
  const linkedinComposerUrl = "https://www.linkedin.com/feed/?shareActive=true";

  useEffect(() => {
    setLinkedinPasteStep(false);
    setCopied(false);
  }, [data]);

  const handlePostToLinkedIn = useCallback(async () => {
    const fullText = shareText + "\n\n" + profileUrl;
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setLinkedinPasteStep(true);
    window.open(linkedinComposerUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setCopied(false), 4000);
  }, [shareText, profileUrl]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div className="share-modal" role="dialog" aria-modal="true" aria-label="Share vouch on LinkedIn">
        <div className="share-modal-header">
          <h3>{firstPerson ? "Share your vouch on LinkedIn" : "Share this vouch on LinkedIn"}</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="share-modal-body">
          <p className="share-modal-hint">
            Your browser cannot paste into LinkedIn for you. We copy everything
            to the clipboard and open LinkedIn — you paste once in the post
            box ({pasteKey}) so the link expands into a large preview card.
          </p>
          {linkedinPasteStep ? (
            <div className="share-modal-paste-steps" role="status">
              <strong>Next — do this in the LinkedIn tab</strong>
              <ol>
                <li>
                  If you see the <strong>Sign in</strong> page, sign in first.
                  Your text stays on the clipboard.
                </li>
                <li>
                  Click <strong>Start a post</strong> (or the post box at the top
                  of the feed).
                </li>
                <li>
                  Press <kbd className="share-modal-kbd">{pasteKey}</kbd> to paste.
                  Wait a moment for the preview card to appear, then post.
                </li>
              </ol>
              <button
                type="button"
                className="share-modal-reopen-linkedin"
                onClick={() => window.open(linkedinComposerUrl, "_blank", "noopener,noreferrer")}
              >
                Open LinkedIn again
              </button>
            </div>
          ) : null}
          <div className="share-modal-text">{shareText}</div>
          <div className="share-modal-links">
            <span className="share-modal-link-label">Profile link (appended when you copy):</span>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">{profileUrl}</a>
          </div>
        </div>
        <div className="share-modal-actions">
          <button type="button" className="btn-linkedin-open" onClick={handlePostToLinkedIn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            {copied ? "Copied — paste in LinkedIn" : "Copy & open LinkedIn"}
          </button>
        </div>
      </div>
    </>
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
      <a href={`https://github.com/${gh}`} target="_blank" rel="noopener noreferrer" className="issue-link">
        {label}
      </a>
    );
  }
  return <span>{label}</span>;
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
  const { data: session } = useSession();
  const currentUserId = session?.userId || "";
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [shareModalData, setShareModalData] = useState(null);

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
    const rawUrl =
      typeof p.linkedin_url === "string" ? p.linkedin_url.toLowerCase() : "";
    const pub =
      typeof p.public_name === "string" ? p.public_name.toLowerCase() : "";
    if (!slug && !rawUrl) return false;
    const urlSlug = rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || "";
    const display = formatProfessionalDisplayName(slug, p.public_name).toLowerCase();
    return (
      slug.includes(query) ||
      urlSlug.includes(query) ||
      display.includes(query) ||
      pub.includes(query)
    );
  });

  return (
    <>
      <div className="page-header">
        <h1>Look Up a Professional</h1>
        <p className="submit-hero-sub">
          <Link href="/">What the heck is this?</Link>
        </p>
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
              return (
                <div key={profile.slug || profile.linkedin_url} className="profile-card">
                  <div className="profile-slug">
                    {formatProfessionalDisplayName(profile.slug, profile.public_name) || "Profile"}
                  </div>
                  <div className="profile-url">
                    <a href={profile.linkedin_url || "#"} target="_blank" rel="noopener noreferrer">
                      View LinkedIn Profile →
                    </a>
                  </div>
                  <div className="vote-counts">
                    <span className="vote-badge vote-yes">✓ {yes} would work with again</span>
                    <span className="vote-badge vote-no">✗ {no} would not</span>
                  </div>
                  <div className="submission-count">
                    {total} vote{total !== 1 ? "s" : ""} from the community
                  </div>
                  {deduped.length > 0 && (
                    <div className="profile-vouch-details">
                      <table className="profile-vouch-table">
                        <thead>
                          <tr>
                            <th className="pvt-col-vote">Would work with again?</th>
                            <th className="pvt-col-share">Share</th>
                            <th className="pvt-col-comment">Comment</th>
                            <th>Submitted By</th>
                            <th>Record</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deduped.map((s, i) => (
                            <tr key={s.issue != null ? `i-${s.issue}` : `r-${i}`}>
                              <td className="pvt-col-vote">
                                <span className={`vote-pill ${s.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
                                  {s.vote === "yes" ? "Yes" : "No"}
                                </span>
                              </td>
                              <td className="pvt-col-share">
                                {s.vote === "yes" && currentUserId && currentUserId === s.user ? (
                                  <button
                                    type="button"
                                    className="share-linkedin-btn"
                                    title="Share this vouch on LinkedIn"
                                    onClick={() => setShareModalData({
                                      ...s,
                                      profile_slug: profile.slug,
                                      public_name: profile.public_name,
                                      _firstPerson: false,
                                    })}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                  </button>
                                ) : <span>—</span>}
                              </td>
                              <td className="profile-vouch-comment">
                                {s.reason_pending
                                  ? <span className="audit-comment-pending">Pending review</span>
                                  : (s.reason || s.comment || "—")}
                              </td>
                              <td>{voterDisplay(s)}</td>
                              <td>
                                {s.issue != null ? (
                                  <a
                                    href={`${REPO_BASE}/issues/${s.issue}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="issue-link"
                                  >
                                    #{s.issue}
                                  </a>
                                ) : "—"}
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
