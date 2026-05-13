"use client";

import { useState, useEffect, useRef } from "react";

function RazorpayButton({ buttonId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!buttonId) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Clear and re-inject exactly as Razorpay expects
    container.innerHTML = "";
    
    const form = document.createElement("form");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.dataset.payment_button_id = buttonId;
    // Removing async as it might cause the script to execute outside the parent context
    
    form.appendChild(script);
    container.appendChild(form);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [buttonId]);

  return (
    <div 
      key={buttonId} 
      ref={containerRef} 
      className="razorpay-button-container" 
      style={{ minHeight: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    />
  );
}

const SUPPORT_TIERS = [
  { 
    id: "supporter",
    name: "Supporter", 
    amount: "99", 
    description: "Covers server infrastructure hosting for 1 month.",
    icon: "🌟",
    razorpayId: "pl_Sok3VlpzXQxTPS"
  },
  { 
    id: "evangelist",
    name: "Evangelist", 
    amount: "299", 
    description: "Sustains high-availability cloud hosting for 3 months.",
    icon: "📣",
    razorpayId: null 
  },
  { 
    id: "advocate",
    name: "Advocate", 
    amount: "599", 
    description: "Supports technical maintenance and database scaling for 6 months.",
    icon: "🛡️"
  },
  { 
    id: "patron",
    name: "Patron", 
    amount: "1,199", 
    description: "Funds backend security optimizations and maintenance for 6 months.",
    icon: "🚀"
  },
  { 
    id: "shot",
    name: "Shot in the arm", 
    amount: "1,199", 
    description: "Funds the development of a specific new feature or API update.",
    icon: "💉"
  },
  { 
    id: "steward",
    name: "Steward", 
    amount: "2,499", 
    description: "Funds comprehensive system integrity monitoring for 1 year.",
    icon: "🤝"
  },
  { 
    id: "founding",
    name: "Founding Member", 
    amount: "4,999", 
    description: "Ensures long-term sustainability and baseline technical support.",
    icon: "💎"
  },
  { 
    id: "guardian",
    name: "Infrastructure Guardian", 
    amount: "9,999", 
    description: "Funds deeper security audits and performance tuning for the ledger.",
    icon: "🏰"
  },
  { 
    id: "partner",
    name: "Architecture Partner", 
    amount: "24,999", 
    description: "Supports R&D for advanced trust algorithms and cross-platform syncing.",
    icon: "🏗️"
  },
  { 
    id: "anchor",
    name: "Ecosystem Anchor", 
    amount: "49,999", 
    description: "Provides foundational support for enterprise-grade scalability.",
    icon: "⚓"
  }
];

export default function SupportSection() {
  const [selectedTierId, setSelectedTierId] = useState(SUPPORT_TIERS[0].id);
  const selectedTier = SUPPORT_TIERS.find(t => t.id === selectedTierId) || SUPPORT_TIERS[0];

  return (
    <section className="support-card compact" id="support">
      <div className="support-card-content">
        <div className="support-card-header">
          <span className="hero-badge-mini">Professional Support</span>
          <h3>Support PHL Maintenance</h3>
        </div>
        
        <p className="support-card-text-sm">
          Sustain the ongoing development of this open-source ledger.
        </p>

        <div className="support-metrics-compact-mini">
          <div className="support-metric-mini">
            <img src="/icons/maintenance.png" alt="" width="16" height="16" />
            <span>Maintenance</span>
          </div>
          <div className="support-metric-mini">
            <img src="/icons/software-development.png" alt="" width="16" height="16" />
            <span>Development</span>
          </div>
        </div>
        
        <div className="support-carousel-container-compact">
          <div className="support-carousel">
            {SUPPORT_TIERS.map((tier) => (
              <button
                key={tier.id}
                className={`support-carousel-tile-mini ${selectedTierId === tier.id ? 'is-active' : ''}`}
                onClick={() => setSelectedTierId(tier.id)}
              >
                <span className="tier-tile-name-mini">{tier.name}</span>
                <span className="tier-tile-amount-mini">₹{tier.amount}</span>
              </button>
            ))}
          </div>
          <div className="carousel-fade-edge-left" />
          <div className="carousel-fade-edge-right" />
        </div>

        <div className="support-selected-display-compact">
          <div className="selected-tier-header-sm">
            <p className="selected-tier-desc-sm">{selectedTier.description}</p>
          </div>

          <div className="selected-tier-payment-sm">
            {selectedTier.razorpayId ? (
              <div className="razorpay-embed-wrapper-sm">
                <RazorpayButton buttonId={selectedTier.razorpayId} />
              </div>
            ) : (
              <p className="payment-placeholder-text-sm">
                Gateway pending for this tier.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
