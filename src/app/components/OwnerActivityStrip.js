"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

export default function OwnerActivityStrip() {
  const { data: session, status } = useSession();
  const [payload, setPayload] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  const isLedgerAdmin =
    Boolean(session?.siteAdmin) ||
    (session?.userId ? isRepoMaintainerUserId(session.userId) : false);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !isLedgerAdmin) return;
    try {
      const r = await fetch("/api/owner-activity");
      if (r.ok) setPayload(await r.json());
      else setPayload(null);
    } catch {
      setPayload(null);
    }
  }, [status, isLedgerAdmin]);

  useEffect(() => {
    if (status !== "authenticated" || !isLedgerAdmin) {
      setPayload(null);
      return;
    }
    load();
    const t = setInterval(load, 45000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", load);
    };
  }, [status, isLedgerAdmin, load]);

  const dismiss = async () => {
    setDismissing(true);
    try {
      const r = await fetch("/api/owner-activity", { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        setPayload({
          newCount: 0,
          items: [],
          dismissed_max_issue: j.dismissed_max_issue ?? 0,
          max_issue_in_repo: j.dismissed_max_issue ?? 0,
        });
      }
    } catch {
      /* ignore */
    }
    setDismissing(false);
  };

  if (status !== "authenticated" || !isLedgerAdmin || !payload) {
    return null;
  }
  if (payload.newCount < 1) return null;

  const { newCount, items } = payload;
  const sample = items.slice(0, 3);
  const sampleText =
    sample.length > 0
      ? ` (${sample
          .map((it) => `#${it.issue} ${it.vote === "yes" ? "vouch" : "flag"}`)
          .join(", ")}).`
      : ".";

  return (
    <aside className="owner-activity-strip" role="status" aria-live="polite">
      <div className="owner-activity-strip-inner">
        <p className="owner-activity-strip-msg">
          <strong>New on the ledger:</strong>{" "}
          {newCount} new vote{newCount === 1 ? "" : "s"} since you last checked
          {sampleText}
        </p>
        <div className="owner-activity-strip-actions">
          <Link href="/transparency" className="owner-activity-strip-link">
            Audit trail
          </Link>
          <Link href="/admin/moderate" className="owner-activity-strip-link">
            Moderate
          </Link>
          <button
            type="button"
            className="btn btn-secondary btn-sm owner-activity-strip-dismiss"
            disabled={dismissing}
            onClick={dismiss}
          >
            {dismissing ? "…" : "Mark seen"}
          </button>
        </div>
      </div>
    </aside>
  );
}
