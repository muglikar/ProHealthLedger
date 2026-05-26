"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import ProfilePhoto from "@/app/components/ProfilePhoto";

function dedupeSubmissions(submissions) {
  if (!Array.isArray(submissions)) return [];
  const map = new Map();
  for (const s of submissions) {
    const key =
      s.issue != null && s.issue !== ""
        ? `issue:${s.issue}`
        : `row:${s.date}:${String(s.user || "")}:${s.vote}`;
    if (!map.has(key)) map.set(key, s);
  }
  return [...map.values()];
}

function countVotes(submissions) {
  const deduped = dedupeSubmissions(submissions);
  let yes = 0;
  let no = 0;
  for (const s of deduped) {
    if (s.vote === "yes") yes++;
    else if (s.vote === "no") no++;
  }
  return { yes, no, total: yes + no };
}

export default function DirectoryClient({ profiles }) {
  const sortedProfiles = [...profiles].sort((a, b) => {
    const nameA = formatProfessionalDisplayName(a.slug, a.public_name).toLowerCase();
    const nameB = formatProfessionalDisplayName(b.slug, b.public_name).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="directory-list" style={{ display: "grid", gap: "15px" }}>
      {sortedProfiles.map((p) => {
        const displayName = formatProfessionalDisplayName(p.slug, p.public_name);
        const rawUrl = typeof p.linkedin_url === "string" ? p.linkedin_url : "";
        const urlSlug = rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || p.slug;
        const { yes, no } = countVotes(p.submissions);

        return (
          <article
            key={p.slug}
            className="directory-item"
            style={{
              padding: "15px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              backgroundColor: "var(--bg-card)",
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
            }}
          >
            <ProfilePhoto
              photoUrl={p.profile_photo_url}
              name={displayName}
              slug={p.slug}
              size={52}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 10px 0" }}>
                <Link
                  href={`/p/directory/directory/${encodeURIComponent(urlSlug)}`}
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "bold" }}
                >
                  {displayName}
                </Link>
              </h2>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span>{p.submissions?.length || 0} verified community vote(s)</span>
                {yes > 0 && (
                  <span className="vote-badge vote-yes" style={{ margin: 0 }}>
                    ✓ {yes} would work with again
                  </span>
                )}
                {no > 0 && (
                  <span className="vote-badge vote-no" style={{ margin: 0 }}>
                    ✕ {no} would not work with them again
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
