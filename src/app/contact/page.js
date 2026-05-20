import ObfuscatedEmail from "@/app/components/ObfuscatedEmail";
import ContactForm from "@/app/components/ContactForm";

export const metadata = {
  title: "Contact Us — ProHealthLedger",
  description: "Get in touch with the ProHealthLedger developer for support, grievances, or legal inquiries.",
};

export default function ContactPage() {
  return (
    <>
      <div className="page-header">
        <h1>Contact Us</h1>
        <p>We are here to help and value your feedback.</p>
      </div>

      <article className="legal-content">
        <section className="legal-section">
          <h2>1. General Inquiries & Support</h2>
          <p>
            For technical support, feedback on the SaaS utility, or questions about the technical accountability tool, please reach out via email or use the form below:
          </p>
          <div style={{ marginBottom: '30px' }}>
            <p>
              <strong>Email:</strong>{" "}
              <ObfuscatedEmail
                userChars={[115, 117, 112, 112, 111, 114, 116]}
                domainChars={[83, 116, 111, 109, 97, 116, 111, 66, 111, 116]}
                tldChars={[99, 111, 109]}
              />
            </p>
          </div>
          
          <div className="contact-form-container" style={{ 
            background: '#ffffff', 
            padding: '30px', 
            borderRadius: '20px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            marginTop: '20px'
          }}>
            <ContactForm />
          </div>
        </section>

        <section className="legal-section">
          <h2>2. Technical & Open Source</h2>
          <p>
            As an open-source project, you can also interact with us via GitHub:
          </p>
          <ul>
            <li>
              <strong>Repository:</strong>{" "}
              <a 
                href="https://github.com/muglikar/ProHealthLedger"
                target="_blank"
                rel="noopener noreferrer"
              >
                muglikar/ProHealthLedger
              </a>
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Compliance & Legal</h2>
          <p>
            In accordance with jurisdictional requirements (including India's IT Rules), the following contacts are designated for grievances and nodal coordination:
          </p>
          <div className="compliance-block">
            <p>
              <strong>Grievance Officer:</strong> Rajashri Muglikar
            </p>
            <p>
              <strong>Nodal Contact Person:</strong> Rajashri Muglikar
            </p>
            <p>
              <strong>Contact Email:</strong>{" "}
              <ObfuscatedEmail
                userChars={[115, 117, 112, 112, 111, 114, 116]}
                domainChars={[83, 116, 111, 109, 97, 116, 111, 66, 111, 116]}
                tldChars={[99, 111, 109]}
              />
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>4. Independent Developer Information</h2>
          <p>
            ProHealthLedger is developed and maintained by Rajashri Muglikar, an independent software developer committed to technical transparency and professional accountability.
          </p>
        </section>
      </article>
    </>
  );
}
