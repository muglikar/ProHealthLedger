import ObfuscatedEmail from "@/app/components/ObfuscatedEmail";

export const metadata = {
  title: "Terms of Service — ProHealthLedger",
  description: "Terms governing use of ProHealthLedger.",
};

export default function TermsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Terms of Service</h1>
        <p>Effective date: April 29, 2026</p>
      </div>
      <article className="legal-content">
        <section className="legal-section">
          <h2>1. Service nature</h2>
          <p>
            ProHealthLedger is a public ledger of subjective professional
            experiences. It is not a consumer reporting agency and is not
            intended for credit, insurance, housing, or employment eligibility
            determinations.
          </p>
        </section>
        <section className="legal-section">
          <h2>2. Professional Sponsorships</h2>
          <p>
            ProHealthLedger offers "Professional Sponsorship Tiers" to sustain
            the platform's independent maintenance, security audits, and
            infrastructure costs. These are voluntary contributions to support
            the technical viability of the open-source project.
          </p>
          <p>
            By initiating a sponsorship, you confirm that you are supporting a
            technical utility and platform sustainability initiative.
            Sponsorships are generally non-refundable once processed, as they
            immediately contribute to the ongoing operational costs of the
            ledger.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Payment Processing</h2>
          <p>
            We use Razorpay for payment processing. We do not store your full
            payment credentials. Your use of the payment gateway is subject to
            Razorpay's terms and privacy policies. Any disputes regarding
            payment failures or unauthorized charges should be directed to the
            payment gateway in the first instance.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. User responsibility & Conduct</h2>
          <p>
            You are solely responsible for submitted content and must only post
            genuine professional experience in good faith. You agree not to:
          </p>
          <ul>
            <li>Post illegal, harassing, or defamatory content.</li>
            <li>Engage in doxxing or publish private contact information.</li>
            <li>Submit knowingly false or malicious allegations.</li>
            <li>Attempt to circumvent platform security or rate limits.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Limitation of Liability</h2>
          <p>
            ProHealthLedger and its operators are not liable for any indirect,
            incidental, or consequential damages resulting from your use of the
            platform or any information contained within. The platform is
            provided "as is" without warranties of any kind.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. India compliance contacts</h2>
          <p>
            Grievance Officer and Nodal Contact Person:
            <br />
            <strong>Anand Muglikar</strong> —{" "}
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
      </article>
    </>
  );
}

