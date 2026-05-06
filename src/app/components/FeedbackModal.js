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
      <div className="comment-read-modal feedback-modal" role="dialog" aria-modal="true">
        <div className="comment-read-modal-header">
          <h3>Share Feedback</h3>
          <button type="button" className="share-modal-close" onClick={onClose}>✕</button>
        </div>

        {!session ? (
          <div className="feedback-login-gate">
            <p>Please sign in to share your feedback. We use your handle to keep our audit trail transparent.</p>
            <div className="feedback-login-actions">
              <button className="btn btn-primary" onClick={() => signIn("github")}>Sign in with GitHub</button>
              <button className="btn btn-secondary" onClick={() => signIn("linkedin")}>Sign in with LinkedIn</button>
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
      </div>
    </>
  );
}
