"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSession, signIn, getProviders } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trackEvent } from "@/lib/telemetry";
import OnboardingTour from "../components/OnboardingTour";

function SubmitPageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const initialLinkedin = searchParams.get("linkedin") || "";
  const [hasLinkedIn, setHasLinkedIn] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedin);
  const [vote, setVote] = useState("");
  const [reason, setReason] = useState("");
  const [submitterLinkedinUrl, setSubmitterLinkedinUrl] = useState("");
  const [submitterCapacity, setSubmitterCapacity] = useState("");
  const [votedCapacity, setVotedCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showTour, setShowTour] = useState(false);

  // Real-time profile preview state
  const [preview, setPreview] = useState(null); // { name, photo } | null
  const [previewLoading, setPreviewLoading] = useState(false);
  const [photoFlagged, setPhotoFlagged] = useState(false);
  const previewAbortRef = useRef(null);

  useEffect(() => {
    getProviders().then((p) => setHasLinkedIn(Boolean(p?.linkedin)));
    trackEvent("vouch_page_view");
  }, []);

  // Extract slug from a LinkedIn URL
  const extractSlug = useCallback((url) => {
    const m = (url || "").match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    return m ? m[1].toLowerCase() : null;
  }, []);

  // Debounced profile preview fetch when LinkedIn URL changes
  useEffect(() => {
    const slug = extractSlug(linkedinUrl);
    if (!slug) {
      setPreview(null);
      setPreviewLoading(false);
      setPhotoFlagged(false);
      return;
    }

    setPreviewLoading(true);
    setPhotoFlagged(false);

    // Cancel any in-flight request
    if (previewAbortRef.current) previewAbortRef.current.abort();

    const timer = setTimeout(() => {
      const ctrl = new AbortController();
      previewAbortRef.current = ctrl;

      fetch(`/api/preview-profile?slug=${encodeURIComponent(slug)}`, {
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          setPreview(data);
          setPreviewLoading(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setPreview(null);
            setPreviewLoading(false);
          }
        });
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [linkedinUrl, extractSlug]);

  useEffect(() => {
    if (preview?.userVote?.voted) {
      setVote(preview.userVote.vote);
      setReason(preview.userVote.reason || "");
    } else if (preview) {
      setVote("");
      setReason("");
    }
  }, [preview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = { linkedinUrl, vote, reason, submitterCapacity, votedCapacity, photoFlagged };
      if (!session?.linkedinProfileUrl) {
        payload.submitterLinkedinUrl = submitterLinkedinUrl;
      }
      const res = await fetch("/api/submit-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        const text = await res.text().catch(() => "");
        setError(`Failed to parse response (${res.status} ${res.statusText}): ${text.slice(0, 150)}`);
        return;
      }

      if (!res.ok) {
        setError(data.error || `HTTP error ${res.status}`);
        return;
      }

      setResult(data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("prohl-vote-recorded"));
      }
      trackEvent("vouch_success", { vote });
      setLinkedinUrl("");
      setVote("");
      setReason("");
      setSubmitterCapacity("");
      setVotedCapacity("");
      setSubmitterLinkedinUrl("");
      setPreview(null);
      setPhotoFlagged(false);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
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
        <p className="submit-hero-sub">
          <Link href="/">What the heck is this?</Link>
        </p>
        <p>
          Sign in to submit your vote. We verify your identity so each person
          can only vote once per professional — no duplicates allowed.
        </p>
        <div className="signin-options">
          <button
            className="btn btn-signin btn-github"
            onClick={() => {
              trackEvent("vouch_signin_click", { provider: "github" });
              signIn("github");
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
          {hasLinkedIn && (
            <button
              className="btn btn-signin btn-linkedin"
              onClick={() => {
                trackEvent("vouch_signin_click", { provider: "linkedin" });
                signIn("linkedin");
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Continue with LinkedIn
            </button>
          )}
        </div>

        <aside className="speak-up-box" aria-label="Your rights" style={{ marginTop: 32 }}>
          <span className="speak-up-icon" aria-hidden>🛡️</span>
          <div className="speak-up-body">
            <h3>It&apos;s safe to speak up.</h3>
            <p>
              &ldquo;Would I work with them again?&rdquo; — only you can answer
              that. Your honest yes-or-no is a personal opinion, not a factual
              allegation, and good-faith opinions for public good are protected
              expression under law. Every reason or comment submission is reviewed
              by a moderator before publishing.
            </p>
            <p className="speak-up-disclaimer">
              This is not legal advice. Laws vary by jurisdiction; consult a
              qualified lawyer if you have specific concerns.
            </p>
          </div>
        </aside>

        <div className="submit-steps" style={{ marginTop: 48 }}>
          <div className="submit-step">
            <h3>Why sign in?</h3>
            <p>
              Every vote is tied to a real identity. This prevents anonymous
              abuse and ensures accountability.
            </p>
          </div>
          <div className="submit-step">
            <h3>What happens?</h3>
            <p>
              You answer one question about a professional. Your vote is
              permanent and public. You can add or edit your comment/reason once after submitting.
            </p>
          </div>
          <div className="submit-step">
            <h3>Positivity first</h3>
            <p>
              Your first contribution must be a positive vouch. After that,
              each <strong>positive vouch</strong> earns <strong>1 flag</strong>{" "}
              credit; each negative vote uses one credit.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {!result && <OnboardingTour isOpen={showTour} onClose={() => setShowTour(false)} />}
      <section className="submit-hero">
        <div className="submit-hero-header">
          <div className="submit-hero-title-wrap">
            <h1 data-tour="step-welcome">Share Your Experience</h1>
            <button className="btn-tour-trigger" onClick={() => setShowTour(true)} aria-label="Take a guided tour">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
              TAKE A TOUR
            </button>
          </div>
        </div>
        <p className="submit-hero-sub">
          <Link href="/">What the heck is this?</Link>
        </p>
        <p>
          Signed in as <strong>{session.displayName || session.userId}</strong>. Your vote is
          permanent, public, and tied to your identity.
        </p>
      </section>

      <aside className="speak-up-box" aria-label="Your rights">
        <span className="speak-up-icon" aria-hidden>🛡️</span>
        <div className="speak-up-body">
          <h3>It&apos;s safe to speak up.</h3>
          <p>
            &ldquo;Would I work with them again?&rdquo; — only you can answer
            that. Your honest yes-or-no is a personal opinion, not a factual
            allegation, and good-faith opinions for public good are protected
            expression under law. Every reason or comment submission is reviewed
            by a moderator before publishing.
          </p>
          <p className="speak-up-disclaimer">
            This is not legal advice. Laws vary by jurisdiction; consult a
            qualified lawyer if you have specific concerns.
          </p>
        </div>
      </aside>

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
          
          {!session.linkedinProfileUrl && (
            <div className="form-group" style={{ padding: '16px', background: 'var(--bg-warm)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-light)' }}>
              <label htmlFor="submitter-linkedin" style={{ color: 'var(--accent)', fontWeight: '700' }}>
                Your LinkedIn Profile URL
              </label>
              <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                We couldn&apos;t automatically verify your profile link. For accountability, please paste your full LinkedIn profile URL below.
              </p>
              <input
                id="submitter-linkedin"
                type="url"
                className="form-input"
                placeholder="https://www.linkedin.com/in/your-profile"
                value={submitterLinkedinUrl}
                onChange={(e) => setSubmitterLinkedinUrl(e.target.value)}
                required
              />
              <span className="form-hint">
                This is required once so your votes can be verified by others.
              </span>
            </div>
          )}

          <div className="form-group" data-tour="step-linkedin">
            <label htmlFor="linkedin">Write Linkedin Profile URL of the person you want to vouch or flag.</label>
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

            {/* Real-time profile preview */}
            {previewLoading && (
              <div className="profile-preview-card">
                <div className="profile-preview-loading">
                  <span className="profile-preview-spinner" />
                  Looking up profile…
                </div>
              </div>
            )}
            {!previewLoading && preview && (preview.name || preview.photo) && (
              <div className="profile-preview-card">
                <div className="profile-preview-header">
                  {preview.photo && !photoFlagged ? (
                    <img
                      src={preview.photo}
                      alt=""
                      className="profile-preview-photo"
                      width={56}
                      height={56}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <span className="profile-preview-photo profile-preview-initials">
                      {(preview.name || "?")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() || "")
                        .join("")}
                    </span>
                  )}
                  <div className="profile-preview-info">
                    <span className="profile-preview-name">
                      {preview.name || extractSlug(linkedinUrl) || "Profile"}
                    </span>
                    <span className="profile-preview-badge">Profile found ✓</span>
                  </div>
                </div>
                {preview.photo && (
                  <label className="profile-preview-flag">
                    <input
                      type="checkbox"
                      checked={photoFlagged}
                      onChange={(e) => setPhotoFlagged(e.target.checked)}
                    />
                    Not the right photo?
                  </label>
                )}
              </div>
            )}
          </div>


          <div className="form-group">
            <label data-tour="step-vote">
              Based on your experience, would you work with/for them again?
            </label>
            <div className="vote-options">
              <div className="vote-option-container">
                <button
                  type="button"
                  className={`vote-option vote-option-yes${vote === "yes" ? " selected" : ""}`}
                  onClick={() => {
                    if (!preview?.userVote?.voted) {
                      setVote("yes");
                    }
                  }}
                  style={preview?.userVote?.voted ? { cursor: "not-allowed", opacity: vote === "yes" ? 1 : 0.4 } : {}}
                >
                  <span className="vote-option-icon">✓</span>
                  <span>Yes, I would</span>
                </button>
                <span className="vote-option-label label-vouch">Vouch</span>
              </div>
              <div className="vote-option-container">
                <button
                  type="button"
                  className={`vote-option vote-option-no${vote === "no" ? " selected" : ""}`}
                  onClick={() => {
                    if (!preview?.userVote?.voted) {
                      setVote("no");
                    }
                  }}
                  style={preview?.userVote?.voted ? { cursor: "not-allowed", opacity: vote === "no" ? 1 : 0.4 } : {}}
                >
                  <span className="vote-option-icon">✗</span>
                  <span>No, I would not</span>
                </button>
                <span className="vote-option-label label-flag">Flag</span>
              </div>
            </div>
          </div>

          <div className="form-group" data-tour="step-capacity-submitter">
            <label htmlFor="submitter-capacity">Your Role & Organization (optional)</label>
            <input
              id="submitter-capacity"
              type="text"
              className="form-input"
              placeholder="e.g. Engineering Manager at Acme Corp"
              value={submitterCapacity}
              onChange={(e) => setSubmitterCapacity(e.target.value)}
            />
          </div>

          <div className="form-group" data-tour="step-capacity-voted">
            <label htmlFor="voted-capacity">Their Role & Organization (optional)</label>
            <input
              id="voted-capacity"
              type="text"
              className="form-input"
              placeholder="e.g. Senior Developer at Acme Corp"
              value={votedCapacity}
              onChange={(e) => setVotedCapacity(e.target.value)}
            />
          </div>

          <div className="form-group" data-tour="step-reason">
            <label htmlFor="reason">Brief reason (optional)</label>
            {preview?.userVote?.voted && (
              <div style={{
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "12px",
                background: preview.userVote.reason_edited ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                border: `1px dashed ${preview.userVote.reason_edited ? "var(--error)" : "var(--accent)"}`,
                color: preview.userVote.reason_edited ? "var(--error)" : "var(--accent)"
              }}>
                {preview.userVote.reason_edited ? (
                  <strong>⚠️ You have already edited your comment/reason for this profile. You cannot edit it again.</strong>
                ) : (
                  <strong>ℹ️ You have already voted on this profile. You can add or edit your comment/reason once.</strong>
                )}
              </div>
            )}
            <textarea
              id="reason"
              className="form-textarea"
              placeholder="A short, professional note about your experience."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              disabled={preview?.userVote?.reason_edited}
            />
          </div>

          <div className="form-notice">
            By submitting, you confirm this is your genuine professional
            experience. Your vote is permanent and public. You can add or edit
            your comment/reason once after submitting.
            {reason.trim() ? (
              <span className="form-notice-mod"> Your comment will be visible after admin review.</span>
            ) : null}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={
              submitting ||
              !linkedinUrl ||
              !vote ||
              (!session.linkedinProfileUrl && !submitterLinkedinUrl) ||
              preview?.userVote?.reason_edited
            }
            data-tour="step-submit"
          >
            {submitting
              ? "Submitting…"
              : preview?.userVote?.voted
                ? "Update your comment permanently"
                : reason.trim()
                  ? "Submit vote"
                  : "Submit your vote permanently"}
          </button>
        </form>
      )}
    </>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="empty-state"><p>Loading…</p></div>}>
      <SubmitPageContent />
    </Suspense>
  );
}
