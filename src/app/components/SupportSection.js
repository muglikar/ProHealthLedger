"use client";

import { useState, useEffect, useRef } from "react";

function RazorpayButton({ buttonId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!buttonId) return;
    
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    
    // Exact form/script structure from the user
    const form = document.createElement("form");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.dataset.payment_button_id = buttonId;
    script.async = true;
    
    form.appendChild(script);
    container.appendChild(form);

    return () => {
      // No cleanup to avoid script removal issues
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

const SPONSOR_TIERS = [
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
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);
  const [dragRotation, setDragRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef(null);
  const dragStartX = useRef(0);
  const startRotation = useRef(0);

  const selectedIndex = SPONSOR_TIERS.findIndex(t => t.id === selectedTierId);
  const tileCount = SPONSOR_TIERS.length;
  const angleStep = 360 / tileCount;
  
  const radius = Math.round(90 / Math.tan(Math.PI / tileCount)) + 140;

  // Sync drag rotation with selected index when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragRotation(-selectedIndex * angleStep);
    }
  }, [selectedIndex, isDragging, angleStep]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    startRotation.current = dragRotation;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaRotation = (deltaX / 600) * 360;
    setDragRotation(startRotation.current + deltaRotation);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Snap to nearest
    const finalAngle = dragRotation;
    const nearestIdx = Math.round(-finalAngle / angleStep);
    const safeIdx = ((nearestIdx % tileCount) + tileCount) % tileCount;
    setSelectedTierId(SPONSOR_TIERS[safeIdx].id);
  };

  const handleWheel = (e) => {
    // Simulate scroll
    const delta = e.deltaX || e.deltaY;
    const deltaRotation = (delta / 800) * 360;
    setDragRotation(prev => {
      const next = prev - deltaRotation;
      // Also update selection if it's a significant move
      return next;
    });
  };

  // Global listeners for drag to work outside container
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const selectedTier = SPONSOR_TIERS[selectedIndex] || SPONSOR_TIERS[0];

  return (
    <section className="support-card" id="sponsor">
      <div className="support-card-content">
        <div className="support-card-header">
          <div className="support-card-icon">
            <img 
              src="/icons/support.png" 
              alt="Sponsor Icon" 
              width="64" 
              height="64"
            />
          </div>
          <span className="hero-badge">Professional Sponsorship</span>
          <h3>Sponsor PHL Maintenance</h3>
        </div>
        
        <p className="support-card-text">
          Sustain the ongoing development and server infrastructure of this open-source ledger.
        </p>

        <div className="support-metrics-compact">
          <div className="support-metric-mini">
            <img src="/icons/maintenance.png" alt="" width="20" height="20" />
            <span>Maintenance</span>
          </div>
          <div className="support-metric-mini">
            <img src="/icons/software-development.png" alt="" width="20" height="20" />
            <span>Development</span>
          </div>
        </div>
        
        <div 
          className="support-carousel-container"
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          <div 
            className="support-carousel-3d-ring"
            style={{ 
              transform: `rotateY(${dragRotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
            }}
          >
            {SPONSOR_TIERS.map((tier, idx) => {
              const rotation = idx * angleStep;
              return (
                <button
                  key={tier.id}
                  className={`support-3d-tile ${selectedTierId === tier.id ? 'is-active' : ''}`}
                  style={{
                    transform: `rotateY(${rotation}deg) translateZ(${radius}px)`
                  }}
                  onClick={(e) => {
                    if (!isDragging) setSelectedTierId(tier.id);
                  }}
                >
                  <span className="tier-tile-icon">{tier.icon}</span>
                  <span className="tier-tile-name">{tier.name}</span>
                  <span className="tier-tile-amount">₹{tier.amount}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="support-selected-display">
          <div className="selected-tier-header">
            <h4>{selectedTier.name} — ₹{selectedTier.amount}</h4>
            <p className="selected-tier-desc">{selectedTier.description}</p>
          </div>

          <div className="selected-tier-payment">
            {selectedTier.razorpayId ? (
              <div className="razorpay-embed-wrapper">
                <RazorpayButton buttonId={selectedTier.razorpayId} />
              </div>
            ) : (
              <p className="payment-placeholder-text">
                Professional gateway pending for this tier.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
