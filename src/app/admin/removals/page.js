"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

export default function AdminRemovalsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [requests, setRequests] = useState([]);

  const isAdmin =
    status === "authenticated" &&
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetch("/api/removal-requests")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(Boolean(data?.configured));
        setRequests(Array.isArray(data?.requests) ? data.requests : []);
      })
      .catch(() => {
        setConfigured(false);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

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
  if (!configured) {
    return (
      <div className="empty-state">
        <h3>Removal store not configured</h3>
        <p>
          Set <code>GITHUB_REMOVALS_REPO</code> (and PAT vars) on Vercel to
          receive private removal requests.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="page-header">
        <h1>Private Removal Requests</h1>
        <p>
          Intake list from the private removals repository. Use request IDs to
          review full records directly in that repo.
        </p>
      </div>
      {requests.length === 0 ? (
        <div className="empty-state">
          <p>No requests yet.</p>
        </div>
      ) : (
        <div className="leaderboard">
          {requests
            .slice()
            .sort((a, b) =>
              String(b.submitted_at || "").localeCompare(String(a.submitted_at || ""))
            )
            .map((r, i) => (
              <div key={r.id || i} className="leaderboard-row">
                <div className="leaderboard-rank">{i + 1}</div>
                <div className="leaderboard-info">
                  <div className="leaderboard-username">
                    <code>{r.id}</code> · {r.status || "new"}
                  </div>
                  <div className="leaderboard-stats">
                    <span>{r.linkedin_url}</span>
                    <span>{r.contact_email_masked || "email hidden"}</span>
                    <span>{r.submitted_at || "—"}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

