"use client";

import { useState } from "react";

export default function VerificationBadgeModal({ profileSlug, publicName, onClose }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = `https://prohealthledger.org/p/directory/directory/${encodeURIComponent(profileSlug)}`;
  
  const embedHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-family: -apple-system, system-ui, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 10px 20px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); border: 1px solid rgba(255,255,255,0.2);">
  <span style="margin-right: 6px; font-size: 15px;">💎</span> Verified Professional on Pro-Health Ledger
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
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Get Your Verification Badge</h3>
          <button className="share-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="share-modal-body">
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
    </div>
  );
}
