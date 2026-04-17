"use client";

import { useEffect } from "react";

export default function CommentReadModal({ professional, issue, text, onClose }) {
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
      <div
        className="comment-read-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-read-title"
      >
        <div className="comment-read-modal-header">
          <h3 id="comment-read-title">Comment</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="comment-read-modal-meta">
          {professional}
          {issue != null ? ` · Record #${issue}` : ""}
        </p>
        <div className="comment-read-modal-body">{text}</div>
      </div>
    </>
  );
}
