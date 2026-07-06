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
import CommentGateBanner from "@/app/components/CommentGateBanner";
import WatchProfileButton from "@/app/components/WatchProfileButton";
import { trackEvent, trackSearch } from "@/lib/telemetry";

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

function VotesContent({ initialSearchProp, initialProfilesProp }) {
  const searchParams = useSearchParams();
  const params = useParams();
  const initialSearch = initialSearchProp || searchParams.get("search") || params?.slug || "";
  const { data: session, status } = useSession();
  const currentUserId = session?.userId || "";

  const [profiles, setProfiles] = useState(initialProfilesProp || []);
  const [loading, setLoading] = useState(initialProfilesProp ? false : true);
  const [viewCreditActive, setViewCreditActive] = useState(false);
  const [hasVouchedBefore, setHasVouchedBefore] = useState(false);

  const [canViewLinkedin, setCanViewLinkedin] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setViewCreditActive(false);
      setHasVouchedBefore(false);
      setCanViewLinkedin(false);
      return;
    }
    function loadQuota() {
      fetch("/api/my-vote-quota")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setViewCreditActive(!!data.view_credit_active);
            setHasVouchedBefore(data.yes_count >= 1);
            setCanViewLinkedin(data.yes_count >= 1 && data.no_count >= 1);
          }
        })
        .catch(() => {});
    }
    loadQuota();

    window.addEventListener("prohl-vote-recorded", loadQuota);
    return () => {
      window.removeEventListener("prohl-vote-recorded", loadQuota);
    };
  }, [status]);
  const [search, setSearch] = useState(initialSearch);
  const [sortMode, setSortMode] = useState("flags");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode]);
  const [shareModalData, setShareModalData] = useState(null);
  const [commentPopup, setCommentPopup] = useState(null);
  const [citeModalData, setCiteModalData] = useState(null);
  const [badgeModalData, setBadgeModalData] = useState(null);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [userProfileMap, setUserProfileMap] = useState({});
  const [contribPhotoMap, setContribPhotoMap] = useState({});

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


  /* ── Fetch ── */

  useEffect(() => {
    if (status === "loading") return;

    function loadProfiles() {
      if (profiles.length === 0) {
        setLoading(true);
      }
      Promise.all([
        fetch(session ? "/api/profiles?auth=1" : "/api/profiles")
          .then((res) => res.json())
          .catch(() => []),
        fetch("/api/contributor-photos")
          .then((res) => res.json())
          .catch(() => ({})),
      ])
        .then(([profilesData, cpMap]) => {
          const profilesList = Array.isArray(profilesData) ? profilesData : [];
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
          setContribPhotoMap(cpMap || {});
          setLoading(false);
        })
        .catch(() => {
          if (profiles.length === 0) {
            setProfiles([]);
          }
          setLoading(false);
        });
    }

    loadProfiles();

    window.addEventListener("prohl-vote-recorded", loadProfiles);
    return () => {
      window.removeEventListener("prohl-vote-recorded", loadProfiles);
    };
  }, [status, session]);

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
            original_photo_url: p.original_photo_url,
            photo_verified: p.photo_verified,
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


  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.ceil(sortedVotes.length / ITEMS_PER_PAGE);
  const paginatedVotes = sortedVotes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (!search) return;
    const timer = setTimeout(() => {
      trackSearch(search, filteredVotes.length);
    }, 1500);
    return () => clearTimeout(timer);
  }, [search, filteredVotes.length]);

  /* ── Profile context panel (when search narrows to one professional) ── */

  const matchedProfile = useMemo(() => {
    if (!query) return null;
    const matchedSlugs = new Set(sortedVotes.map((v) => v.profile_slug));
    if (matchedSlugs.size !== 1) return null;
    const slug = [...matchedSlugs][0];
    return profiles.find((p) => p.slug === slug) || null;
  }, [query, sortedVotes, profiles]);

  /* ── Custom scrollbar ── */

  const updateThumb = useCallback(() => {
    const el = tableWrapRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    
    // If layout isn't computed yet, skip
    if (clientWidth === 0) return;

    if (scrollWidth <= clientWidth) {
      track.style.display = "none";
      return;
    }
    track.style.display = "flex";
    const trackW = track.clientWidth;
    const ratio = clientWidth / scrollWidth;
    const thumbW = Math.max(30, Math.round(trackW * ratio));
    const maxLeft = trackW - thumbW;
    const scrollRange = scrollWidth - clientWidth;
    const thumbLeft = Math.round((scrollLeft / scrollRange) * maxLeft);
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
    
    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => updateThumb());
      ro.observe(el);
      if (el.firstElementChild) {
        ro.observe(el.firstElementChild);
      }
    } else {
      requestAnimationFrame(updateThumb);
    }
    
    let mo;
    if (window.MutationObserver) {
      mo = new MutationObserver(() => updateThumb());
      mo.observe(el, { childList: true, subtree: true, characterData: true });
    }

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

    // Initial positioning with fallbacks for slow table layouts
    updateThumb();
    const tId1 = setTimeout(updateThumb, 50);
    const tId2 = setTimeout(updateThumb, 300);

    return () => {
      clearTimeout(tId1);
      clearTimeout(tId2);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
      el.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
      if (thumb) {
        thumb.removeEventListener("mousedown", onDown);
        thumb.removeEventListener("touchstart", onDown);
      }
      track.removeEventListener("click", onTrackClick);
      onUp();
    };
  }, [loading, matchedProfile, filteredVotes.length, updateThumb]);

  /* ── Helpers ── */

  function submitterPlain(submission) {
    const userId = submission.user || submission.github_username || "";
    if (!userId) return "—";
    return (
      submission.display_name ||
      (userId.startsWith("github:") ? userId.slice(7) : userId)
    );
  }

  function getContribPhoto(submission) {
    const userId = submission.user || submission.github_username || "";
    const stripped = userId.replace("github:", "").replace("linkedin:", "");
    const nameLower = (submission.display_name || "").trim().toLowerCase();
    return contribPhotoMap[userId] || contribPhotoMap[stripped] || contribPhotoMap[nameLower] || null;
  }

  function voterDisplay(submission) {
    const userId = submission.user || submission.github_username || "";
    if (!userId) return <span>—</span>;
    const label = submitterPlain(submission);
    const photo = getContribPhoto(submission);

    const linkedinUrl =
      (typeof submission.submitter_linkedin_url === "string" && submission.submitter_linkedin_url) ||
      (userId.replace("github:", "") === "muglikar" ? "https://www.linkedin.com/in/muglikar" : null) ||
      userProfileMap[userId];

    const avatar = photo ? (
      <img
        src={photo}
        alt={label}
        style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    ) : null;

    const nameWithAvatar = (linkEl) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {avatar}
        {linkEl}
      </span>
    );

    let phlProfileUrl = null;
    if (linkedinUrl) {
      const match = linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
      if (match) phlProfileUrl = `/profile/${match[1].toLowerCase()}`;
    } else if (userId.startsWith("linkedin:")) {
      const sub = userId.split(":")[1];
      phlProfileUrl = `/profiles?search=${encodeURIComponent(sub)}`;
    } else if (userId.startsWith("github:")) {
      const gh = userId.slice(7);
      phlProfileUrl = `https://github.com/${gh}`;
    }

    const linkedName = phlProfileUrl ? (
      <a href={phlProfileUrl} className="user-link">
        {label}
      </a>
    ) : (
      <span>{label}</span>
    );

    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {nameWithAvatar(linkedName)}
        {linkedinUrl && canViewLinkedin && (
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" title="View LinkedIn Profile" style={{ color: "#0a66c2", fontSize: "0.9rem", display: "inline-flex", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        )}
      </span>
    );
  }

  function commentCell(row) {
    if (row.reason_locked) {
      const profName = formatProfessionalDisplayName(row.profile_slug, row.public_name);
      return (
        <div style={{ display: "flex", alignItems: "center", width: "100%", minWidth: 0, gap: "8px" }}>
          <button
            type="button"
            className="audit-comment-link comment-locked"
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            title="Sign in & vouch to read comments"
            aria-label="Sign in & vouch to read comments"
            onClick={() =>
              setCommentPopup({
                text: "",
                professional: profName,
                vote: row.vote,
                submittedBy: submitterPlain(row),
                date: row.date || "—",
                issue: row.issue,
                recordHref: row.issue != null ? `${REPO_BASE}/issues/${row.issue}` : null,
                linkedinUrl: row.linkedin_url || null,
                profilePhotoUrl: row.profile_photo_url || null,
                originalPhotoUrl: row.original_photo_url || null,
                profileSlug: row.profile_slug || null,
                submitterCapacity: null,
                votedCapacity: null,
                reasonLocked: true,
              })
            }
          >
            <span className="comment-locked-icon">🔒</span>
            <span className="comment-locked-link">Unlock comment</span>
          </button>
        </div>
      );
    }

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

    const isSignedIn = !!session;
    const currentId = (session?.userId || "")
      .replace("github:", "")
      .replace("linkedin:", "");
    const currentName = (session?.user?.name || "").trim().toLowerCase();

    const rawUser = row.user || row.github_username || "";
    const rowUser = rawUser
      .replace("github:", "")
      .replace("linkedin:", "");
    const rowName = (row.display_name || "").trim().toLowerCase();

    const isMySubmission =
      isSignedIn &&
      ((currentId && currentId === rowUser) ||
        (currentName && rowName && currentName === rowName));

    const raw = typeof row.reason === "string" ? row.reason.trim() : "";

    const editLink = (
      <Link
        href={`/submit?linkedin=${encodeURIComponent(row.linkedin_url)}`}
        style={{
          marginLeft: "8px",
          color: "var(--accent)",
          fontSize: "0.75rem",
          textDecoration: "underline",
          whiteSpace: "nowrap"
        }}
      >
        {raw ? "✏️ Edit once" : "✏️ Add once"}
      </Link>
    );

    const editedBadge = row.reason_edited ? (
      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: "6px", fontStyle: "italic" }}>(edited)</span>
    ) : null;

    if (!raw) {
      return (
        <span className="audit-comment-empty">
          —
          {isMySubmission && !row.reason_edited && editLink}
          {isMySubmission && row.reason_edited && editedBadge}
        </span>
      );
    }

    const profName = formatProfessionalDisplayName(row.profile_slug, row.public_name);
    return (
      <div style={{ display: "flex", alignItems: "center", width: "100%", minWidth: 0, gap: "8px" }}>
        <button
          type="button"
          className="audit-comment-link"
          style={{ flex: 1, minWidth: 0 }}
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
              originalPhotoUrl: row.original_photo_url || null,
              profileSlug: row.profile_slug || null,
              submitterCapacity: row.submitter_capacity || null,
              votedCapacity: row.voted_capacity || null,
              reasonLocked: false,
            })
          }
        >
          {raw}
        </button>
        {isMySubmission && !row.reason_edited && (
          <span style={{ flexShrink: 0 }}>{editLink}</span>
        )}
        {isMySubmission && row.reason_edited && (
          <span style={{ flexShrink: 0 }}>{editedBadge}</span>
        )}
      </div>
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
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "8px" }}>
          💡 <strong>Tip:</strong> Click any comment in the table below to view the full text and voter/profile details in a pop-up.
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

      <CommentGateBanner
        session={session}
        viewCreditActive={viewCreditActive}
        hasVouchedBefore={hasVouchedBefore}
      />

      <div className="search-bar-container" style={{ position: "relative" }}>
        <input
          type="text"
          className="search-bar"
          placeholder="Type a name or paste a LinkedIn URL to filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="search-clear-btn"
            title="Clear search"
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : sortedVotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{query ? "🔍" : "📜"}</div>
          <h3>{query ? "No votes match that search" : "No votes recorded yet"}</h3>
          <p>
            {query ? (
              <>
                This profile isn&apos;t on the ledger yet. Be the first to{" "}
                <Link href={`/submit?linkedin=${encodeURIComponent(search.includes("linkedin.com") ? search : "https://www.linkedin.com/in/" + query.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, ""))}`} style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  vouch
                </Link>{" "}
                &mdash; or watch for updates.
              </>
            ) : (
              "Once people start voting, every single vote will appear here."
            )}
          </p>
          {query && (
            <div style={{ marginTop: 16 }}>
              <WatchProfileButton slug={query.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "")} />
            </div>
          )}
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
                    originalPhotoUrl={p.original_photo_url}
                    name={formatProfessionalDisplayName(p.slug, p.public_name)}
                    slug={p.slug}
                    size={84}
                    showFlag={!!session && !matchedProfile.photo_verified}
                  />
                  <div className="votes-profile-panel-info">
                    <h2 className="votes-profile-panel-name" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      {formatProfessionalDisplayName(p.slug, p.public_name)}
                      {yesCount > noCount && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          title="Is this your profile? Claim it with a verification badge."
                          onClick={() => setBadgeModalData(p)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          Get Verification Badge
                        </button>
                      )}
                    </h2>
                    {canViewLinkedin ? (
                      <a
                        href={p.linkedin_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="votes-profile-panel-link"
                      >
                        View LinkedIn Profile →
                      </a>
                    ) : (
                      <div className="votes-profile-panel-link" style={{ color: "var(--text-secondary)", cursor: "not-allowed", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }} title="Sign in and contribute 1 vouch and 1 flag to unlock LinkedIn links">
                        <span>🔒</span> LinkedIn profile locked
                      </div>
                    )}
                    <div className="vote-counts" style={{ margin: "8px 0 4px" }}>
                      <span className="vote-badge vote-yes">✓ {yesCount} would work with again</span>
                      <span className="vote-badge vote-no">✗ {noCount} would not work with them again</span>
                    </div>
                    <div className="submission-count" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      {totalCount} vote{totalCount !== 1 ? "s" : ""} from the community
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                      <WatchProfileButton slug={p.slug} />
                    </div>
                    {(() => {
                      const mySubmission = deduped.find(
                        (s) => currentUserId && currentUserId === s.user
                      );
                      if (!mySubmission) return null;
                      return (
                        <div style={{ marginTop: "12px" }}>
                          {mySubmission.reason_edited ? (
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <span>✏️ Comment edited (limit reached)</span>
                            </span>
                          ) : mySubmission.reason ? (
                            <Link
                              href={`/submit?linkedin=${encodeURIComponent(p.linkedin_url)}`}
                              className="btn btn-secondary"
                              style={{ fontSize: "0.8rem", padding: "6px 12px", display: "inline-flex", alignItems: "center" }}
                            >
                              ✏️ Edit once
                            </Link>
                          ) : (
                            <Link
                              href={`/submit?linkedin=${encodeURIComponent(p.linkedin_url)}`}
                              className="btn btn-secondary"
                              style={{ fontSize: "0.8rem", padding: "6px 12px", display: "inline-flex", alignItems: "center" }}
                            >
                              ✏️ Add once
                            </Link>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Sort bar ── */}
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

          {/* ── Table or Cards ── */}
          {!matchedProfile ? (
            <>
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
                        <th className="audit-table-col-comment">Comment (click to expand)</th>
                        <th>Submitted By</th>
                        <th>Record</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVotes.map((v) => (
                        <tr
                          key={
                            v.issue != null
                              ? `issue-${v.issue}`
                              : `${v.profile_slug}-${v.date}-${v.user}-${v.vote}`
                          }
                        >
                          <td className="audit-col-prof">
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <ProfilePhoto
                                photoUrl={v.profile_photo_url}
                                originalPhotoUrl={v.original_photo_url}
                                name={formatProfessionalDisplayName(v.profile_slug, v.public_name)}
                                slug={v.profile_slug}
                                size={36}
                                showFlag={!!session && !v.photo_verified}
                              />
                              <a
                                href={v.profile_slug ? `/profile/${v.profile_slug}` : "#"}
                                className="target-link"
                              >
                                {formatProfessionalDisplayName(v.profile_slug, v.public_name)}
                              </a>
                            </div>
                          </td>
                          <td className="audit-col-vote">
                            <span
                              className={`vote-pill ${v.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}
                            >
                              {v.vote === "yes" ? "✓ Yes" : "✗ No"}
                            </span>
                          </td>
                          <td className="audit-col-share">
                            {(() => {
                              const isSignedIn = !!session;
                              const currentId = (session?.userId || "")
                                .replace("github:", "")
                                .replace("linkedin:", "");
                              const currentName = (session?.user?.name || "").trim().toLowerCase();
                              const isAdmin =
                                currentId === "muglikar" ||
                                currentName === "anand muglikar";
    
                              const rawUser = v.user || v.github_username || "";
                              const rowUser = rawUser
                                .replace("github:", "")
                                .replace("linkedin:", "");
                              const rowName = (v.display_name || "").trim().toLowerCase();
    
                              const isMySubmission =
                                isSignedIn &&
                                ((currentId && currentId === rowUser) ||
                                  (currentName && rowName && currentName === rowName));
                              const isAboutMe = Boolean(
                                myLinkedSlug && myLinkedSlug === v.profile_slug
                              );
                              const isAboutAdmin =
                                v.profile_slug === "muglikar" &&
                                (currentId === "muglikar" ||
                                  currentName === "anand muglikar");
    
                              const canShare =
                                isSignedIn &&
                                v.vote === "yes" &&
                                (isMySubmission ||
                                  isAboutMe ||
                                  (isAdmin && isAboutAdmin));
    
                              if (!canShare) return null;
    
                              return (
                                <button
                                  type="button"
                                  className="share-linkedin-btn"
                                  title={
                                    isAboutMe || (isAdmin && isAboutAdmin)
                                      ? "Share your vouch on LinkedIn"
                                      : "Share this vouch on LinkedIn"
                                  }
                                  onClick={() =>
                                    setShareModalData({
                                      ...v,
                                      _firstPerson:
                                        isAboutMe || (isAdmin && isAboutAdmin),
                                    })
                                  }
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                  </svg>
                                </button>
                              );
                            })()}
                          </td>
                          <td className="audit-table-col-comment">{commentCell(v)}</td>
                          <td>{voterDisplay(v)}</td>
                          <td>
                            <a
                              href={`${REPO_BASE}/issues/${v.issue}`}
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
          ) : (
            <div className="votes-cards-container" style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
              {paginatedVotes.map((v) => {
                const voteLabel = v.vote === "yes" ? "Yes" : v.vote === "no" ? "No" : v.vote ? String(v.vote) : "—";
                
                return (
                  <div 
                    key={v.issue != null ? `issue-${v.issue}` : `${v.profile_slug}-${v.date}-${v.user}-${v.vote}`}
                    className="comment-read-modal-details" 
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                  >
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
                          if (v.reason_locked) {
                            return (
                              <div style={{ textAlign: "center", padding: "8px 0" }}>
                                <span style={{ fontSize: "1.2rem", display: "block", marginBottom: 4 }} aria-hidden>🔒</span>
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                                  Comments and roles are locked.
                                </p>
                                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                                  <Link href="/submit" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
                                    Sign in &amp; vouch to unlock &rarr;
                                  </Link>
                                </p>
                              </div>
                            );
                          }
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
          )}
        </>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "24px", marginBottom: "40px" }}>
          <button
            className="btn btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
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
          originalPhotoUrl={commentPopup.originalPhotoUrl}
          profileSlug={commentPopup.profileSlug}
          submitterCapacity={commentPopup.submitterCapacity}
          votedCapacity={commentPopup.votedCapacity}
          text={commentPopup.text}
          reasonLocked={commentPopup.reasonLocked}
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

export default function ProfilesClient({ initialSearch, initialProfiles }) {
  return (
    <Suspense fallback={<div className="empty-state"><p>Loading…</p></div>}>
      <VotesContent initialSearchProp={initialSearch} initialProfilesProp={initialProfiles} />
    </Suspense>
  );
}
