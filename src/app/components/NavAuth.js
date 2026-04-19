"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

export default function NavAuth() {
  const { data: session, status } = useSession();
  const [activityCount, setActivityCount] = useState(0);

  const isAdmin =
    Boolean(session?.siteAdmin) ||
    (session?.userId ? isRepoMaintainerUserId(session.userId) : false);

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

  if (status === "loading") {
    return <span className="nav-auth-loading">…</span>;
  }

  if (!session) {
    return (
      <button className="nav-auth-btn" onClick={() => signIn()}>
        Sign In
      </button>
    );
  }

  return (
    <div className="nav-auth-user">
      {isAdmin && (
        <>
          <Link href="/admin/moderate" className="nav-admin-link">
            Moderate
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
      <span
        className="nav-auth-name"
        title={session.userId ? `Account: ${session.userId}` : ""}
      >
        {session.displayName || session.userId}
      </span>
      <button
        className="nav-auth-btn nav-auth-btn-out"
        onClick={() => signOut()}
      >
        Sign Out
      </button>
    </div>
  );
}
