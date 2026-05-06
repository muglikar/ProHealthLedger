"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

export default function FeedbackModal({ onClose }) {
  const { data: session } = useSession();
  const [type, setType] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [recommend, setRecommend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ type, message, recommend }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div className="feedback-modal-container feedback-modal" role="dialog" aria-modal="true">
        <div className="comment-read-modal-header">
          <h3>Share Feedback</h3>
          <button type="button" className="share-modal-close" onClick={onClose}>✕</button>
        </div>

        {!session ? (
          <div className="feedback-login-gate">
            <p>Please sign in to share your feedback. We use your handle to keep our audit trail transparent.</p>
            <div className="feedback-login-actions">
              <button
                className="btn btn-signin btn-github"
                onClick={() => signIn("github", { callbackUrl: window.location.href.split('?')[0] + "?feedback=true" })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
              <button
                className="btn btn-signin btn-linkedin"
                onClick={() => signIn("linkedin", { callbackUrl: window.location.href.split('?')[0] + "?feedback=true" })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Continue with LinkedIn
              </button>
            </div>
          </div>
        ) : success ? (
          <div className="feedback-success">
            <div className="feedback-success-icon">✅</div>
            <p>Thank you! Your feedback has been recorded.</p>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Feedback Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="suggestion">Suggestion</option>
                <option value="bug">Bug Report</option>
                <option value="praise">General Praise</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                placeholder="What's on your mind? (Max 500 chars)"
                maxLength={500}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="form-group form-group-inline">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={recommend}
                  onChange={(e) => setRecommend(e.target.checked)}
                />
                Would you recommend PHL to a colleague?
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="feedback-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
