"use client";

import { useState } from "react";

export default function VerificationBadgeModal({ profileSlug, publicName, onClose }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = `https://prohealthledger.org/p/directory/directory/${encodeURIComponent(profileSlug)}`;
  
  const embedHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-family: sans-serif; font-size: 14px; font-weight: bold; color: #fff; background-color: #2563eb; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
  ✓ Verified Professional on PHL
</a>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedHtml);
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
        <h2>Get Your Verification Badge</h2>
        <p style={{ marginBottom: "15px", color: "#64748b" }}>
          You have verified community vouches! Add this badge to your personal website or portfolio to build trust and increase your SEO authority.
        </p>
        
        <div style={{ padding: "20px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "15px" }}>
          <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
        </div>

        <textarea 
          readOnly 
          value={embedHtml} 
          style={{ width: "100%", height: "100px", padding: "10px", fontFamily: "monospace", fontSize: "14px", backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "15px" }}
        />
        
        <button 
          onClick={handleCopy}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {copied ? "Copied to Clipboard!" : "Copy Embed Code"}
        </button>
      </div>
    </div>
  );
}
