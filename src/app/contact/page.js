import ObfuscatedEmail from "@/app/components/ObfuscatedEmail";

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
            For technical support, feedback on the SaaS utility, or questions about the technical accountability tool, please reach out via email:
          </p>
          <p>
            <strong>Email:</strong>{" "}
            <ObfuscatedEmail
              userChars={[
                97, 110, 97, 110, 100, 109, 117, 103, 108, 105, 107, 97, 114,
                43, 112, 104, 108,
              ]}
              domainChars={[103, 109, 97, 105, 108]}
              tldChars={[99, 111, 109]}
            />
          </p>
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
            <li>
              <strong>Issues:</strong>{" "}
              <a 
                href="https://github.com/muglikar/ProHealthLedger/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report a bug or request a feature
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
              <strong>Grievance Officer:</strong> Anand Muglikar
            </p>
            <p>
              <strong>Nodal Contact Person:</strong> Anand Muglikar
            </p>
            <p>
              <strong>Contact Email:</strong>{" "}
              <ObfuscatedEmail
                userChars={[
                  97, 110, 97, 110, 100, 109, 117, 103, 108, 105, 107, 97, 114,
                  43, 112, 104, 108,
                ]}
                domainChars={[103, 109, 97, 105, 108]}
                tldChars={[99, 111, 109]}
              />
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>4. Independent Developer Information</h2>
          <p>
            ProHealthLedger is developed and maintained by Anand Muglikar, an independent software developer committed to technical transparency and professional accountability.
          </p>
        </section>
      </article>
    </>
  );
}
