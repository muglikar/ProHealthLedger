"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";

export default function VerifyReminderStrip() {
  const { data: session, status } = useSession();
  const [myLinkedSlug, setMyLinkedSlug] = useState("");
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Load status
  useEffect(() => {
    setMounted(true);
    if (session?.linkedinVanity) {
      setMyLinkedSlug(session.linkedinVanity);
    } else {
      try {
        setMyLinkedSlug(localStorage.getItem("phl_my_slug") || "");
      } catch {
        setMyLinkedSlug("");
      }
    }
  }, [session?.linkedinVanity]);

  const handleLink = useCallback(() => {
    const url = window.prompt(
      "To verify your identity and unlock sharing for vouches given to you, paste your LinkedIn profile URL:\n\nExample: https://www.linkedin.com/in/your-name"
    );
    if (!url) return;
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const slug = match[1].toLowerCase();
      localStorage.setItem("phl_my_slug", slug);
      setMyLinkedSlug(slug);
      // Logic for page to refresh or state to propagate would happen naturally
      // via shared localstorage or just a simple state update here.
      window.location.reload(); // Refresh to ensure all components sync up
    } else {
      alert("Invalid LinkedIn URL. Please use a link like https://www.linkedin.com/in/your-name");
    }
  }, []);

  if (!mounted || status !== "authenticated" || myLinkedSlug || dismissed) return null;

  return (
    <aside className="verify-reminder-strip" role="alert">
      <div className="verify-reminder-inner">
        <span className="verify-reminder-icon">🛡️</span>
        <p className="verify-reminder-msg">
          <strong>Verify your identity</strong> to share vouches people have given you. 
          Paste your LinkedIn URL to complete the mapping.
        </p>
        <div className="verify-reminder-actions">
          <button type="button" className="verify-reminder-btn" onClick={handleLink}>
            Verify Now
          </button>
          <button type="button" className="verify-reminder-dismiss" onClick={() => setDismissed(true)}>
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
