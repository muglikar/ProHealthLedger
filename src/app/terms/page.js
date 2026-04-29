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
          <h2>2. User responsibility</h2>
          <p>
            You are solely responsible for submitted content and must only post
            genuine professional experience in good faith. Illegal content,
            harassment, hate speech, doxxing, or knowingly false allegations are
            prohibited.
          </p>
        </section>
        <section className="legal-section">
          <h2>3. Moderation and transparency</h2>
          <p>
            Comments may be approved, redacted, or un-redacted. Every
            moderation action is logged publicly in
            <code> data/moderation_log.json</code>.
          </p>
        </section>
        <section className="legal-section">
          <h2>4. India compliance contacts</h2>
          <p>
            Grievance Officer and Nodal Contact Person:
            <br />
            <strong>Anand Muglikar</strong> —{" "}
            <a href="mailto:anandmuglikar+phl@gmail.com">
              anandmuglikar+phl@gmail.com
            </a>
          </p>
        </section>
      </article>
    </>
  );
}

