"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import CommentReadModal from "@/app/components/CommentReadModal";
import ShareVouchModal from "@/app/components/ShareVouchModal";
import { trackEvent } from "@/lib/telemetry";

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

function submitterPlain(submission) {
  const userId = submission.user || submission.github_username || "";
  if (!userId) return "—";
  return (
    submission.display_name ||
    (userId.startsWith("github:") ? userId.slice(7) : userId)
  );
}

function voterDisplay(submission) {
  const userId = submission.user || submission.github_username || "";
  if (!userId) return <span>—</span>;
  const label = submitterPlain(submission);
  const submitterLinkedinUrl =
    typeof submission.submitter_linkedin_url === "string"
      ? submission.submitter_linkedin_url
      : "";
  if (submitterLinkedinUrl) {
    return (
      <a href={submitterLinkedinUrl} target="_blank" rel="noopener noreferrer" className="issue-link">
        {label}
      </a>
    );
  }
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

function ProfilesContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const initialSearch = searchParams.get("search") || params?.slug || "";
  const { data: session } = useSession();
  const currentUserId = session?.userId || "";
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [shareModalData, setShareModalData] = useState(null);
  const [commentPopup, setCommentPopup] = useState(null);

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

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => {
      trackEvent("profile_search", { query });
    }, 1500); // 1.5s debounce to avoid noise while typing
    return () => clearTimeout(timer);
  }, [query]);

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

  function profileCommentCell(profile, submission) {
    if (submission.reason_pending) {
      return <span className="audit-comment-pending">Pending review</span>;
    }
    if (submission.reason_redacted) {
      const date = (submission.redacted_at || "").slice(0, 10) || "unknown date";
      const cat = submission.redaction_category || "miscellaneous";
      return (
        <span
          className="audit-comment-redacted"
          title={`Redacted by moderator on ${date} — category: ${cat}. Original kept in private redactions store; public hash ${submission.reason_hash || "n/a"}.`}
        >
          [redacted by moderator on {date} — {cat}]
        </span>
      );
    }
    const raw = String(submission.reason || submission.comment || "").trim();
    if (!raw) return <span className="audit-comment-empty">—</span>;
    const profName = formatProfessionalDisplayName(profile.slug, profile.public_name);
    return (
      <button
        type="button"
        className="audit-comment-link"
        title={raw}
        aria-label={`Open full vote row and comment for ${profName}`}
        onClick={() =>
          setCommentPopup({
            text: raw,
            professional: profName,
            vote: submission.vote,
            submittedBy: submitterPlain(submission),
            date: submission.date || "—",
            issue: submission.issue,
            recordHref:
              submission.issue != null
                ? `${REPO_BASE}/issues/${submission.issue}`
                : null,
            linkedinUrl: profile.linkedin_url || null,
          })
        }
      >
        {raw}
      </button>
    );
  }

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
              const myYesVouch = deduped
                .filter(
                  (s) =>
                    s.vote === "yes" &&
                    currentUserId &&
                    currentUserId === s.user
                )
                .sort(
                  (a, b) =>
                    (Number(b.issue) || 0) - (Number(a.issue) || 0) ||
                    String(b.date || "").localeCompare(String(a.date || ""))
                )[0];
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
                              <td className="profile-vouch-comment">
                                {profileCommentCell(profile, s)}
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
                  <div className="profile-experience-cta">
                    <p className="profile-experience-cta-text">
                      Add your own honest vote to the public ledger.
                    </p>
                    {myYesVouch ? (
                      <p className="profile-experience-cta-sub">
                        You vouched here — share on LinkedIn using this profile&apos;s public ledger link
                        (not the homepage).
                      </p>
                    ) : null}
                    <div
                      className={
                        myYesVouch
                          ? "profile-experience-cta-actions profile-experience-cta-actions--pair"
                          : "profile-experience-cta-actions"
                      }
                    >
                      <Link href="/submit" className="btn btn-primary profile-experience-cta-btn">
                        Share your experience
                      </Link>
                      {myYesVouch ? (
                        <button
                          type="button"
                          className="btn profile-experience-linkedin-btn"
                          title="Share this vouch on LinkedIn"
                          onClick={() =>
                            setShareModalData({
                              ...myYesVouch,
                              profile_slug: profile.slug,
                              public_name: profile.public_name,
                              linkedin_url: profile.linkedin_url,
                              _firstPerson: false,
                            })
                          }
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          Copy and post to LinkedIn
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {shareModalData && (
        <ShareVouchModal
          data={shareModalData}
          onClose={() => setShareModalData(null)}
          firstPerson={!!shareModalData._firstPerson}
        />
      )}

      {commentPopup && (
        <CommentReadModal
          professional={commentPopup.professional}
          vote={commentPopup.vote}
          submittedBy={commentPopup.submittedBy}
          date={commentPopup.date}
          issue={commentPopup.issue}
          recordHref={commentPopup.recordHref}
          linkedinUrl={commentPopup.linkedinUrl}
          text={commentPopup.text}
          onClose={() => setCommentPopup(null)}
        />
      )}
    </>
  );
}

export default function ProfilesClient() {
  return (
    <Suspense fallback={<div className="empty-state"><p>Loading…</p></div>}>
      <ProfilesContent />
    </Suspense>
  );
}
