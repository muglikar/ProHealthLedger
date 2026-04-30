"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

const REDACTION_CATEGORIES = [
  { value: "abuse", label: "Abuse / harassment" },
  { value: "pii", label: "Personal info (PII)" },
  { value: "off-topic", label: "Off-topic / irrelevant" },
  { value: "unverified", label: "Unverified factual claim" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

export default function ModeratePage() {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState([]);
  const [redacted, setRedacted] = useState([]);
  const [linkChanges, setLinkChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [categoryByIssue, setCategoryByIssue] = useState({});

  const isAdmin =
    status === "authenticated" &&
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/moderate?status=pending");
      if (res.ok) setPending(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchRedacted = useCallback(async () => {
    try {
      const res = await fetch("/api/moderate?status=redacted");
      if (res.ok) setRedacted(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchLinkChanges = useCallback(async () => {
    try {
      const res = await fetch("/api/moderate?status=profile-link-changes");
      if (res.ok) setLinkChanges(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([fetchPending(), fetchRedacted(), fetchLinkChanges()]).finally(() =>
      setLoading(false)
    );
  }, [isAdmin, fetchPending, fetchRedacted, fetchLinkChanges]);

  const setCategory = (issue, value) =>
    setCategoryByIssue((prev) => ({ ...prev, [issue]: value }));

  const handleAction = async (issue, action) => {
    setActing(issue);
    try {
      const payload = { issue, action };
      if (action === "reject") {
        payload.category = categoryByIssue[issue] || "miscellaneous";
      }
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (action === "approve" || action === "reject") {
          setPending((prev) => prev.filter((p) => p.issue !== issue));
        }
        if (action === "unredact") {
          setRedacted((prev) => prev.filter((p) => p.issue !== issue));
        }
        if (action === "reject") {
          fetchRedacted();
        }
      }
    } catch { /* ignore */ }
    setActing(null);
  };

  const handleLinkChangeAction = async (requestId, action) => {
    setActing(requestId);
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId }),
      });
      if (res.ok) {
        setLinkChanges((prev) => prev.filter((r) => r.id !== requestId));
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
        <p>
          {pending.length} comment{pending.length !== 1 ? "s" : ""} pending review
          {redacted.length ? ` · ${redacted.length} previously redacted` : ""}
          {linkChanges.length
            ? ` · ${linkChanges.length} profile link change request${linkChanges.length === 1 ? "" : "s"}`
            : ""}
        </p>
        <p className="submit-hero-sub">
          Rejecting a comment redacts it (it is not silently deleted): the
          original text is preserved in the private redactions store, the
          public ledger keeps a tamper-evident hash, and every action is
          appended to the public moderation log.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <h3>All clear</h3>
          <p>No comments pending moderation.</p>
        </div>
      ) : (
        <div className="mod-list">
          {pending.map((item) => {
            const category =
              categoryByIssue[item.issue] || "miscellaneous";
            return (
              <div key={item.issue} className="mod-card">
                <div className="mod-card-header">
                  <strong>
                    {formatProfessionalDisplayName(
                      item.profile_slug,
                      item.public_name
                    )}
                  </strong>
                  <span
                    className={`vote-pill ${item.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}
                  >
                    {item.vote === "yes" ? "Yes" : "No"}
                  </span>
                  <span className="mod-card-meta">
                    by {item.display_name || item.user} · #{item.issue} · {item.date}
                  </span>
                </div>
                <blockquote className="mod-card-reason">{item.reason}</blockquote>
                {item.reason_safety_flags ? (
                  <p style={{ fontSize: "0.82rem", color: "#b45309", marginTop: 8 }}>
                    Safety detector flagged this comment
                    {item.reason_safety_flags.block_approve ? " (approve is blocked)." : "."}
                  </p>
                ) : null}
                <div className="mod-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={acting === item.issue}
                    onClick={() => handleAction(item.issue, "approve")}
                  >
                    {acting === item.issue ? "…" : "Approve"}
                  </button>
                  <label
                    className="mod-card-category-label"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
                  >
                    Reason:
                    <select
                      value={category}
                      onChange={(e) => setCategory(item.issue, e.target.value)}
                      disabled={acting === item.issue}
                    >
                      {REDACTION_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn btn-secondary btn-sm mod-btn-reject"
                    disabled={acting === item.issue}
                    onClick={() => handleAction(item.issue, "reject")}
                    title="Redact (publicly hidden, original kept in private store)"
                  >
                    {acting === item.issue ? "…" : "Reject (redact)"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {linkChanges.length > 0 ? (
        <>
          <div className="page-header" style={{ marginTop: 36 }}>
            <h2>Profile link change requests</h2>
            <p>
              These requests appear when a submitted LinkedIn URL conflicts with the
              ledger record for an existing profile.
            </p>
          </div>
          <div className="mod-list">
            {linkChanges.map((req) => (
              <div key={req.id} className="mod-card">
                <div className="mod-card-header">
                  <strong>{req.profile_slug}</strong>
                  <span className="mod-card-meta">
                    requested by {req.requested_by_display_name || req.requested_by} ·{" "}
                    {(req.requested_at || "").slice(0, 10)}
                  </span>
                </div>
                <p className="mod-card-meta">
                  Current: <code>{req.current_linkedin_url}</code>
                </p>
                <p className="mod-card-meta">
                  Proposed: <code>{req.proposed_linkedin_url}</code>
                </p>
                <div className="mod-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={acting === req.id}
                    onClick={() =>
                      handleLinkChangeAction(req.id, "approve_link_change")
                    }
                  >
                    {acting === req.id ? "…" : "Approve link change"}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={acting === req.id}
                    onClick={() =>
                      handleLinkChangeAction(req.id, "reject_link_change")
                    }
                  >
                    {acting === req.id ? "…" : "Reject request"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {redacted.length > 0 ? (
        <>
          <div className="page-header" style={{ marginTop: 36 }}>
            <h2>Previously redacted</h2>
            <p>
              The original text lives in the private redactions store. Click
              Un-redact to restore it on the public ledger.
            </p>
          </div>
          <div className="mod-list">
            {redacted.map((item) => (
              <div key={item.issue} className="mod-card">
                <div className="mod-card-header">
                  <strong>
                    {formatProfessionalDisplayName(
                      item.profile_slug,
                      item.public_name
                    )}
                  </strong>
                  <span
                    className={`vote-pill ${item.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}
                  >
                    {item.vote === "yes" ? "Yes" : "No"}
                  </span>
                  <span className="mod-card-meta">
                    by {item.display_name || item.user} · #{item.issue} · {item.date}
                    {" · "}
                    redacted by {item.redacted_by || "—"} on{" "}
                    {(item.redacted_at || "").slice(0, 10) || "—"}
                    {" · "}
                    category: {item.redaction_category || "miscellaneous"}
                  </span>
                </div>
                <blockquote className="mod-card-reason" style={{ fontStyle: "italic", color: "#475569" }}>
                  [redacted — hash {item.reason_hash || "n/a"}]
                </blockquote>
                <div className="mod-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={acting === item.issue}
                    onClick={() => handleAction(item.issue, "unredact")}
                    title="Restore original text on the public ledger"
                  >
                    {acting === item.issue ? "…" : "Un-redact"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
