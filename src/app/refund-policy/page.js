import ObfuscatedEmail from "@/app/components/ObfuscatedEmail";

export const metadata = {
  title: "Refund Policy — ProHealthLedger",
  description: "Refund and cancellation policy for ProHealthLedger support contributions.",
};

export default function RefundPolicyPage() {
  const effectiveDate = "May 12, 2026";

  return (
    <>
      <div className="page-header">
        <h1>Refund Policy</h1>
        <p>Effective date: {effectiveDate}</p>
      </div>

      <article className="legal-content">
        <section className="legal-section">
          <h2>1. Service Nature</h2>
          <p>
            ProHealthLedger is an open-source SaaS utility and technical accountability tool provided by an independent developer. The core platform is provided free of charge ("Zero Cost") to all users.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Voluntary Contributions</h2>
          <p>
            Any financial support, "cups of coffee," or contributions made via the platform's support section are strictly voluntary. These contributions are intended to support the independent maintenance, hosting costs, and ongoing development of the open-source ledger.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. No Refund Policy</h2>
          <p>
            As contributions are voluntary and provided to support an open-source project, they are generally non-refundable once the transaction is successfully processed. No tangible goods or exclusive services are provided in exchange for these contributions.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Exceptional Circumstances</h2>
          <p>
            In the event of an accidental duplicate transaction or a technical error with the payment gateway, please contact the developer within 48 hours. We will make reasonable efforts to resolve genuine technical errors or accidental duplicates where possible, subject to the policies of the underlying payment processor.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Contact Information</h2>
          <p>
            For any queries regarding support contributions or technical issues, please reach out to:
            <br />
            <strong>Developer:</strong> Anand Muglikar
            <br />
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
      </article>
    </>
  );
}
