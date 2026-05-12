"use client";

import { useState } from "react";

const SUPPORT_TIERS = [
  { 
    name: "Supporter", 
    amount: "₹99", 
    description: "Covers server infrastructure hosting for 1 month.",
    icon: "🌟"
  },
  { 
    name: "Evangelist", 
    amount: "₹299", 
    description: "Sustains high-availability cloud hosting for 3 months.",
    icon: "📣"
  },
  { 
    name: "Advocate", 
    amount: "₹599", 
    description: "Supports technical maintenance and database scaling for 6 months.",
    icon: "🛡️"
  },
  { 
    name: "Patron", 
    amount: "₹1,199", 
    description: "Funds backend security optimizations and maintenance for 6 months.",
    icon: "🚀"
  },
  { 
    name: "Shot in the arm", 
    amount: "₹1,199", 
    description: "Funds the development of a specific new feature or API update.",
    icon: "💉"
  },
  { 
    name: "Steward", 
    amount: "₹2,499", 
    description: "Funds comprehensive system integrity monitoring for 1 year.",
    icon: "🤝"
  },
  { 
    name: "Founding Member", 
    amount: "₹4,999", 
    description: "Ensures long-term sustainability and baseline technical support.",
    icon: "💎"
  },
  { 
    name: "Infrastructure Guardian", 
    amount: "₹9,999", 
    description: "Funds deeper security audits and performance tuning for the ledger.",
    icon: "🏰"
  },
  { 
    name: "Architecture Partner", 
    amount: "₹24,999", 
    description: "Supports R&D for advanced trust algorithms and cross-platform syncing.",
    icon: "🏗️"
  },
  { 
    name: "Ecosystem Anchor", 
    amount: "₹49,999", 
    description: "Provides foundational support for enterprise-grade scalability.",
    icon: "⚓"
  }
];

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
          <span className="hero-badge" style={{ marginBottom: '0.75rem' }}>Support the Developer</span>
          <h3>Support ProHealthLedger.org</h3>
        </div>
        
        <p className="support-card-text">
          If you value this SaaS utility and technical accountability tool, support the maintenance and ongoing development of this open-source ledger provided by an independent developer.
        </p>
        
        <div className="support-tiers-grid">
          {SUPPORT_TIERS.map((tier) => (
            <div key={tier.name} className="support-tier-card">
              <div className="support-tier-icon">{tier.icon}</div>
              <div className="support-tier-name">{tier.name}</div>
              <div className="support-tier-amount">{tier.amount}</div>
              <div className="support-tier-desc">{tier.description}</div>
            </div>
          ))}
        </div>

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
