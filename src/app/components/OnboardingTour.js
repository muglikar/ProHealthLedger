"use client";

import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    target: "step-welcome",
    title: "Welcome to ProHealthLedger!",
    content: "This is a public, permanent record of professional experiences. Your voice helps build a more transparent workplace.",
    position: "bottom"
  },
  {
    target: "step-linkedin",
    title: "Who are you vouching for?",
    content: "Paste the full LinkedIn profile URL of the person you want to vouch for (positive) or flag (negative).",
    position: "bottom"
  },
  {
    target: "step-vote",
    title: "Vouch or Flag?",
    content: "A Vouch (Yes) means you'd work with them again. A Flag (No) means you wouldn't. Remember: your first contribution must be a positive Vouch!",
    position: "bottom"
  },
  {
    target: "step-reason",
    title: "Add Context (Optional)",
    content: "Briefly explain your choice. Clear, professional reasons are most helpful for others. These are reviewed by moderators.",
    position: "top"
  },
  {
    target: "step-submit",
    title: "Ready to Submit?",
    content: "Double-check your entry. Once submitted, votes are permanent and tied to your identity. Make it count!",
    position: "top"
  }
];

export default function OnboardingTour() {
  const [activeStep, setActiveStep] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const hasCompleted = localStorage.getItem("phl_onboarding_completed");
    if (!hasCompleted) {
      setActiveStep(0);
      setIsVisible(true);
    }
  }, []);

  const updateCoords = useCallback(() => {
    if (activeStep < 0 || activeStep >= STEPS.length) return;
    
    const targetId = STEPS[activeStep].target;
    const element = document.querySelector(`[data-tour="${targetId}"]`);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      
      // Scroll into view if needed
      if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeStep]);

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords);
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords);
      };
    }
  }, [isVisible, updateCoords]);

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    setIsVisible(false);
    localStorage.setItem("phl_onboarding_completed", "true");
  };

  if (!isVisible || activeStep === -1) return null;

  const currentStep = STEPS[activeStep];

  return (
    <div className="tour-overlay">
      <div 
        className="tour-highlight" 
        style={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.width + 16,
          height: coords.height + 16,
        }}
      />
      
      <div 
        className={`tour-popover tour-pos-${currentStep.position}`}
        style={{
          top: currentStep.position === "bottom" 
            ? coords.top + coords.height + 24 
            : coords.top - 180, // Approximate height for top position
          left: coords.left + (coords.width / 2) - 160, // Center horizontally (width is 320)
        }}
      >
        <div className="tour-content">
          <div className="tour-progress">
            Step {activeStep + 1} of {STEPS.length}
          </div>
          <h3>{currentStep.title}</h3>
          <p>{currentStep.content}</p>
          
          <div className="tour-actions">
            <button className="tour-btn-skip" onClick={handleSkip}>
              Skip Tour
            </button>
            <button className="tour-btn-next" onClick={handleNext}>
              {activeStep === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tour-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 20000;
          pointer-events: none;
        }

        .tour-highlight {
          position: absolute;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
          border-radius: 12px;
          border: 2px solid var(--accent);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 20001;
        }

        .tour-popover {
          position: absolute;
          width: 320px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
          z-index: 20002;
          pointer-events: auto;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: tourFadeIn 0.4s ease-out;
        }

        @media (prefers-color-scheme: dark) {
          .tour-popover {
            background: rgba(30, 41, 59, 0.95);
            color: #f1f5f9;
          }
        }

        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tour-progress {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent);
          margin-bottom: 8px;
        }

        .tour-content h3 {
          margin: 0 0 12px;
          font-size: 1.15rem;
          font-weight: 800;
        }

        .tour-content p {
          margin: 0 0 24px;
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .tour-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tour-btn-skip {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          padding: 8px;
        }

        .tour-btn-skip:hover {
          color: var(--text);
        }

        .tour-btn-next {
          background: var(--accent);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.3);
          transition: transform 0.2s;
        }

        .tour-btn-next:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .tour-popover {
            left: 50% !important;
            transform: translateX(-50%);
            width: 90vw;
          }
        }
      `}</style>
    </div>
  );
}
