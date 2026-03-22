"use client";

import { useState, useEffect } from "react";

export default function ContributorsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contributors")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...users].sort(
    (a, b) => b.yes_count + b.no_count - (a.yes_count + a.no_count)
  );

  function profileUrl(userId) {
    if (!userId) return null;
    if (userId.startsWith("github:")) {
      return `https://github.com/${userId.slice(7)}`;
    }
    if (userId.startsWith("linkedin:")) {
      return null;
    }
    return `https://github.com/${userId}`;
  }

  function contributorId(user) {
    if (user.user_id) return user.user_id;
    if (user.github_username) return `github:${user.github_username}`;
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
          {sorted.map((user, idx) => {
            const rawId =
              user.user_id ||
              (user.github_username ? `github:${user.github_username}` : "");
            const url = profileUrl(rawId);
            const name = contributorId(user);
            return (
              <div
                key={rawId || idx}
                className="leaderboard-row"
              >
                <div
                  className={`leaderboard-rank${idx < 3 ? " top-3" : ""}`}
                >
                  {idx + 1}
                </div>
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
                    <span>{user.contributions.length} total</span>
                  </div>
                </div>
                <span
                  className={`karma-status ${user.yes_count >= 1 ? "karma-good" : "karma-pending"}`}
                >
                  {user.yes_count >= 1 ? "Can vote No" : "Yes only"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
