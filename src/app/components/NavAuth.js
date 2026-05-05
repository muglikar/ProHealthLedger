"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import VerifiedBadge from "./VerifiedBadge";

export default function NavAuth() {
  const { data: session, status } = useSession();
  const [activityCount, setActivityCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [myLinkedSlug, setMyLinkedSlug] = useState("");

  const isAdmin =
    Boolean(session?.siteAdmin) ||
    (session?.userId ? isRepoMaintainerUserId(session.userId) : false);

  // Load linked slug (priority: session > localstorage)
  useEffect(() => {
    if (session?.linkedinVanity) {
      setMyLinkedSlug(session.linkedinVanity);
      try { localStorage.setItem("phl_my_slug", session.linkedinVanity); } catch {}
    } else {
      try { setMyLinkedSlug(localStorage.getItem("phl_my_slug") || ""); } catch {}
    }
  }, [session?.linkedinVanity]);

  const pollActivity = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/owner-activity");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.newCount === "number") setActivityCount(data.newCount);
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  const linkMyProfile = useCallback((e) => {
    e.stopPropagation();
    const url = window.prompt(
      "To share vouches received about you, paste your LinkedIn profile URL:\n\nExample: https://www.linkedin.com/in/your-name"
    );
    if (!url) return;
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const slug = match[1].toLowerCase();
      localStorage.setItem("phl_my_slug", slug);
      setMyLinkedSlug(slug);
      setDropdownOpen(false);
    } else {
      alert("Invalid LinkedIn URL. Please use a link like https://www.linkedin.com/in/your-name");
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setActivityCount(0);
      return;
    }
    pollActivity();
    const t = setInterval(pollActivity, 60000);
    const onVis = () => {
      if (document.visibilityState === "visible") pollActivity();
    };
    window.addEventListener("focus", pollActivity);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", pollActivity);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAdmin, pollActivity]);

  useEffect(() => {
    const close = () => setDropdownOpen(false);
    if (dropdownOpen) {
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }
  }, [dropdownOpen]);

  if (status === "loading") {
    return <span className="nav-auth-loading">…</span>;
  }

  if (!session) {
    return (
      <Link className="nav-auth-btn" href="/submit">
        Sign In
      </Link>
    );
  }

  return (
    <div className="nav-auth-user">
      {isAdmin && (
        <>
          <Link href="/admin/moderate" className="nav-admin-link">
            Moderate
          </Link>
          <Link href="/admin/removals" className="nav-admin-link">
            Removals
          </Link>
          {activityCount > 0 ? (
            <Link
              href="/transparency"
              className="nav-admin-bell"
              title={`${activityCount} new vote${activityCount === 1 ? "" : "s"} on the ledger`}
              aria-label={`${activityCount} new vote${activityCount === 1 ? "" : "s"} on the ledger; open full audit`}
            >
              <svg
                className="nav-admin-bell-svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="nav-admin-bell-badge">
                {activityCount > 99 ? "99+" : activityCount}
              </span>
            </Link>
          ) : null}
        </>
      )}

      <div className="nav-auth-dropdown-wrap">
        <button 
          className="nav-auth-toggle-btn" 
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          <span className="nav-auth-name">
            {session.displayName || session.userId}
          </span>
          {myLinkedSlug ? (
            <VerifiedBadge size={16} className="nav-auth-verified-badge" />
          ) : (
            <span className="nav-auth-unverified-badge" title="Verify using your LinkedIn profile URL">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#fecaca" />
                <path d="M15 9L9 15M9 9l6 6" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <svg className={`nav-auth-chevron ${dropdownOpen ? 'is-open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {dropdownOpen && (
          <div className="nav-auth-dropdown-menu">
            <div className="nav-dropdown-info">
              {myLinkedSlug ? (
                <>
                  <div className="nav-dropdown-status verified">
                    Verified: <strong>{myLinkedSlug}</strong>
                  </div>
                  <button className="nav-dropdown-action" onClick={linkMyProfile}>
                    Change Linked Profile
                  </button>
                </>
              ) : (
                <>
                  <div className="nav-dropdown-status unverified">
                    Unverified Profile
                  </div>
                  <button className="nav-dropdown-action highlight" onClick={linkMyProfile}>
                    Link LinkedIn Profile
                  </button>
                </>
              )}
            </div>
            <div className="nav-dropdown-divider" />
            <button
              className="nav-dropdown-item nav-dropdown-signout"
              onClick={() => signOut()}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
