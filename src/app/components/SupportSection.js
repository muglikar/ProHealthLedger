"use client";

import { useState } from "react";

export default function SupportSection() {
  const [showQR, setShowQR] = useState(false);

  return (
    <section className="support-card" id="support">
      <div className="support-card-content">
        <div className="support-card-header">
          <div className="support-card-icon">
            <img 
              src="/icons/support.png" 
              alt="Support Icon" 
              width="80" 
              height="80"
            />
          </div>
          <h3>Support ProHealthLedger.org</h3>
        </div>
        
        <p className="support-card-text">
          If you liked this idea / website, support the maintenance and ongoing development of this open-source ledger.
        </p>
        
        <div className="support-metrics">
          <div className="support-metric">
            <div className="support-metric-icon">
              <img 
                src="/icons/maintenance.png" 
                alt="Maintenance Icon" 
                width="48" 
                height="48"
              />
            </div>
            <span className="support-metric-label">Maintenance</span>
          </div>
          <div className="support-metric">
            <div className="support-metric-icon">
              <img 
                src="/icons/software-development.png" 
                alt="Development Icon" 
                width="48" 
                height="48"
              />
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
