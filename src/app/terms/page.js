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

