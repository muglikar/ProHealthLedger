"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

export default function ModeratePage() {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const isAdmin =
    status === "authenticated" && session?.userId && session.siteAdmin;

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/moderate");
      if (res.ok) setPending(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPending();
    else setLoading(false);
  }, [isAdmin, fetchPending]);

  const handleAction = async (issue, action) => {
    setActing(issue);
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, action }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.issue !== issue));
      }
    } catch { /* ignore */ }
    setActing(null);
  };

  if (status === "loading" || loading) {
    return <div className="empty-state"><p>Loading…</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <h3>Access denied</h3>
        <p>This page is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Comment Moderation</h1>
        <p>{pending.length} comment{pending.length !== 1 ? "s" : ""} pending review</p>
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <h3>All clear</h3>
          <p>No comments pending moderation.</p>
        </div>
      ) : (
        <div className="mod-list">
          {pending.map((item) => (
            <div key={item.issue} className="mod-card">
              <div className="mod-card-header">
                <strong>{formatProfessionalDisplayName(item.profile_slug, item.public_name)}</strong>
                <span className={`vote-pill ${item.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
                  {item.vote === "yes" ? "Yes" : "No"}
                </span>
                <span className="mod-card-meta">
                  by {item.display_name || item.user} · #{item.issue} · {item.date}
                </span>
              </div>
              <blockquote className="mod-card-reason">{item.reason}</blockquote>
              <div className="mod-card-actions">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={acting === item.issue}
                  onClick={() => handleAction(item.issue, "approve")}
                >
                  {acting === item.issue ? "…" : "Approve"}
                </button>
                <button
                  className="btn btn-secondary btn-sm mod-btn-reject"
                  disabled={acting === item.issue}
                  onClick={() => handleAction(item.issue, "reject")}
                >
                  {acting === item.issue ? "…" : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
