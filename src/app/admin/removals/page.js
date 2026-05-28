"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { lookupPhoto } from "@/lib/photo-map";

export default function AdminRemovalsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [requests, setRequests] = useState([]);
  const [photoMap, setPhotoMap] = useState({});

  const isAdmin =
    status === "authenticated" &&
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    // Fetch removal requests and contributor photos concurrently
    Promise.all([
      fetch("/api/removal-requests")
        .then((r) => r.json())
        .catch(() => ({})),
      fetch("/api/contributor-photos")
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([removalData, photos]) => {
        setConfigured(Boolean(removalData?.configured));
        setRequests(Array.isArray(removalData?.requests) ? removalData.requests : []);
        setPhotoMap(photos || {});
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
            .map((r, i) => {
              const photo = lookupPhoto(photoMap, { linkedinUrl: r.linkedin_url });
              return (
                <div key={r.id || i} className="leaderboard-row" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="leaderboard-rank">{i + 1}</div>
                  {photo && (
                    <img
                      src={photo}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
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
              );
            })}
        </div>
      )}
    </>
  );
}

