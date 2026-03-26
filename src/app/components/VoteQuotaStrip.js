"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

function IconVouch({ className }) {
  return (
    <svg
      className={className}
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconFlag({ className }) {
  return (
    <svg
      className={className}
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
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export default function VoteQuotaStrip() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setStats(null);
      return;
    }
    let cancelled = false;
    function load() {
      fetch("/api/my-vote-quota")
        .then((r) => {
          if (!r.ok) return null;
          return r.json();
        })
        .then((data) => {
          if (!cancelled && data && !data.error) setStats(data);
          else if (!cancelled) setStats(null);
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        });
    }
    load();
    function onRecorded() {
      load();
    }
    window.addEventListener("prohl-vote-recorded", onRecorded);
    return () => {
      cancelled = true;
      window.removeEventListener("prohl-vote-recorded", onRecorded);
    };
  }, [status, session?.userId]);

  if (status !== "authenticated" || !stats) return null;

  const {
    yes_count,
    no_count,
    flags_available,
    vouches_until_next_credit,
  } = stats;

  const stripClass =
    yes_count < 1
      ? " vote-quota-strip--onboard"
      : flags_available > 0
        ? " vote-quota-strip--ready"
        : " vote-quota-strip--topup";

  let message;
  let sub = null;

  if (yes_count < 1) {
    message =
      "Start here: your first vote must be a positive vouch. Each vouch then earns you one flag credit to use when you need it.";
    sub = (
      <Link href="/submit" className="vote-quota-strip-link">
        Share a positive vouch
      </Link>
    );
  } else if (flags_available > 0) {
    message = `You can submit ${flags_available} more negative vote${flags_available === 1 ? "" : "s"} when something warrants it.`;
    sub = (
      <span className="vote-quota-strip-meta">
        <span className="vote-quota-strip-hint">1 vouch = 1 flag credit · </span>
        {no_count} flag{no_count === 1 ? "" : "s"} used so far
      </span>
    );
  } else {
    message = `Add ${vouches_until_next_credit} more positive vouch${vouches_until_next_credit === 1 ? "" : "es"} to unlock your next flag credit.`;
    sub = (
      <span className="vote-quota-strip-meta">
        {no_count} flag{no_count === 1 ? "" : "s"} used — keep building trust with vouches
      </span>
    );
  }

  return (
    <aside
      className={`vote-quota-strip${stripClass}`}
      aria-label="Your voting quota"
    >
      <div className="vote-quota-strip-inner">
        <div
          className="vote-quota-strip-chips"
          role="group"
          aria-label="Vouches submitted and flag credits available"
        >
          <div
            className="vote-quota-chip vote-quota-chip--vouch"
            title="Positive vouches you have submitted"
          >
            <IconVouch className="vote-quota-chip-icon" />
            <span className="vote-quota-chip-text">
              <span className="vote-quota-chip-label">Vouches</span>
              <span className="vote-quota-chip-value">{yes_count}</span>
            </span>
          </div>
          <div
            className="vote-quota-chip vote-quota-chip--flag"
            title="Flag credits available now"
          >
            <IconFlag className="vote-quota-chip-icon" />
            <span className="vote-quota-chip-text">
              <span className="vote-quota-chip-label">Flags left</span>
              <span className="vote-quota-chip-value">
                {yes_count < 1 ? "—" : flags_available}
              </span>
            </span>
          </div>
        </div>
        <div className="vote-quota-strip-copy">
          <strong className="vote-quota-strip-msg">{message}</strong>
          {sub ? <span className="vote-quota-strip-sub">{sub}</span> : null}
        </div>
      </div>
    </aside>
  );
}
