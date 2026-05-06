"use client";

import { useState } from "react";
import FeedbackModal from "./FeedbackModal";

export default function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="feedback-fab" 
        onClick={() => setIsOpen(true)}
        aria-label="Give feedback"
        title="Share your feedback"
      >
        💬
      </button>

      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
