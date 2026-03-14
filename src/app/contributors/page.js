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
          <p>
            Share your first experience to appear on this list.
          </p>
        </div>
      ) : (
        <div className="leaderboard">
          {sorted.map((user, idx) => (
            <div key={user.github_username} className="leaderboard-row">
              <div
                className={`leaderboard-rank${idx < 3 ? " top-3" : ""}`}
              >
                {idx + 1}
              </div>
              <div className="leaderboard-info">
                <div className="leaderboard-username">
                  <a
                    href={`https://github.com/${user.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{user.github_username}
                  </a>
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
          ))}
        </div>
      )}
    </>
  );
}
