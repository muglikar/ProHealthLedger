"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Reusable profile photo component with "Right photo? [✓] [✗]" buttons.
 *
 * Props:
 *   photoUrl   — LinkedIn photo URL (nullable)
 *   name       — Display name for initials fallback
 *   slug       — Profile slug (for flagging)
 *   size       — Pixel size (default 48)
 *   showFlag   — Whether to show the "Right photo?" buttons (default true)
 *   className  — Extra CSS class on the wrapper
 */
export default function ProfilePhoto({
  photoUrl,
  originalPhotoUrl,
  name,
  slug,
  size = 48,
  showFlag = true,
  className = "",
}) {
  const { data: session } = useSession();
  const [flagged, setFlagged] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(photoUrl);

  // Sync state if photoUrl changes
  useEffect(() => {
    setCurrentPhoto(photoUrl);
    setImgError(false);
  }, [photoUrl]);

  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;

    if (localStorage.getItem(`phl_photo_dismissed_${slug}`)) {
      setPromptDismissed(true);
    }
    const flaggedVal = localStorage.getItem(`phl_photo_flag_${slug}`);
    if (flaggedVal) {
      if (photoUrl && flaggedVal === photoUrl) {
        setFlagged(true);
        setPromptDismissed(true);
      } else {
        localStorage.removeItem(`phl_photo_flag_${slug}`);
      }
    }

    const handleDismissEvent = (e) => {
      if (e.detail === slug) setPromptDismissed(true);
    };
    const handleFlagEvent = (e) => {
      if (e.detail === slug) {
        setFlagged(true);
        setPromptDismissed(true);
      }
    };

    window.addEventListener("phl_photo_dismissed", handleDismissEvent);
    window.addEventListener("phl_photo_flagged", handleFlagEvent);

    return () => {
      window.removeEventListener("phl_photo_dismissed", handleDismissEvent);
      window.removeEventListener("phl_photo_flagged", handleFlagEvent);
    };
  }, [slug, photoUrl]);

  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  const showPhoto = currentPhoto && !flagged && !imgError;

  const handleImgError = useCallback(() => {
    if (currentPhoto !== originalPhotoUrl && originalPhotoUrl) {
      console.log(`[ProfilePhoto] Local photo ${currentPhoto} failed. Falling back to CDN: ${originalPhotoUrl}`);
      setCurrentPhoto(originalPhotoUrl);
    } else {
      setImgError(true);
    }
  }, [currentPhoto, originalPhotoUrl]);

  const handleYes = useCallback(async () => {
    setPromptDismissed(true);
    if (slug) {
      localStorage.setItem(`phl_photo_dismissed_${slug}`, "true");
      window.dispatchEvent(new CustomEvent("phl_photo_dismissed", { detail: slug }));
      
      try {
        await fetch("/api/verify-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
      } catch {
        // Non-fatal
      }
    }
  }, [slug]);

  const handleNo = useCallback(
    async () => {
      setPromptDismissed(true);
      setFlagged(true);
      if (slug && photoUrl) {
        localStorage.setItem(`phl_photo_flag_${slug}`, photoUrl);
        window.dispatchEvent(new CustomEvent("phl_photo_flagged", { detail: slug }));
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
    [slug, photoUrl]
  );

  return (
    <div className={`pphoto-wrapper ${className}`.trim()}>
      {showPhoto ? (
        <img
          src={currentPhoto}
          alt=""
          className="pphoto-img"
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImgError}
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
      {showFlag && !!session?.userId && photoUrl && !imgError && !promptDismissed && (
        <div className="pphoto-flag-buttons" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          <span>Right photo?</span>
          <button type="button" onClick={handleYes} className="btn-icon-small" title="Yes, correct photo" style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
            ✓
          </button>
          <button type="button" onClick={handleNo} className="btn-icon-small" title="No, wrong photo" style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
            ✗
          </button>
        </div>
      )}
    </div>
  );
}
