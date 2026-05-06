"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import FeedbackModal from "./FeedbackModal";

export default function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("feedback") === "true") {
      setIsOpen(true);
    }
  }, [searchParams]);

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
