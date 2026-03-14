"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function SubmitPage() {
  const { data: session, status } = useSession();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [vote, setVote] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/submit-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl, vote, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setResult(data);
      setLinkedinUrl("");
      setVote("");
      setReason("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <section className="submit-hero">
        <h1>Share Your Experience</h1>
        <p>
          Sign in to submit your vote. We use your GitHub account to verify
          your identity and ensure one vote per person per profile.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => signIn("github")}
        >
          Sign in with GitHub to continue
        </button>
        <div className="submit-steps" style={{ marginTop: 48 }}>
          <div className="submit-step">
            <h3>Why sign in?</h3>
            <p>
              Every vote is tied to a real identity. This prevents anonymous
              abuse and ensures accountability. Your GitHub username is shown
              publicly alongside your vote.
            </p>
          </div>
          <div className="submit-step">
            <h3>What happens?</h3>
            <p>
              You answer one question about a professional. Your vote is
              permanently recorded and cannot be edited or deleted.
            </p>
          </div>
          <div className="submit-step">
            <h3>Positivity first</h3>
            <p>
              Your first vote must be positive — vouch for someone before
              you can flag anyone. This keeps the community constructive.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="submit-hero">
        <h1>Share Your Experience</h1>
        <p>
          Signed in as <strong>@{session.username}</strong>. Your vote is
          permanent, public, and tied to your identity.
        </p>
      </section>

      {result ? (
        <div className="result-box result-success">
          <div className="result-icon">✓</div>
          <h3>Vote recorded</h3>
          <p>{result.message}</p>
          <p className="result-detail">
            Profile now has {result.profile.votes.yes} positive and{" "}
            {result.profile.votes.no} negative votes.
          </p>
          <div className="result-actions">
            <button
              className="btn btn-primary"
              onClick={() => setResult(null)}
            >
              Submit another vote
            </button>
            <Link href="/profiles" className="btn btn-secondary">
              View profiles
            </Link>
          </div>
        </div>
      ) : (
        <form className="vote-form" onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              <strong>Cannot submit:</strong> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="linkedin">LinkedIn Profile URL</label>
            <input
              id="linkedin"
              type="url"
              className="form-input"
              placeholder="https://www.linkedin.com/in/jane-doe"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              required
            />
            <span className="form-hint">
              Paste the full LinkedIn profile link of the person.
            </span>
          </div>

          <div className="form-group">
            <label>
              Based on your experience, would you work with/for them again?
            </label>
            <div className="vote-options">
              <button
                type="button"
                className={`vote-option vote-option-yes${vote === "yes" ? " selected" : ""}`}
                onClick={() => setVote("yes")}
              >
                <span className="vote-option-icon">✓</span>
                <span>Yes, I would</span>
              </button>
              <button
                type="button"
                className={`vote-option vote-option-no${vote === "no" ? " selected" : ""}`}
                onClick={() => setVote("no")}
              >
                <span className="vote-option-icon">✗</span>
                <span>No, I would not</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Brief reason (optional)</label>
            <textarea
              id="reason"
              className="form-textarea"
              placeholder="A short, professional note about your experience."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-notice">
            By submitting, you confirm this is your genuine professional
            experience. Your vote is permanent, public, and cannot be edited.
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting || !linkedinUrl || !vote}
          >
            {submitting ? "Submitting…" : "Submit your vote permanently"}
          </button>
        </form>
      )}
    </>
  );
}
