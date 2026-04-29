"use client";

import { useState } from "react";

export default function RequestRemovalPage() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [email, setEmail] = useState("");
  const [verification, setVerification] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/removal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl,
          email,
          verification,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
        return;
      }
      setResult(data);
      setLinkedinUrl("");
      setEmail("");
      setVerification("");
      setDetails("");
    } catch {
      setError("Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Request Profile Removal</h1>
        <p>
          Submit your request privately. Do not open a public GitHub issue for
          this anymore.
        </p>
      </div>
      <form className="vote-form" onSubmit={onSubmit}>
        {error ? <div className="form-error">{error}</div> : null}
        {result ? (
          <div className="result-box result-success">
            <h3>Request received</h3>
            <p>{result.message}</p>
            <p className="result-detail">
              Request ID: <code>{result.requestId}</code>
            </p>
          </div>
        ) : null}
        <div className="form-group">
          <label htmlFor="linkedin-url">LinkedIn Profile URL</label>
          <input
            id="linkedin-url"
            className="form-input"
            type="url"
            required
            placeholder="https://www.linkedin.com/in/your-name"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact-email">Contact email</label>
          <input
            id="contact-email"
            className="form-input"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="verification">
            How can we verify this LinkedIn profile is yours?
          </label>
          <textarea
            id="verification"
            className="form-textarea"
            rows={3}
            required
            placeholder="Example: I can message you from this LinkedIn account."
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="details">Additional context (optional)</label>
          <textarea
            id="details"
            className="form-textarea"
            rows={3}
            placeholder="Any extra details you want us to know."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit private removal request"}
        </button>
      </form>
    </>
  );
}

