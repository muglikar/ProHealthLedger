"use client";

import { useState, useCallback } from "react";

/**
 * Reusable profile photo component with "Not the right photo?" checkbox.
 *
 * Props:
 *   photoUrl   — LinkedIn photo URL (nullable)
 *   name       — Display name for initials fallback
 *   slug       — Profile slug (for flagging)
 *   size       — Pixel size (default 48)
 *   showFlag   — Whether to show the "Not right photo?" checkbox (default true)
 *   className  — Extra CSS class on the wrapper
 */
export default function ProfilePhoto({
  photoUrl,
  name,
  slug,
  size = 48,
  showFlag = true,
  className = "",
}) {
  const [flagged, setFlagged] = useState(false);
  const [imgError, setImgError] = useState(false);

  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  const showPhoto = photoUrl && !flagged && !imgError;

  const handleFlag = useCallback(
    async (e) => {
      const checked = e.target.checked;
      setFlagged(checked);
      if (checked && slug) {
        // Fire-and-forget flag to the API
        try {
          await fetch("/api/flag-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          });
        } catch {
          // Non-fatal
        }
      }
    },
    [slug]
  );

  return (
    <div className={`pphoto-wrapper ${className}`.trim()}>
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          className="pphoto-img"
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="pphoto-img pphoto-initials"
          aria-hidden="true"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initials}
        </span>
      )}
      {showFlag && photoUrl && !imgError && (
        <label className="pphoto-flag">
          <input
            type="checkbox"
            checked={flagged}
            onChange={handleFlag}
          />
          Not the right photo?
        </label>
      )}
    </div>
  );
}
