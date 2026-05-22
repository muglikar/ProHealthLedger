"use client";

import { useState } from "react";

export default function CiteVouchModal({ vouch, profileSlug, publicName, onClose }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = `https://prohealthledger.org/p/directory/directory/${encodeURIComponent(profileSlug)}`;
  
  const citationHtml = `<blockquote cite="${profileUrl}">
  <p>"${vouch.reason || vouch.comment || 'Verified professional vouch for conduct and behavior.'}"</p>
  <footer>— Vouch by <strong>${vouch.display_name || vouch.user || 'Verified Professional'}</strong> on <a href="${profileUrl}">ProHealthLedger</a></footer>
</blockquote>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citationHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal-close" onClick={onClose}>&times;</button>
        <h2>Cite this Vouch</h2>
        <p style={{ marginBottom: "15px", color: "#64748b" }}>
          Copy this HTML snippet to embed a citation of this vouch directly on your blog, portfolio, or website.
        </p>
        
        <textarea 
          readOnly 
          value={citationHtml} 
          style={{ width: "100%", height: "120px", padding: "10px", fontFamily: "monospace", fontSize: "14px", backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "15px" }}
        />
        
        <button 
          onClick={handleCopy}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {copied ? "Copied to Clipboard!" : "Copy HTML Snippet"}
        </button>
      </div>
    </div>
  );
}
