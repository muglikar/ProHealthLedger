"use client";

import { useState, useEffect } from "react";
import { flagsAvailable } from "@/lib/karma";
import ProfilePhoto from "@/app/components/ProfilePhoto";

export default function ContributorsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch("/api/contributors")
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setLoading(false);
      });
  }, []);

  const sorted = [...users].sort(
    (a, b) =>
      (b.yes_count ?? 0) +
      (b.no_count ?? 0) -
      ((a.yes_count ?? 0) + (a.no_count ?? 0))
  );

  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  function profileUrl(user) {
    if (!user) return null;
    if (user.linkedin_url) {
      const slug = user.linkedin_url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1];
      if (slug) return `/profile/${slug.toLowerCase()}`;
    }
    if (user.github_username) return `https://github.com/${user.github_username}`;
    
    const userId = user.user_id || "";
    if (userId.startsWith("github:")) {
      return `https://github.com/${userId.slice(7)}`;
    }
    if (userId.startsWith("linkedin:")) {
      return `/profiles?search=${encodeURIComponent(user.display_name || "Professional")}`;
    }
    return `https://github.com/${userId}`;
  }

  function contributorLabel(user) {
    if (user.display_name) return user.display_name;
    if (user.user_id) return user.user_id;
    if (user.github_username) return user.github_username;
    return "Unknown";
  }

  return (
    <>
      <div className="page-header">
        <h1>Community Contributors</h1>
        <p>
          Everyone who has shared their professional experience. Ranked by
          total contributions.
        </p>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No contributors yet</h3>
          <p>Share your first experience to appear on this list.</p>
        </div>
      ) : (
        <div className="leaderboard">
          {paginated.map((user, idx) => {
            const absoluteIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
            const rawId =
              user.user_id ||
              (user.github_username ? `github:${user.github_username}` : "");
            const name = contributorLabel(user);
            const url = profileUrl(user);
            const flagLeft = flagsAvailable(user);
            return (
              <div
                key={rawId || idx}
                className="leaderboard-row"
              >
                <div
                  className={`leaderboard-rank${absoluteIdx < 3 ? " top-3" : ""}`}
                >
                  {absoluteIdx + 1}
                </div>
                <ProfilePhoto
                  photoUrl={user.image || null}
                  name={name}
                  slug={user.linkedin_url ? (user.linkedin_url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || null) : null}
                  size={40}
                  showFlag={false}
                />
                <div className="leaderboard-info">
                  <div className="leaderboard-username">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                  </div>
                  <div className="leaderboard-stats">
                    <span>✓ {user.yes_count} positive</span>
                    <span>✗ {user.no_count} negative</span>
                    <span>{user.contributions?.length || 0} total</span>
                  </div>
                </div>
                <span
                  className={`karma-status ${user.yes_count >= 1 && flagLeft > 0
                      ? "karma-good"
                      : "karma-pending"
                    }`}
                >
                  {user.yes_count < 1
                    ? "Vouch first"
                    : flagLeft > 0
                      ? `${flagLeft} flag${flagLeft === 1 ? "" : "s"} left`
                      : "No flags left"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "24px", marginBottom: "40px" }}>
          <button
            className="btn btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
