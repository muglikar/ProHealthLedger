"use client";

import { useEffect } from "react";

export default function CommentReadModal({
  professional,
  vote,
  submittedBy,
  date,
  issue,
  recordHref,
  linkedinUrl,
  text,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const voteLabel =
    vote === "yes" ? "Yes" : vote === "no" ? "No" : vote ? String(vote) : "—";

  const professionalCell =
    linkedinUrl && typeof linkedinUrl === "string" && linkedinUrl.startsWith("http") ? (
      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="issue-link">
        {professional || "—"}
      </a>
    ) : (
      professional || "—"
    );

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div
        className="comment-read-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-read-title"
      >
        <div className="comment-read-modal-header">
          <h3 id="comment-read-title">Vote and comment</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="comment-read-modal-details" role="region" aria-label="Vote row details">
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Professional</span>
            <span className="comment-read-modal-v">{professionalCell}</span>
          </div>
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Would work with again?</span>
            <span className="comment-read-modal-v">
              {vote === "yes" || vote === "no" ? (
                <span className={`vote-pill ${vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
                  {voteLabel}
                </span>
              ) : (
                voteLabel
              )}
            </span>
          </div>
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Submitted by</span>
            <span className="comment-read-modal-v">{submittedBy || "—"}</span>
          </div>
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Date</span>
            <span className="comment-read-modal-v">{date || "—"}</span>
          </div>
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Record</span>
            <span className="comment-read-modal-v">
              {issue != null && recordHref ? (
                <a href={recordHref} target="_blank" rel="noopener noreferrer" className="issue-link">
                  #{issue}
                </a>
              ) : issue != null ? (
                `#${issue}`
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>

        <div className="comment-read-modal-comment-section">
          <h4 className="comment-read-modal-comment-heading">Comment</h4>
          <div className="comment-read-modal-body">{text}</div>
        </div>
      </div>
    </>
  );
}
