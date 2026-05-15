"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";

// RazorpayButton component removed to allow native sequential pre-rendering

const SPONSOR_TIERS = [
  { 
    id: "supporter",
    name: "Supporter", 
    amount: "101", 
    description: "Sustains baseline server infrastructure for 1 month.",
    icon: "🌟",
    razorpayId: "active",
    actionText: "Support Now"
  },
  { 
    id: "evangelist",
    name: "Evangelist", 
    amount: "301", 
    description: "Sustains high-availability cloud hosting for 3 months.",
    icon: "📣",
    razorpayId: "active",
    actionText: "Evangelize Now"
  },
  { 
    id: "advocate",
    name: "Advocate", 
    amount: "601", 
    description: "Supports technical maintenance and database scaling for 6 months.",
    icon: "🛡️",
    razorpayId: "active",
    actionText: "Advocate Now"
  },
  { 
    id: "patron",
    name: "Patron", 
    amount: "1,201", 
    description: "Funds backend security optimizations and maintenance for 6 months.",
    icon: "🚀",
    razorpayId: "active",
    actionText: "Become a Patron Now"
  },
  { 
    id: "shot",
    name: "Shot in the arm", 
    amount: "1,201", 
    description: "Sustains development for specific API maintenance tasks.",
    icon: "💉",
    razorpayId: "active",
    actionText: "Give a Shot Now"
  },
  { 
    id: "steward",
    name: "Steward", 
    amount: "2,501", 
    description: "Funds comprehensive system integrity monitoring for 1 year.",
    icon: "🤝",
    razorpayId: "active",
    actionText: "Become a Steward Now"
  },
  { 
    id: "founding",
    name: "Founding Member", 
    amount: "5,001", 
    description: "Ensures long-term sustainability and baseline technical support.",
    icon: "💎",
    razorpayId: "active",
    actionText: "Become a Founder Now"
  },
  { 
    id: "guardian",
    name: "Infrastructure Guardian", 
    amount: "10,001", 
    description: "Funds security audits and performance tuning for the ledger.",
    icon: "🏰",
    razorpayId: "active",
    actionText: "Guard the Ledger Now"
  },
  { 
    id: "partner",
    name: "Architecture Partner", 
    amount: "25,001", 
    description: "Sustains maintenance for trust algorithms and cross-platform syncing.",
    icon: "🏗️",
    razorpayId: "active",
    actionText: "Partner With Us Now"
  },
  { 
    id: "anchor",
    name: "Ecosystem Anchor", 
    amount: "50,001", 
    description: "Sustains core infrastructure and architectural evolution.",
    icon: "⚓",
    razorpayId: "active",
    actionText: "Anchor the Ecosystem Now"
  },
  {
    id: "institutional",
    name: "Institutional Partner",
    amount: "Contact",
    description: "For enterprise or research institutional infrastructure support.",
    icon: "🏛️",
    razorpayId: "institutional"
  }
];

export default function SupportSection() {
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);
  const [dragRotation, setDragRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef(null);
  const dragStartX = useRef(0);
  const startRotation = useRef(0);

  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    organization: "",
    country: ""
  });

  const isFormValid = formData.name.trim() !== "" && 
                      formData.email.trim() !== "" && 
                      formData.mobile.trim() !== "" && 
                      formData.country.trim() !== "";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayment = async () => {
    if (!selectedTier || selectedTier.razorpayId === "institutional") return;
    setIsProcessing(true);

    try {
      // 1. Create order on backend (Amount hardcoded to INR 1 for testing)
      const testAmount = '1'; // INR 1 for testing

      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: testAmount,
          currency: 'INR',
          tier: selectedTier.id,
          description: selectedTier.name,
          notes: {
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile,
            org: formData.organization || "Individual",
            country: formData.country
          }
        })
      });
      
      const order = await res.json();
      if (order.error) throw new Error(order.error);

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '', // Safe to expose public key
        amount: order.amount,
        currency: order.currency,
        name: "ProHealthLedger",
        description: `Sponsorship: ${selectedTier.name}`,
        image: "https://prohealthledger.org/favicon.ico", // Or appropriate logo URL
        order_id: order.id,
        handler: function (response) {
          alert("Thank you so much for sponsoring us! This means a lot to us. :)");
          window.location.href = '/profiles';
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.mobile
        },
        notes: {
          tier: selectedTier.id,
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          org: formData.organization || "Individual",
          country: formData.country
        },
        theme: {
          color: "#1e3a5f" // Matches the dark blue nav bar
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        console.error(response.error);
        alert("Payment failed or was cancelled.");
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(`Payment Initialization Failed: ${err.message || "Unknown error"}. Please ensure API keys are configured and redeployed.`);
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Robust wheel listener for Mac Trackpad
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // If there's any movement, try to capture it
      const hasMovement = Math.abs(e.deltaX) > 0.5 || Math.abs(e.deltaY) > 0.5;
      
      if (hasMovement) {
        if (e.cancelable) e.preventDefault();
        
        // Prioritize deltaX on Mac, fallback to deltaY
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const sensitivity = 0.7; // Bumped
        setDragRotation(prev => prev - (delta * sensitivity));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const handleDragStart = (x) => {
    setIsDragging(true);
    dragStartX.current = x;
    startRotation.current = dragRotation;
  };

  const handleDragMove = (x) => {
    if (!isDragging) return;
    const deltaX = x - dragStartX.current;
    const sensitivity = 0.8; // Increased
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

  // Pointer Handlers for better cross-platform support
  const onPointerDown = (e) => {
    // Only drag on primary button
    if (e.button !== 0) return;
    handleDragStart(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  
  const onPointerMove = (e) => {
    if (isDragging) {
      handleDragMove(e.clientX);
    }
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      handleDragEnd();
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDragStart={(e) => e.preventDefault()}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
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
              const totalRotation = (rotation + dragRotation) % 360;
              const normalizedRotation = ((totalRotation + 540) % 360) - 180;
              const absRotation = Math.abs(normalizedRotation);
              
              // Opacity: 1 at center (0deg), fades to 0.2 at 180deg (more visible back tiles)
              const opacity = Math.max(0.2, 1 - (absRotation / 160));
              const isSelected = selectedTierId === tier.id;

              return (
                <button
                  key={tier.id}
                  className={`support-3d-tile ${isSelected ? 'is-active' : ''}`}
                  style={{
                    transform: `rotateY(${rotation}deg) translateZ(${radius}px)`,
                    opacity: opacity,
                    zIndex: Math.round(100 - absRotation),
                    pointerEvents: isDragging ? 'none' : 'auto'
                  }}
                  onClick={(e) => {
                    if (!isDragging) {
                      setSelectedTierId(tier.id);
                      snapToSelectedIndex(idx);
                    }
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

        <div className="support-tier-details">
          <div className="tier-info-card">
            <div className="tier-info-header">
              <h3>{selectedTier.name} — {selectedTier.amount === "Contact" ? "Institutional Partner" : `₹${selectedTier.amount}`}</h3>
              <p>{selectedTier.description}</p>
            </div>
            
            <div className="payment-action-area">
              {selectedTier.razorpayId === "institutional" ? (
                <div className="institutional-partner-cta">
                  <p>Institutional sponsorships require manual onboarding and custom agreements.</p>
                  <a href="/contact" className="partner-contact-btn">Contact for Institutional Partnership</a>
                </div>
              ) : selectedTier.razorpayId ? (
                <div className="sponsor-checkout-form">
                  <div className="form-group-row">
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name *" required className="search-input" style={{flex: 1, marginBottom: '12px'}} />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address *" required className="search-input" style={{flex: 1, marginBottom: '12px'}} />
                  </div>
                  <div className="form-group-row">
                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="Mobile Number *" required className="search-input" style={{flex: 1, marginBottom: '12px'}} />
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} placeholder="Country *" required className="search-input" style={{flex: 1, marginBottom: '12px'}} />
                  </div>
                  <input type="text" name="organization" value={formData.organization} onChange={handleInputChange} placeholder="Organization (Optional)" className="search-input" style={{width: '100%', marginBottom: '20px'}} />
                  
                  <div className="payment-button-wrapper" style={{ minHeight: "80px", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                    <button 
                      onClick={handlePayment} 
                      disabled={isProcessing || !isFormValid}
                      className="nav-auth-btn"
                      style={{ padding: "12px 24px", fontSize: "1.1rem", cursor: (isProcessing || !isFormValid) ? "not-allowed" : "pointer", opacity: (!isFormValid && !isProcessing) ? 0.6 : 1 }}
                    >
                      {isProcessing ? "Processing..." : selectedTier.actionText}
                    </button>
                    {!isFormValid && <span style={{fontSize: "0.8rem", color: "var(--nav-fg-subtle)", marginTop: "8px"}}>Please fill all required (*) fields to continue</span>}
                  </div>
                </div>
              ) : null}
              <div className="payment-security-footer" style={{marginTop: "20px"}}>
                <p>Secure & Legally Compliant Sponsorship via Razorpay</p>
              </div>
            </div>
          </div>
        </div>

        <div className="vision-impact-section">
          <h2>Vision & Impact</h2>
          <div className="vision-grid">
            <div className="vision-card">
              <div className="vision-card-icon">🏗️</div>
              <h4>Infrastructure Sustainability</h4>
              <p>Your support covers the direct costs of high-availability cloud infrastructure and database scaling needed for a global ledger.</p>
            </div>
            <div className="vision-card">
              <div className="vision-card-icon">🛡️</div>
              <h4>Security Guardianship</h4>
              <p>Funding enables regular third-party security audits and penetration testing to ensure contributor anonymity and data integrity.</p>
            </div>
            <div className="vision-card">
              <div className="vision-card-icon">🚀</div>
              <h4>Ecosystem Evolution</h4>
              <p>We are building an open trust protocol. Sponsorship allows for deep R&D into decentralized verification and cross-platform trust syncing.</p>
            </div>
          </div>
          <div className="transparency-callout">
            <p><strong>Transparency:</strong> ProHealthLedger is an open-source technical utility. 100% of sponsorship funds are directed toward technical maintenance and ecosystem development.</p>
          </div>
        </div>
      </div>
      {/* Load Razorpay Checkout Script Globally */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
    </section>
  );
}
