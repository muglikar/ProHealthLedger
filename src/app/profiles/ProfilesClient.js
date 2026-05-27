"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import CommentReadModal from "@/app/components/CommentReadModal";
import ShareVouchModal from "@/app/components/ShareVouchModal";
import CiteVouchModal from "@/app/components/CiteVouchModal";
import VerificationBadgeModal from "@/app/components/VerificationBadgeModal";
import SupportSection from "@/app/components/SupportSection";
import ProfilePhoto from "@/app/components/ProfilePhoto";
import { trackEvent } from "@/lib/telemetry";

const REPO_BASE = "https://github.com/muglikar/ProHealthLedger";

/* ── Dedup helpers ── */

function parseVoteDate(d) {
  if (!d || typeof d !== "string") return 0;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
}

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

/* ── Main component ── */

function VotesContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const initialSearch = searchParams.get("search") || params?.slug || "";
  const { data: session } = useSession();
  const currentUserId = session?.userId || "";

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [sortMode, setSortMode] = useState("flags");
  const [shareModalData, setShareModalData] = useState(null);
  const [commentPopup, setCommentPopup] = useState(null);
  const [citeModalData, setCiteModalData] = useState(null);
  const [badgeModalData, setBadgeModalData] = useState(null);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [userProfileMap, setUserProfileMap] = useState({});

  const tableWrapRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  /* Profile claim for 1st-person vouch sharing */
  const [myLinkedSlug, setMyLinkedSlug] = useState("");
  useEffect(() => {
    if (session?.linkedinVanity) {
      setMyLinkedSlug(session.linkedinVanity);
      try { localStorage.setItem("phl_my_slug", session.linkedinVanity); } catch {}
    } else {
      try { setMyLinkedSlug(localStorage.getItem("phl_my_slug") || ""); } catch {}
    }
  }, [session?.linkedinVanity]);

  const linkMyProfile = useCallback(() => {
    const url = window.prompt(
      "To share vouches received about you, paste your LinkedIn profile URL:\n\nExample: https://www.linkedin.com/in/your-name"
    );
    if (!url) return;
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const slug = match[1].toLowerCase();
      localStorage.setItem("phl_my_slug", slug);
      setMyLinkedSlug(slug);
    } else {
      alert("That doesn't look like a valid LinkedIn profile URL.");
    }
  }, []);

  /* ── Custom scrollbar ── */

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

  /* ── Fetch ── */

  useEffect(() => {
    fetch("/api/profiles")
      .then((res) => res.json())
      .then((data) => {
        const profilesList = Array.isArray(data) ? data : [];
        setProfiles(profilesList);
        const upMap = {};
        profilesList.forEach((p) => {
          if (p.submissions) {
            p.submissions.forEach((s) => {
              if (s.user && s.submitter_linkedin_url) {
                upMap[s.user] = s.submitter_linkedin_url;
              }
            });
          }
        });
        setUserProfileMap(upMap);
        setLoading(false);
      })
      .catch(() => {
        setProfiles([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!search) return;
    const timer = setTimeout(() => {
      trackEvent("profile_search", { query: search });
    }, 1500);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Search ── */

  const normalizeQuery = (q) => {
    const lower = q.toLowerCase().trim();
    const slugMatch = lower.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    return slugMatch ? slugMatch[1].toLowerCase() : lower;
  };

  const query = normalizeQuery(search);

  /* ── Derived data ── */

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
            profile_photo_url: p.profile_photo_url,
          }));
        })
      ),
    [profiles]
  );

  /* Filter by search */
  const filteredVotes = useMemo(() => {
    if (!query) return dedupedVotes;
    return dedupedVotes.filter((v) => {
      const slug = v.profile_slug || "";
      const pub = (v.public_name || "").toLowerCase();
      const display = formatProfessionalDisplayName(slug, v.public_name).toLowerCase();
      const rawUrl = (v.linkedin_url || "").toLowerCase();
      const urlSlug = rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || "";
      return (
        slug.includes(query) ||
        urlSlug.includes(query) ||
        display.includes(query) ||
        pub.includes(query)
      );
    });
  }, [dedupedVotes, query]);

  /* Sort */
  const sortedVotes = useMemo(() => {
    const copy = [...filteredVotes];
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
  }, [filteredVotes, sortMode, slugToFlagCount, slugToVouchCount]);

  /* ── Profile context panel (when search narrows to one professional) ── */

  const matchedProfile = useMemo(() => {
    if (!query) return null;
    const matchedSlugs = new Set(sortedVotes.map((v) => v.profile_slug));
    if (matchedSlugs.size !== 1) return null;
    const slug = [...matchedSlugs][0];
    return profiles.find((p) => p.slug === slug) || null;
  }, [query, sortedVotes, profiles]);

  /* ── Helpers ── */

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

    const linkedinUrl =
      (typeof submission.submitter_linkedin_url === "string" && submission.submitter_linkedin_url) ||
      (userId.replace("github:", "") === "muglikar" ? "https://www.linkedin.com/in/muglikar" : null) ||
      userProfileMap[userId];

    if (linkedinUrl) {
      return (
        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="user-link">
          {label}
        </a>
      );
    }
    if (userId.startsWith("github:")) {
      const gh = userId.slice(7);
      return (
        <a href={`https://github.com/${gh}`} target="_blank" rel="noopener noreferrer" className="user-link">
          {label}
        </a>
      );
    }
    if (userId.startsWith("linkedin:")) {
      const sub = userId.split(":")[1];
      const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(sub)}`;
      return (
        <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="user-link">
          {label}
        </a>
      );
    }
    return <span>{label}</span>;
  }

  function commentCell(row) {
    if (row.reason_pending) {
      return <span className="audit-comment-pending">Pending review</span>;
    }
    if (row.reason_redacted) {
      const date = (row.redacted_at || "").slice(0, 10) || "unknown date";
      const cat = row.redaction_category || "miscellaneous";
      return (
        <span
          className="audit-comment-redacted"
          title={`Redacted by moderator on ${date} — category: ${cat}. Original kept in private redactions store; public hash ${row.reason_hash || "n/a"}.`}
        >
          [redacted by moderator on {date} — {cat}]
        </span>
      );
    }
    const raw = typeof row.reason === "string" ? row.reason.trim() : "";
    if (!raw) return <span className="audit-comment-empty">—</span>;
    const profName = formatProfessionalDisplayName(row.profile_slug, row.public_name);
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
            vote: row.vote,
            submittedBy: submitterPlain(row),
            date: row.date || "—",
            issue: row.issue,
            recordHref: row.issue != null ? `${REPO_BASE}/issues/${row.issue}` : null,
            linkedinUrl: row.linkedin_url || null,
            profilePhotoUrl: row.profile_photo_url || null,
            profileSlug: row.profile_slug || null,
            submitterCapacity: row.submitter_capacity || null,
            votedCapacity: row.voted_capacity || null,
          })
        }
      >
        {raw}
      </button>
    );
  }

  /* ── Render ── */

  return (
    <>
      <div className="page-header">
        <h1>Votes</h1>
        <p className="submit-hero-sub">
          <Link href="/">What the heck is this?</Link>
        </p>
        <p>
          Every vote ever cast on the ledger. Search by name or LinkedIn URL. Comments
          redacted by a moderator are marked as such — never silently removed — and
          recorded in the{" "}
          <a
            href="https://github.com/muglikar/ProHealthLedger/blob/main/data/moderation_log.json"
            target="_blank"
            rel="noopener noreferrer"
          >
            public moderation log
          </a>.
        </p>
      </div>

      <input
        type="text"
        className="search-bar"
        placeholder="Type a name or paste a LinkedIn URL to filter…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : sortedVotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{query ? "🔍" : "📜"}</div>
          <h3>{query ? "No votes match that search" : "No votes recorded yet"}</h3>
          <p>
            {query
              ? "Try a different name or spelling."
              : "Once people start voting, every single vote will appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Profile context panel ── */}
          {matchedProfile && (() => {
            const p = matchedProfile;
            const yesCount = p.votes?.yes ?? 0;
            const noCount = p.votes?.no ?? 0;
            const totalCount = yesCount + noCount;
            const deduped = dedupeVotesByAuditRecord(
              (p.submissions || []).map((s) => ({
                ...s,
                profile_slug: p.slug,
              }))
            );
            const myYesVouch = deduped
              .filter(
                (s) => s.vote === "yes" && currentUserId && currentUserId === s.user
              )
              .sort(
                (a, b) =>
                  (Number(b.issue) || 0) - (Number(a.issue) || 0) ||
                  String(b.date || "").localeCompare(String(a.date || ""))
              )[0];

            return (
              <div className="votes-profile-panel">
                <div className="votes-profile-panel-header" style={{ alignItems: "flex-start" }}>
                  <ProfilePhoto
                    photoUrl={p.profile_photo_url}
                    name={formatProfessionalDisplayName(p.slug, p.public_name)}
                    slug={p.slug}
                    size={84}
                    showFlag={true}
                  />
                  <div className="votes-profile-panel-info">
                    <h2 className="votes-profile-panel-name">
                      {formatProfessionalDisplayName(p.slug, p.public_name)}
                    </h2>
                    <a
                      href={p.linkedin_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="votes-profile-panel-link"
                    >
                      View LinkedIn Profile →
                    </a>
                    <div className="vote-counts" style={{ margin: "8px 0 4px" }}>
                      <span className="vote-badge vote-yes">✓ {yesCount} would work with again</span>
                      <span className="vote-badge vote-no">✗ {noCount} would not work with them again</span>
                    </div>
                    <div className="submission-count" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {totalCount} vote{totalCount !== 1 ? "s" : ""} from the community
                    </div>
                  </div>
                </div>
                
                {yesCount > noCount && (
                  <div className="votes-profile-panel-actions" style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ background: "transparent", border: "none", color: "var(--text-secondary)", padding: "4px", display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                      title="Get Verification Badge"
                      onClick={() => setBadgeModalData(p)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Sort bar (Hidden if searched) ── */}
          {!matchedProfile && (
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
          )}

          {/* ── Vote Cards ── */}
          <div className="votes-cards-container" style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
            {sortedVotes.map((v) => {
              const voteLabel = v.vote === "yes" ? "Yes" : v.vote === "no" ? "No" : v.vote ? String(v.vote) : "—";
              const professionalName = formatProfessionalDisplayName(v.profile_slug, v.public_name);
              const professionalCell = v.linkedin_url ? (
                <a href={v.linkedin_url} target="_blank" rel="noopener noreferrer" className="issue-link">
                  {professionalName || "—"}
                </a>
              ) : (
                professionalName || "—"
              );

              return (
                <div 
                  key={v.issue != null ? `issue-${v.issue}` : `${v.profile_slug}-${v.date}-${v.user}-${v.vote}`}
                  className="comment-read-modal-details" 
                  style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                >
                  <div className="comment-read-modal-row" style={{ alignItems: "center" }}>
                    <span className="comment-read-modal-k">Professional</span>
                    <span className="comment-read-modal-v" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <ProfilePhoto
                        photoUrl={v.profile_photo_url || null}
                        name={professionalName || "?"}
                        slug={v.profile_slug || null}
                        size={44}
                        showFlag={false}
                      />
                      {professionalCell}
                    </span>
                  </div>
                  {v.voted_capacity && (
                    <div className="comment-read-modal-row">
                      <span className="comment-read-modal-k">Their Role &amp; Org</span>
                      <span className="comment-read-modal-v">{v.voted_capacity}</span>
                    </div>
                  )}
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Would work with again?</span>
                    <span className="comment-read-modal-v">
                      {v.vote === "yes" || v.vote === "no" ? (
                        <span className={`vote-pill ${v.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
                          {voteLabel}
                        </span>
                      ) : (
                        voteLabel
                      )}
                    </span>
                  </div>
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Submitted by</span>
                    <span className="comment-read-modal-v">{submitterPlain(v) || "—"}</span>
                  </div>
                  {v.submitter_capacity && (
                    <div className="comment-read-modal-row">
                      <span className="comment-read-modal-k">Voter&apos;s Role &amp; Org</span>
                      <span className="comment-read-modal-v">{v.submitter_capacity}</span>
                    </div>
                  )}
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Date</span>
                    <span className="comment-read-modal-v">{v.date || "—"}</span>
                  </div>
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Record</span>
                    <span className="comment-read-modal-v">
                      {v.issue != null ? (
                        <a href={`${REPO_BASE}/issues/${v.issue}`} target="_blank" rel="noopener noreferrer" className="issue-link">
                          #{v.issue}
                        </a>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <div className="comment-read-modal-comment-section" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                    <h4 className="comment-read-modal-comment-heading" style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#64748b" }}>Comment</h4>
                    <div className="comment-read-modal-body" style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", fontSize: "0.95rem", lineHeight: "1.5" }}>
                      {(() => {
                        if (v.reason_pending) return <span className="audit-comment-pending">Pending review</span>;
                        if (v.reason_redacted) {
                          const date = (v.redacted_at || "").slice(0, 10) || "unknown date";
                          const cat = v.redaction_category || "miscellaneous";
                          return (
                            <span className="audit-comment-redacted" title={`Redacted by moderator on ${date} — category: ${cat}. Original kept in private redactions store; public hash ${v.reason_hash || "n/a"}.`}>
                              [redacted by moderator on {date} — {cat}]
                            </span>
                          );
                        }
                        const raw = typeof v.reason === "string" ? v.reason.trim() : "";
                        return raw || <span className="audit-comment-empty">—</span>;
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Modals ── */}

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
          profilePhotoUrl={commentPopup.profilePhotoUrl}
          profileSlug={commentPopup.profileSlug}
          submitterCapacity={commentPopup.submitterCapacity}
          votedCapacity={commentPopup.votedCapacity}
          text={commentPopup.text}
          onClose={() => setCommentPopup(null)}
        />
      )}

      {citeModalData &&
        (() => {
          const p = citeModalData.profile;
          const rawUrl = typeof p.linkedin_url === "string" ? p.linkedin_url : "";
          const urlSlug =
            rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] ||
            p.slug ||
            p.public_name ||
            "profile";
          return (
            <CiteVouchModal
              vouch={citeModalData.vouch}
              profileSlug={urlSlug}
              publicName={p.public_name}
              onClose={() => setCiteModalData(null)}
            />
          );
        })()}

      {badgeModalData &&
        (() => {
          const p = badgeModalData;
          const rawUrl = typeof p.linkedin_url === "string" ? p.linkedin_url : "";
          const urlSlug =
            rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] ||
            p.slug ||
            p.public_name ||
            "profile";
          return (
            <VerificationBadgeModal
              profileSlug={urlSlug}
              publicName={p.public_name}
              onClose={() => setBadgeModalData(null)}
            />
          );
        })()}

      <SupportSection />
    </>
  );
}

export default function ProfilesClient() {
  return (
    <Suspense fallback={<div className="empty-state"><p>Loading…</p></div>}>
      <VotesContent />
    </Suspense>
  );
}
