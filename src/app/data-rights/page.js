"use client";

import { useState } from "react";

export default function DataRightsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    jurisdiction: "",
    requestType: "",
    details: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/data-rights-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
      } else {
        setResult(data);
        setForm({
          name: "",
          email: "",
          jurisdiction: "",
          requestType: "",
          details: "",
        });
      }
    } catch {
      setError("Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Data Subject Rights Request</h1>
        <p>
          DPDP / GDPR / CCPA access, correction, deletion, objection, and
          portability requests can be filed here privately.
        </p>
      </div>
      <form className="vote-form" onSubmit={submit}>
        {error ? <div className="form-error">{error}</div> : null}
        {result ? (
          <div className="result-box result-success">
            <h3>Request submitted</h3>
            <p>Request ID: <code>{result.requestId}</code></p>
          </div>
        ) : null}
        <div className="form-group">
          <label>Name</label>
          <input
            className="form-input"
            required
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            className="form-input"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Jurisdiction</label>
          <input
            className="form-input"
            required
            placeholder="India / EU / UK / US-CA / Other"
            value={form.jurisdiction}
            onChange={(e) =>
              setForm((s) => ({ ...s, jurisdiction: e.target.value }))
            }
          />
        </div>
        <div className="form-group">
          <label>Request type</label>
          <select
            className="form-input"
            required
            value={form.requestType}
            onChange={(e) =>
              setForm((s) => ({ ...s, requestType: e.target.value }))
            }
          >
            <option value="">Select…</option>
            <option value="access">Access</option>
            <option value="correction">Correction</option>
            <option value="erasure">Erasure</option>
            <option value="objection">Objection</option>
            <option value="portability">Portability</option>
            <option value="consent-withdrawal">Consent withdrawal</option>
          </select>
        </div>
        <div className="form-group">
          <label>Details</label>
          <textarea
            className="form-textarea"
            rows={4}
            required
            value={form.details}
            onChange={(e) =>
              setForm((s) => ({ ...s, details: e.target.value }))
            }
          />
        </div>
        <button className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit data-rights request"}
        </button>
      </form>
    </>
  );
}

