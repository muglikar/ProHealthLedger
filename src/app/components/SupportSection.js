"use client";

import { useState } from "react";

export default function SupportSection() {
  const [showQR, setShowQR] = useState(false);

  return (
    <section className="support-card" id="support">
      <div className="support-card-content">
        <div className="support-card-header">
          <span className="support-card-icon">☕</span>
          <h3>Buy Me a Coffee</h3>
        </div>
        
        <p className="support-card-text">
          If you liked this idea / website, can you buy me a few cups of Coffee?
        </p>
        
        <div className="support-metrics">
          <div className="support-metric">
            <span className="support-metric-val">10 ☕</span>
            <span className="support-metric-label">To maintain / year</span>
          </div>
          <div className="support-metric">
            <span className="support-metric-val">50 ☕</span>
            <span className="support-metric-label">To build the site</span>
          </div>
        </div>

        <div className="support-card-footer">
          <p className="support-card-subtext">
            1 Coffee ≈ $1 or ₹100
          </p>

          <div className="support-actions">
            <button 
              className="btn btn-primary btn-upi" 
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? "Hide Payment Details" : "Support via UPI / QR"}
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
