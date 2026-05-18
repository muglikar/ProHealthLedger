"use client";

import { useState } from "react";
import { COUNTRIES } from "../../lib/countries";

export default function ContactForm({ isPopup = false, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    organization: "",
    country: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = formData.name.trim() !== "" && 
                      formData.email.trim() !== "" && 
                      formData.mobile.trim() !== "" && 
                      formData.country.trim() !== "" &&
                      formData.message.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSubmitted(true);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Failed to submit contact form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="contact-form-success" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <img src="/icons/gratitude.png" alt="Success" width="60" height="60" />
        </div>
        <h3 style={{ color: '#b45309', marginBottom: '10px' }}>Message Received!</h3>
        <p style={{ color: '#64748b' }}>Thank you for reaching out. We will get back to you shortly.</p>
        {isPopup && (
          <button 
            className="pre-checkout-submit" 
            style={{ marginTop: '20px', maxWidth: '200px' }}
            onClick={() => setSubmitted(false)}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form className={`contact-native-form ${isPopup ? 'is-popup' : ''}`} onSubmit={handleSubmit}>
      <div className="pre-checkout-row">
        <div className="pre-checkout-input-group">
          <label>Full Name *</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleInputChange} 
            className="pre-checkout-input" 
            placeholder="Harold Finch" 
            required
            disabled={isSubmitting} 
          />
        </div>
        <div className="pre-checkout-input-group">
          <label>Email Address *</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleInputChange} 
            className="pre-checkout-input" 
            placeholder="finch@ift.com" 
            required
            disabled={isSubmitting} 
          />
        </div>
      </div>
      <div className="pre-checkout-row">
        <div className="pre-checkout-input-group">
          <label>Mobile Number *</label>
          <input 
            type="tel" 
            name="mobile" 
            value={formData.mobile} 
            onChange={handleInputChange} 
            className="pre-checkout-input" 
            placeholder="+31-41592 65359" 
            required
            disabled={isSubmitting} 
          />
        </div>
        <div className="pre-checkout-input-group">
          <label>Country *</label>
          <select 
            name="country" 
            value={formData.country} 
            onChange={handleInputChange} 
            className="pre-checkout-input" 
            required
            disabled={isSubmitting} 
            style={{ WebkitAppearance: 'none', appearance: 'none', background: '#f8fafc url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center' }}
          >
            <option value="" disabled>Select your country</option>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="pre-checkout-input-group">
        <label>Organization (Optional)</label>
        <input 
          type="text" 
          name="organization" 
          value={formData.organization} 
          onChange={handleInputChange} 
          className="pre-checkout-input" 
          placeholder="Thornhill Corporation" 
          disabled={isSubmitting} 
        />
      </div>
      <div className="pre-checkout-input-group">
        <label>Message *</label>
        <textarea 
          name="message" 
          value={formData.message} 
          onChange={handleInputChange} 
          className="pre-checkout-input" 
          placeholder="How can we help you?" 
          required
          rows="4"
          style={{ resize: 'vertical' }}
          disabled={isSubmitting} 
        ></textarea>
      </div>

      <button 
        type="submit"
        className="pre-checkout-submit" 
        disabled={isSubmitting || !isFormValid}
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
