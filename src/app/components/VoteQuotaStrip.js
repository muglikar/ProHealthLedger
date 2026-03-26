"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
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

  let message;
  let sub = null;

  if (yes_count < 1) {
    message =
      "Your first contribution must be a positive vouch. After that, each vouch earns 1 flag credit.";
    sub = (
      <Link href="/submit" className="vote-quota-strip-link">
        Add a positive vouch
      </Link>
    );
  } else if (flags_available > 0) {
    message = `Flags available: ${flags_available}`;
    sub = (
      <span className="vote-quota-strip-meta">
        {yes_count} vouch{yes_count === 1 ? "" : "es"} · {no_count} flag
        {no_count === 1 ? "" : "s"} used · 1 vouch = 1 flag credit
      </span>
    );
  } else {
    message = `No flag credits left — add ${vouches_until_next_credit} more positive vouch${vouches_until_next_credit === 1 ? "" : "es"} to earn a new credit.`;
    sub = (
      <span className="vote-quota-strip-meta">
        {yes_count} vouch{yes_count === 1 ? "" : "es"} · {no_count} flag
        {no_count === 1 ? "" : "s"} used
      </span>
    );
  }

  return (
    <aside className="vote-quota-strip" aria-label="Your voting quota">
      <span className="vote-quota-strip-inner">
        <span className="vote-quota-strip-icon" aria-hidden>
          ⚖
        </span>
        <span className="vote-quota-strip-text">
          <strong className="vote-quota-strip-msg">{message}</strong>
          {sub ? <span className="vote-quota-strip-sub">{sub}</span> : null}
        </span>
      </span>
    </aside>
  );
}
