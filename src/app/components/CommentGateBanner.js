"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CommentGateBanner({ session, viewCreditActive, hasVouchedBefore }) {
  const [dismissed, setDismissed] = useState(true); // default to true until hydration/mount

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("comment-gate-dismissed");
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("comment-gate-dismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const isLoggedIn = !!session;
  
  // Variant selection
  let titleText = "Comments are locked";
  let descText = "";
  let ctaText = "Sign in to Vouch";
  let ctaHref = "/submit";
  let isExpired = false;

  if (!isLoggedIn) {
    descText = "Sign in and vouch for 1 boss or colleague to unlock all comments and reasons for 1 week.";
  } else if (hasVouchedBefore && !viewCreditActive) {
    descText = "Your viewing credit has expired. Vouch for another boss or colleague to renew full access for 1 week.";
    ctaText = "Vouch to Renew";
    isExpired = true;
  } else if (!hasVouchedBefore && !viewCreditActive) {
    descText = "Submit your first vouch to unlock all comments and reasons for 1 week.";
    ctaText = "Vouch Now";
  } else {
    // If they have active credit, don't show the banner at all
    return null;
  }

  return (
    <div className={`comment-gate-banner${isExpired ? " comment-gate-banner--expired" : ""}`} role="alert">
      <span className="comment-gate-banner-icon" aria-hidden>💬</span>
      <div className="comment-gate-banner-body">
        <strong>{titleText}</strong>
        <p style={{ margin: "4px 0 0 0" }}>
          {descText}{" "}
          <Link href={ctaHref}>
            {ctaText} &rarr;
          </Link>
        </p>
      </div>
      <button 
        type="button" 
        className="comment-gate-banner-dismiss" 
        onClick={handleDismiss} 
        aria-label="Dismiss banner"
      >
        &times;
      </button>
    </div>
  );
}
