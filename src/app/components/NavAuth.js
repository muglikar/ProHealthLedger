"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { getProviders } from "next-auth/react";

export default function NavAuth() {
  const { data: session, status } = useSession();
  const [activityCount, setActivityCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [myLinkedSlug, setMyLinkedSlug] = useState("");
  const [hasLinkedInProvider, setHasLinkedInProvider] = useState(false);

  const isAdmin =
    Boolean(session?.siteAdmin) ||
    (session?.userId ? isRepoMaintainerUserId(session.userId) : false);

  // Load linked slug (priority: session > localstorage)
  useEffect(() => {
    getProviders()
      .then((p) => setHasLinkedInProvider(Boolean(p?.linkedin)))
      .catch(() => setHasLinkedInProvider(false));
  }, []);

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
      <div className="signin-options">
        <button className="nav-auth-btn" onClick={() => signIn("github")}>
          Sign in with GitHub
        </button>
        {hasLinkedInProvider ? (
          <button className="nav-auth-btn" onClick={() => signIn("linkedin")}>
            Sign in with LinkedIn
          </button>
        ) : null}
      </div>
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
            <span className="nav-auth-verified-badge" title="LinkedIn Profile Linked">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#0072b1">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </span>
          ) : (
            <span className="nav-auth-unverified-badge" title="Verify using your LinkedIn profile URL">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#e11d48">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
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
