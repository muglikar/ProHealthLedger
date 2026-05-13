"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  
  // Even smaller radius for closer tiles
  const radius = Math.round(70 / Math.tan(Math.PI / tileCount)) + 70;

  // Helper to snap to the shortest path
  const snapToSelectedIndex = useCallback((index) => {
    const targetBaseRotation = -index * angleStep;
    // Find the shortest distance between current rotation and target visual rotation
    const current = dragRotation;
    // Normalize current to be relative to the target's 360-degree window
    const diff = ((((targetBaseRotation - current) % 360) + 540) % 360) - 180;
    setDragRotation(current + diff);
  }, [dragRotation, angleStep]);

  // Sync drag rotation with selected index when not dragging
  useEffect(() => {
    if (!isDragging) {
      const targetBaseRotation = -selectedIndex * angleStep;
      const current = dragRotation;
      const diff = ((((targetBaseRotation - current) % 360) + 540) % 360) - 180;
      
      // Only update if the difference is significant to avoid jitter
      if (Math.abs(diff) > 0.1) {
        setDragRotation(current + diff);
      }
    }
  }, [selectedIndex, isDragging, angleStep, dragRotation]);

  // Non-passive wheel listener to prevent browser fwd/back
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // Prevent browser horizontal navigation (back/forward)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
      
      const delta = e.deltaX || e.deltaY;
      const sensitivity = 0.5;
      setDragRotation(prev => prev - (delta * sensitivity));
      
      // Debounced snap could go here, but for now we just let it rotate
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleDragStart = (x) => {
    setIsDragging(true);
    dragStartX.current = x;
    startRotation.current = dragRotation;
  };

  const handleDragMove = (x) => {
    if (!isDragging) return;
    const deltaX = x - dragStartX.current;
    const sensitivity = 0.6;
    setDragRotation(startRotation.current + (deltaX * sensitivity));
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Snap to nearest tier
    const nearestIdx = Math.round(-dragRotation / angleStep);
    const safeIdx = ((nearestIdx % tileCount) + tileCount) % tileCount;
    setSelectedTierId(SPONSOR_TIERS[safeIdx].id);
  };

  // Mouse Handlers
  const onMouseDown = (e) => handleDragStart(e.clientX);
  
  // Touch Handlers
  const onTouchStart = (e) => handleDragStart(e.touches[0].clientX);
  const onTouchMove = (e) => {
    if (isDragging) {
      // Prevent vertical scroll while dragging carousel
      if (e.cancelable) e.preventDefault();
      handleDragMove(e.touches[0].clientX);
    }
  };
  const onTouchEnd = () => handleDragEnd();

  useEffect(() => {
    const onMouseMove = (e) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
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
          ref={containerRef}
          className="support-carousel-container"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
              
              // Dynamic opacity based on how "front-facing" the tile is
              // angleStep * (idx - nearestIdx) should be around 0 for the front tile
              // We can calculate current absolute rotation of the tile relative to the viewer (0 deg)
              const currentTileRotation = (rotation + dragRotation) % 360;
              const normalizedRotation = ((currentTileRotation + 180) % 360) - 180;
              const absRotation = Math.abs(normalizedRotation);
              
              // Opacity: 1 at 0deg, 0.1 at 180deg
              const opacity = Math.max(0.1, 1 - (absRotation / 180) * 1.2);
              const isSelected = selectedTierId === tier.id;

              return (
                <button
                  key={tier.id}
                  className={`support-3d-tile ${isSelected ? 'is-active' : ''}`}
                  style={{
                    transform: `rotateY(${rotation}deg) translateZ(${radius}px)`,
                    opacity: opacity,
                    zIndex: Math.round(100 - absRotation)
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
