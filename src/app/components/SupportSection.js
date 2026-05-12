"use client";

import { useState } from "react";

export default function SupportSection() {
  const [showQR, setShowQR] = useState(false);

  return (
    <section className="support-card" id="support">
      <div className="support-card-content">
        <div className="support-card-header">
          <div className="support-card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="var(--accent)" fillOpacity="0.1" />
              <path d="M18 11h-4v4" />
              <path d="M14 11l4 4" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
            </svg>
          </div>
          <h3>Support ProHealthLedger.org</h3>
        </div>
        
        <p className="support-card-text">
          If you liked this idea / website, support the maintenance and ongoing development of this open-source ledger.
        </p>
        
        <div className="support-metrics">
          <div className="support-metric">
            <div className="support-metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
            <span className="support-metric-label">Maintenance</span>
          </div>
          <div className="support-metric">
            <div className="support-metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </div>
            <span className="support-metric-label">Ongoing Development</span>
          </div>
        </div>

        <div className="support-card-footer">
          <div className="support-actions">
            <button 
              className="btn btn-primary btn-upi" 
              onClick={() => setShowQR(!showQR)}
            >
              <span className="btn-icon">💝</span>
              {showQR ? "Hide Details" : "Support via UPI / QR"}
            </button>
          </div>
        </div>

        {showQR && (
          <div className="support-qr-container">
            <div className="support-qr-image-wrapper">
              <img 
                src="/support_qr.png" 
                alt="UPI QR Code" 
                className="support-qr-image"
              />
            </div>
            <div className="support-qr-info">
              <p><strong>Scan with any UPI App</strong></p>
              <p className="text-sm">GPay, PhonePe, Paytm, or any banking app</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
