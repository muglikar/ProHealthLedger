"use client";

import { useState, useEffect, useCallback } from "react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

const SITE_URL = "https://pro-health-ledger.vercel.app";

function buildShareText(displayName, profileSlug, firstPerson = false) {
  if (firstPerson) {
    return (
      `I've been vouched for i.e. positively reviewed on Pro-Health Ledger.\n\n` +
      `Please check it out and share your experiences too!`
    );
  }
  return (
    `Hey ${displayName}, I have vouched for you i.e. positively reviewed you on Pro-Health Ledger.\n\n` +
    `Please check it out and share your experiences too!`
  );
}

export default function ShareVouchModal({ data, onClose, firstPerson = false }) {
  const [copied, setCopied] = useState(false);
  const [linkedinPasteStep, setLinkedinPasteStep] = useState(false);
  const pasteKey =
    typeof navigator !== "undefined" &&
    (navigator.platform?.includes("Mac") || /Mac|iPhone|iPad/.test(navigator.userAgent || ""))
      ? "⌘V"
      : "Ctrl+V";

  const displayName = formatProfessionalDisplayName(
    data.profile_slug,
    data.public_name
  );
  const shareText = buildShareText(displayName, data.profile_slug, firstPerson);
  const slug = typeof data.profile_slug === "string" ? data.profile_slug.trim() : "";
  const ledgerProfileUrl = slug
    ? `${SITE_URL}/profiles?search=${encodeURIComponent(slug)}`
    : `${SITE_URL}/profiles`;
  /**
   * LinkedIn `url=` must be this public ledger profile URL (not the site root, not only
   * linkedin.com) so the preview card and default link target are the reviewee’s page.
   */
  const linkedinShareOffsiteUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ledgerProfileUrl)}`;

  useEffect(() => {
    setLinkedinPasteStep(false);
    setCopied(false);
  }, [data]);

  const handlePostToLinkedIn = useCallback(async () => {
    const toCopy = `${shareText}\n\n${ledgerProfileUrl}`;
    try {
      await navigator.clipboard.writeText(toCopy);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = toCopy;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setLinkedinPasteStep(true);
    window.open(linkedinShareOffsiteUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setCopied(false), 4000);
  }, [shareText, ledgerProfileUrl, linkedinShareOffsiteUrl]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div className="share-modal" role="dialog" aria-modal="true" aria-label="Share vouch on LinkedIn">
        <div className="share-modal-header">
          <h3>{firstPerson ? "Share your vouch on LinkedIn" : "Share this vouch on LinkedIn"}</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="share-modal-body">
          <p className="share-modal-hint">
            <strong>Open LinkedIn</strong> opens the composer with a preview of{" "}
            <strong>this person’s public ledger page</strong> (same URL as below — not the site
            homepage). Paste the copied message ({pasteKey}) so your note and the profile link both
            appear in the post.
          </p>
          {linkedinPasteStep ? (
            <div className="share-modal-paste-steps" role="status">
              <strong>Next — in the LinkedIn tab</strong>
              <ol>
                <li>
                  If you see <strong>Sign in</strong>, sign in, then use &ldquo;Open LinkedIn
                  again&rdquo; below.
                </li>
                <li>
                  You should see a composer with a preview card for{" "}
                  <strong>their ledger profile</strong> (URL below).
                </li>
                <li>
                  Press <kbd className="share-modal-kbd">{pasteKey}</kbd> to paste your message and
                  link, then post.
                </li>
              </ol>
              <button
                type="button"
                className="share-modal-reopen-linkedin"
                onClick={() => window.open(linkedinShareOffsiteUrl, "_blank", "noopener,noreferrer")}
              >
                Open LinkedIn again
              </button>
            </div>
          ) : null}
          <div className="share-modal-text">{`${shareText}\n\n${ledgerProfileUrl}`}</div>
          <div className="share-modal-links">
            <span className="share-modal-link-label">Public profile link (preview + copied text):</span>
            <a href={ledgerProfileUrl} target="_blank" rel="noopener noreferrer">
              {ledgerProfileUrl}
            </a>
          </div>
        </div>
        <div className="share-modal-actions">
          <button type="button" className="btn-linkedin-open" onClick={handlePostToLinkedIn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            {copied ? "Copied — paste in LinkedIn" : "Copy and post to LinkedIn"}
          </button>
        </div>
      </div>
    </>
  );
}
