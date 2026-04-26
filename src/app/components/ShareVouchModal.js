"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

const SITE_URL = "https://prohealthledger.org";

function buildShareText(displayName, firstPerson = false) {
  if (firstPerson) {
    const firstPersonOptions = [
      "Your professional career track record belongs to you — not to the HR department of your previous company.\n\n" +
      "I'm building my portable reputation on Pro-Health Ledger. Massive thanks to the colleagues and partners who have already staked their own reputation to vouch for my work. Transparency creates accountability, and I believe the best way to do business is out in the open.\n\n" +
      "If we've worked together, I'd be honored if you added your experience to my Professional-Health Ledger. And the next time you're evaluating a partner or hire, look them up.\n\n" +
      "Check out my track record here:",

      "Your career's reputation belongs to you — not to your previous company's HR department.\n\n" +
      "I'm building my portable reputation on Pro-Health Ledger. Transparency creates accountability, and the best way to do business is out in the open.\n\n" +
      "Big thanks to those who have already staked their reputation to vouch for my work. If we’ve worked together, I’d be honored to have your honest review on my Professional Health Ledger.\n\n" +
      "Before your next hire or partnership, look them up. If they aren’t here, ask them to bring their track record to the table.\n\n" +
      "Check out my public Professional Health Ledger:"
    ];
    return firstPersonOptions[Math.floor(Math.random() * firstPersonOptions.length)];
  }

  const thirdPersonOptions = [
    "Traditional reference checks are broken—nobody lists references who won’t say nice things. A professional track record shouldn't vanish when you change companies; it should be portable.\n\n" +
    `I just staked my own professional reputation on Pro-Health Ledger to officially vouch for my friend and colleague, ${displayName}'s work ethic.\n\n` +
    "Before you finalize your next hire or partnership, check if they have a public Professional Health Ledger on ProHealthLedger.org. If they aren't there yet, ask them to bring their professional references to the table.\n\n" +
    `You can see my vouch for ${displayName} here:`,

    "In a world of generic LinkedIn endorsements, I wanted to put something more meaningful on the record for " + displayName + ".\n\n" +
    "I just added my official vouch for them on Pro-Health Ledger. Your reputation is your most valuable asset, and it's time we start actively building public, verified track records.\n\n" +
    "Who is the best person you've worked with recently? Look them up. If they aren't on the Pro-Health Ledger yet, be the first one to start their portable reputation.\n\n" +
    `Read my vouch for ${displayName} here:`,

    "Resumes tell you what someone did. A verified vouch tells you how they did it and how they treat people.\n\n" +
    `I just added an official vouch for ${displayName} on Pro-Health Ledger — an immutable record of how people actually work. It's time we start actively building public, portable track records.\n\n` +
    "Who’s the best person you've worked with recently? Look them up. If they aren't on the Pro-Health Ledger yet, be the first to start their portable reputation.\n\n" +
    `Read my vouch for ${displayName}:`
  ];

  return thirdPersonOptions[Math.floor(Math.random() * thirdPersonOptions.length)];
}

export default function ShareVouchModal({ data, onClose, firstPerson = false }) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [linkedinPasteStep, setLinkedinPasteStep] = useState(false);
  const [postingDirect, setPostingDirect] = useState(false);
  const [directPostResult, setDirectPostResult] = useState(null); // "success" | "error" | null
  const pasteKey =
    typeof navigator !== "undefined" &&
    (navigator.platform?.includes("Mac") || /Mac|iPhone|iPad/.test(navigator.userAgent || ""))
      ? "⌘V"
      : "Ctrl+V";

  const [refCode, setRefCode] = useState("");

  const displayName = formatProfessionalDisplayName(
    data.profile_slug,
    data.public_name
  );
  const shareText = useMemo(() => buildShareText(displayName, firstPerson), [displayName, firstPerson]);
  const slug = typeof data.profile_slug === "string" ? data.profile_slug.trim() : "";
  const baseProfileUrl = slug
    ? `${SITE_URL}/profiles?search=${encodeURIComponent(slug)}`
    : `${SITE_URL}/profiles`;
  
  const ledgerProfileUrl = refCode ? `${baseProfileUrl}${baseProfileUrl.includes("?") ? "&" : "?"}ref=${refCode}` : baseProfileUrl;

  const linkedinShareOffsiteUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ledgerProfileUrl)}`;

  useEffect(() => {
    setLinkedinPasteStep(false);
    setCopied(false);
    setRefCode("");

    // Generate referral link for tracking
    fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileSlug: data.profile_slug,
        profileName: data.public_name,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.refCode) {
          setRefCode(json.refCode);
        }
      })
      .catch((err) => console.error("Failed to generate referral code", err));
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

  const handleDirectPost = useCallback(async () => {
    setPostingDirect(true);
    setDirectPostResult(null);
    setDirectPostErrorDetails("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s client-side timeout

    try {
      const res = await fetch("/api/share-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentary: `${shareText}\n\n${ledgerProfileUrl}`,
          articleUrl: ledgerProfileUrl,
          articleTitle: `Professional Health Ledger — ${displayName}`,
          articleDescription: "See verified professional vouches on Pro-Health Ledger",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let json;
      try {
        json = await res.json();
      } catch (e) {
        throw new Error("Invalid server response format.");
      }

      if (res.ok && json.ok) {
        setDirectPostResult("success");
      } else {
        console.error("Direct post failed:", json);
        setDirectPostResult("error");
        if (res.status === 403 || json.status === 403) {
          setDirectPostErrorDetails("Permission denied (403). Ensure you've re-logged in and granted 'Share on LinkedIn' access.");
        } else if (res.status === 504 || res.status === 502) {
          setDirectPostErrorDetails("LinkedIn is taking too long to respond. Please try the manual method.");
        } else {
          setDirectPostErrorDetails(json.error || "LinkedIn rejected the post.");
        }
      }
    } catch (err) {
      console.error("Direct post error:", err);
      setDirectPostResult("error");
      if (err.name === "AbortError") {
        setDirectPostErrorDetails("Request timed out. LinkedIn's response is taking too long.");
      } else {
        setDirectPostErrorDetails("Network error while reaching our server.");
      }
    } finally {
      clearTimeout(timeoutId);
      setPostingDirect(false);
    }
  }, [shareText, ledgerProfileUrl, displayName]);

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
          {session?.canPostToLinkedIn ? (
            <>
              {directPostResult === "success" ? (
                <div className="share-modal-success" role="status">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <strong>Posted to your LinkedIn feed!</strong>
                </div>
              ) : directPostResult === "error" ? (
                <div className="share-modal-error" role="alert">
                  <p><strong>Direct posting failed.</strong></p>
                  <p className="error-details">{directPostErrorDetails || "LinkedIn rejected the post."}</p>
                  <div className="error-fallback-cta">
                    <button type="button" className="btn-linkedin-open" onClick={handlePostToLinkedIn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      {copied ? "Copied! Paste manually now" : "Use manual share instead"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-linkedin-direct"
                  onClick={handleDirectPost}
                  disabled={postingDirect}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  {postingDirect ? "Posting…" : "Post to LinkedIn"}
                </button>
              )}
            </>
          ) : (
            <button type="button" className="btn-linkedin-open" onClick={handlePostToLinkedIn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              {copied ? "Copied — paste in LinkedIn" : "Copy and post to LinkedIn"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
