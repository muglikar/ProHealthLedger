import { listProtectedFlagSlugs } from "@/lib/protected-profiles";

export const metadata = {
  title: "Privacy Policy — ProHealthLedger",
  description:
    "How ProHealthLedger collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  const effectiveDate = "March 15, 2026";
  const protectedSlugs = listProtectedFlagSlugs();

  return (
    <>
      <div className="page-header">
        <h1>Privacy Policy</h1>
        <p>Effective date: {effectiveDate}</p>
      </div>

      <article className="legal-content">
        {/* ── 1. Overview ── */}
        <section className="legal-section">
          <h2>1. Overview</h2>
          <p>
            Professional Health Ledger (&ldquo;ProHealthLedger,&rdquo;
            &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is an
            open-source, community-driven platform that lets professionals share
            their genuine work experiences. This Privacy Policy explains what
            data we collect, why we collect it, how it is stored, and your rights
            regarding that data.
          </p>
          <p>
            Our use of the GitHub API is governed by the{" "}
            <a
              href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Terms of Service
            </a>{" "}
            (including Section&nbsp;H &mdash; API Terms) and the{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub General Privacy Statement
            </a>
            . Our use of the LinkedIn API is governed by the{" "}
            <a
              href="https://www.linkedin.com/legal/l/api-terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn API Terms of Use
            </a>
            . This Privacy Policy is designed to comply with both sets of terms,
            including LinkedIn&rsquo;s requirements for developer privacy
            policies under Section&nbsp;5.1 thereof.
          </p>
          <p>
            By signing in or submitting a vote, you agree to the practices
            described below. If you do not agree, please do not use the platform.
          </p>
        </section>

        {/* ── 2. Data We Collect ── */}
        <section className="legal-section">
          <h2>2. Information We Collect</h2>

          <h3>2.1 Information you provide directly</h3>
          <ul>
            <li>
              <strong>LinkedIn Profile URLs</strong> — the public LinkedIn URL
              of the professional you are reviewing.
            </li>
            <li>
              <strong>Vote</strong> — your Yes/No answer to &ldquo;Would you
              work with/for them again?&rdquo;
            </li>
            <li>
              <strong>Reason (optional)</strong> — a brief note you may choose
              to include alongside your vote.
            </li>
          </ul>

          <h3>2.2 Information received from authentication providers</h3>
          <p>
            We support sign-in via <strong>GitHub</strong> and{" "}
            <strong>LinkedIn</strong> using the OAuth 2.0 / OpenID Connect
            protocol. When you authenticate, we receive:
          </p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Data received</th>
                <th>When collected</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GitHub</td>
                <td>GitHub username, display name</td>
                <td>Once, at sign-in</td>
              </tr>
              <tr>
                <td>LinkedIn</td>
                <td>
                  LinkedIn member ID, display name, email address (via OpenID
                  Connect <code>openid profile email</code> scopes)
                </td>
                <td>Once, at sign-in — not refreshed on an automated schedule</td>
              </tr>
            </tbody>
          </table>
          <p>
            We request only the <strong>minimum data</strong> necessary to
            identify you on the platform. We do <strong>not</strong> request or
            store your password from any provider. Authentication is handled
            entirely by GitHub and LinkedIn via their secure OAuth flows.
          </p>

          <h3>2.3 Information collected automatically</h3>
          <ul>
            <li>
              <strong>Session cookies</strong> — we use a single encrypted
              session cookie (managed by NextAuth.js) to keep you signed in. No
              tracking cookies are used.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> use analytics services, advertising
            trackers, fingerprinting, or any other form of background data
            collection.
          </p>
        </section>

        {/* ── 3. How We Use Your Data ── */}
        <section className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Purpose</th>
                <th>Data used</th>
                <th>Legal basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Authenticate your identity</td>
                <td>GitHub username or LinkedIn member ID</td>
                <td>Contract performance / consent</td>
              </tr>
              <tr>
                <td>Record and display your vote</td>
                <td>User ID, display name, vote, date</td>
                <td>Consent (you explicitly submit)</td>
              </tr>
              <tr>
                <td>Enforce the Karma Rule</td>
                <td>Your contribution history (yes/no counts)</td>
                <td>Legitimate interest (platform integrity)</td>
              </tr>
              <tr>
                <td>Create a public audit trail</td>
                <td>Vote details via GitHub Issues</td>
                <td>Legitimate interest (transparency)</td>
              </tr>
              <tr>
                <td>Display contributor leaderboard</td>
                <td>User ID, display name, vote counts</td>
                <td>Consent</td>
              </tr>
            </tbody>
          </table>
          <p>
            We do <strong>not</strong> use your data for advertising, ad
            targeting, sale to third parties, credit/insurance/employment
            eligibility decisions, surveillance, or any purpose other than
            operating the ProHealthLedger platform as described in this policy.
          </p>
        </section>

        {/* ── 4. LinkedIn API Data Practices ── */}
        <section className="legal-section">
          <h2>4. LinkedIn API Data Practices</h2>
          <p>
            This section describes how we handle data received via the LinkedIn
            API, in compliance with the{" "}
            <a
              href="https://www.linkedin.com/legal/l/api-terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn API Terms of Use
            </a>
            .
          </p>

          <h3>4.1 Consent before access</h3>
          <p>
            Before you authenticate your LinkedIn account with ProHealthLedger,
            we obtain your freely given consent via LinkedIn&rsquo;s standard
            OAuth authorization screen. By authorizing the connection, you
            consent to:
          </p>
          <ul>
            <li>
              <strong>How your data will be used:</strong> your LinkedIn member
              ID and display name are used to identify you as a contributor on
              the public ledger. Your email is used only for account
              identification and is never displayed publicly.
            </li>
            <li>
              <strong>How your data will be disclosed:</strong> your LinkedIn
              member ID and display name will appear on votes you submit, on the
              contributor leaderboard, and in the public transparency log. Votes
              are also recorded as GitHub Issues in a public repository.
            </li>
            <li>
              <strong>When your data is collected:</strong> your LinkedIn Profile
              Data (member ID, name, email) is collected once at sign-in. We do{" "}
              <strong>not</strong> refresh your LinkedIn Profile Data on an
              automated schedule — it is only retrieved when you are actively
              using the application and authenticate again.
            </li>
            <li>
              <strong>Type of data collected:</strong> LinkedIn member ID,
              display name, and email address via the{" "}
              <code>openid profile email</code> scopes.
            </li>
            <li>
              <strong>How to withdraw consent:</strong> see Section&nbsp;8
              (&ldquo;Your Rights&rdquo;) below.
            </li>
            <li>
              <strong>How to request deletion:</strong> see Section&nbsp;8.1
              below.
            </li>
          </ul>

          <h3>4.2 Data storage restrictions</h3>
          <ul>
            <li>
              We store only the <strong>minimum LinkedIn data</strong> required
              to operate the platform: member ID (as a user identifier), display
              name (for attribution), and email (for account identification).
            </li>
            <li>
              We may store <strong>OAuth Access Tokens</strong> and
              application-specific <strong>Member Tokens</strong> as permitted
              by the LinkedIn API Terms (§4.2).
            </li>
            <li>
              LinkedIn Profile Data is stored in a manner that allows us to
              identify, segregate, and selectively delete it upon request.
            </li>
            <li>
              LinkedIn data is <strong>not</strong> stored in any data
              repository that enables third-party access, other than the
              public ledger to which you explicitly consent.
            </li>
          </ul>

          <h3>4.3 Prohibited uses</h3>
          <p>
            In compliance with the LinkedIn API Terms, we confirm that we
            do <strong>not</strong>:
          </p>
          <ul>
            <li>
              Sell, rent, lease, or otherwise make LinkedIn Content available to
              any third party outside of the agreed platform use.
            </li>
            <li>
              Use LinkedIn data for advertising, ad targeting, or generating
              mass messages or promotions.
            </li>
            <li>
              Use LinkedIn data for credit, insurance, employment, or housing
              eligibility decisions.
            </li>
            <li>
              Use LinkedIn data in any manner that facilitates bias,
              discrimination, or surveillance.
            </li>
            <li>
              Scrape, crawl, or access LinkedIn content outside of the
              authorized APIs.
            </li>
            <li>
              State or imply that LinkedIn has &ldquo;verified&rdquo; or
              &ldquo;confirmed&rdquo; the accuracy of any data on this platform.
            </li>
          </ul>

          <h3>4.4 Data Processing Agreement</h3>
          <p>
            To the extent that ProHealthLedger processes Personal Information
            received from LinkedIn, such processing is governed by the{" "}
            <a
              href="https://legal.linkedin.com/bd-dpa"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn Data Processing Agreement for Business Development
              Agreements
            </a>{" "}
            (BD&nbsp;DPA), as referenced in Section&nbsp;4.6 of the LinkedIn API
            Terms of Use.
          </p>
        </section>

        {/* ── 5. GitHub API & OAuth Data Practices ── */}
        <section className="legal-section">
          <h2>5. GitHub API &amp; OAuth Data Practices</h2>
          <p>
            This section describes how we handle data received via the GitHub
            OAuth API, in compliance with the{" "}
            <a
              href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Terms of Service
            </a>{" "}
            (including Section&nbsp;H — API Terms) and the{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub General Privacy Statement
            </a>
            .
          </p>

          <h3>5.1 Consent before access</h3>
          <p>
            Before you authenticate your GitHub account with ProHealthLedger,
            we obtain your consent via GitHub&rsquo;s standard OAuth
            authorization screen. By authorizing the connection, you consent to:
          </p>
          <ul>
            <li>
              <strong>How your data will be used:</strong> your GitHub username
              and display name are used to identify you as a contributor on the
              public ledger.
            </li>
            <li>
              <strong>How your data will be disclosed:</strong> your GitHub
              username and display name will appear on votes you submit, on the
              contributor leaderboard, and in the public transparency log. Votes
              are recorded as GitHub Issues in a public repository.
            </li>
            <li>
              <strong>When your data is collected:</strong> your GitHub profile
              data (username and display name) is collected once at sign-in. We
              do <strong>not</strong> refresh your GitHub profile data on an
              automated schedule.
            </li>
            <li>
              <strong>Type of data collected:</strong> GitHub username (login)
              and display name only. We do <strong>not</strong> request access
              to your repositories, gists, organizations, or any other GitHub
              resources.
            </li>
            <li>
              <strong>How to withdraw consent:</strong> see Section&nbsp;8
              (&ldquo;Your Rights&rdquo;) below.
            </li>
            <li>
              <strong>How to request deletion:</strong> see Section&nbsp;8.1
              below.
            </li>
          </ul>

          <h3>5.2 Data storage and tokens</h3>
          <ul>
            <li>
              We store only the <strong>minimum GitHub data</strong> required to
              operate the platform: username (as a user identifier) and display
              name (for attribution).
            </li>
            <li>
              GitHub OAuth Access Tokens are stored in the encrypted session
              cookie for the duration of your session only. They are not stored
              persistently.
            </li>
            <li>
              GitHub API tokens (Personal Access Tokens) used by the platform to
              create Issues and commit vote data are server-side credentials and
              are never exposed to end users.
            </li>
          </ul>

          <h3>5.3 Compliance with GitHub API Terms (Section&nbsp;H)</h3>
          <p>
            In compliance with the GitHub Terms of Service, we confirm that we
            do <strong>not</strong>:
          </p>
          <ul>
            <li>
              Use the GitHub API to download data for spamming purposes.
            </li>
            <li>
              Sell GitHub users&rsquo; personal information to recruiters,
              headhunters, job boards, or any third party.
            </li>
            <li>
              Exceed or attempt to circumvent GitHub&rsquo;s API rate
              limitations.
            </li>
            <li>
              Use the GitHub API in any manner that violates the{" "}
              <a
                href="https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Acceptable Use Policies
              </a>
              .
            </li>
          </ul>

          <h3>5.4 User-generated content</h3>
          <p>
            Votes submitted through ProHealthLedger are created as GitHub Issues
            in a public repository. As per GitHub&rsquo;s Terms of Service
            (Section&nbsp;D), you retain ownership of the content you create.
            By submitting a vote, you grant GitHub the licenses described in
            their Terms and grant ProHealthLedger the right to display your vote
            on the platform.
          </p>

          <h3>5.5 Deletion of GitHub data</h3>
          <p>
            You may request deletion of your GitHub username and display name
            from our active data files by{" "}
            <a href="/request-removal">
              opening a data deletion request
            </a>
            . Upon receiving your request, we will remove your GitHub data from
            the active dataset. Note: votes already recorded in Git history and
            as GitHub Issues cannot be retroactively purged due to the immutable
            nature of Git.
          </p>
        </section>

        {/* ── 6. Public Nature of Data ── */}
        <section className="legal-section">
          <h2>6. Public Nature of Data</h2>
          <div className="legal-callout legal-callout-warning">
            <strong>⚠ Important:</strong> All votes, contributor identities, and
            the complete audit trail are <strong>public by design</strong>. This
            is a core feature of the platform, not a side-effect.
          </div>
          <p>When you submit a vote:</p>
          <ul>
            <li>
              Your <strong>user ID</strong> (e.g., &ldquo;github:username&rdquo;
              or &ldquo;linkedin:id&rdquo;) and <strong>display name</strong>{" "}
              are permanently attached to that vote.
            </li>
            <li>
              A <strong>GitHub Issue</strong> is created in the public repository
              as an immutable record.
            </li>
            <li>
              Your vote appears on the <strong>transparency page</strong>, the{" "}
              <strong>contributor leaderboard</strong>, and in the
              repository&rsquo;s public JSON data files.
            </li>
          </ul>
          <p>
            <strong>Votes are permanent and cannot be edited or deleted</strong>{" "}
            once submitted. You are clearly informed of this permanence before
            submitting.
          </p>
          <p>
            For transparency, the denylist for negative votes is an explicit
            exact-match slug list from environment configuration (no hidden
            substring logic). Current protected slug
            {protectedSlugs.length === 1 ? "" : "s"}:{" "}
            {protectedSlugs.length > 0 ? (
              protectedSlugs.map((s, idx) => (
                <span key={s}>
                  <code>{s}</code>
                  {idx < protectedSlugs.length - 1 ? ", " : ""}
                </span>
              ))
            ) : (
              <em>none configured</em>
            )}
            .
          </p>
        </section>

        {/* ── 7. Data Storage and Security ── */}
        <section className="legal-section">
          <h2>7. Data Storage and Security</h2>
          <ul>
            <li>
              <strong>Vote data</strong> is stored as JSON files in a public
              GitHub repository (
              <a
                href="https://github.com/muglikar/ProHealthLedger"
                target="_blank"
                rel="noopener noreferrer"
              >
                muglikar/ProHealthLedger
              </a>
              ).
            </li>
            <li>
              <strong>Session data</strong> is stored in an encrypted, HTTP-only
              cookie in your browser. No server-side session database is used.
            </li>
            <li>
              <strong>OAuth tokens</strong> (both GitHub and LinkedIn) are used
              during the authentication flow and may be stored in the encrypted
              session for the duration of your session. They are not stored
              persistently beyond the session.
            </li>
            <li>
              <strong>Security measures:</strong> we implement industry-standard
              security practices including encrypted data transmission
              (HTTPS/TLS), encrypted session cookies, and secure OAuth 2.0
              flows. Access Credentials for both the GitHub and LinkedIn APIs
              are kept secret and are not shared with any third party.
            </li>
          </ul>
          <p>
            Because vote data is stored in a public Git repository, it is
            replicated across GitHub&rsquo;s infrastructure and may be cloned or
            forked by third parties. We cannot control downstream copies of this
            public data.
          </p>
        </section>

        {/* ── 8. Your Rights ── */}
        <section className="legal-section">
          <h2>8. Your Rights</h2>

          <h3>8.1 For all users (including GitHub and LinkedIn members)</h3>
          <ul>
            <li>
              <strong>Access:</strong> all vote data is publicly available on the
              platform and in the GitHub repository. You can view your own
              contributions at any time.
            </li>
            <li>
              <strong>Deletion of authentication data:</strong> you may request
              deletion of all data collected via the GitHub or LinkedIn APIs at
              any time by{" "}
              <a href="/request-removal">
                opening a data deletion request
              </a>{" "}
              or emailing us. Upon receiving your request, we will delete your
              GitHub username or LinkedIn member ID, display name, OAuth Access
              Token, and Member Token from our systems, in compliance with
              LinkedIn API Terms (§4.4) and GitHub&rsquo;s Terms of Service.
              Note: votes already recorded in the public Git history cannot be
              retroactively purged due to its immutable nature.
            </li>
            <li>
              <strong>Withdraw consent / revoke access:</strong> you can revoke
              ProHealthLedger&rsquo;s access at any time from your{" "}
              <a
                href="https://github.com/settings/applications"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Authorized Apps
              </a>{" "}
              or{" "}
              <a
                href="https://www.linkedin.com/psettings/permitted-services"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn Permitted Services
              </a>{" "}
              settings. When your OAuth token expires or is revoked, we will
              obtain your consent again before collecting any further data.
            </li>
            <li>
              <strong>Account closure:</strong> if you close your account with
              us, we will immediately delete all Content collected via the
              GitHub and LinkedIn APIs on your behalf, including OAuth Access
              Tokens and Member Tokens, as required by LinkedIn API Terms (§4.4)
              and GitHub&rsquo;s Terms of Service.
            </li>
          </ul>

          <h3>8.2 For professionals listed on the ledger</h3>
          <ul>
            <li>
              <strong>Profile removal:</strong> if you are a professional whose
              LinkedIn profile appears on this ledger and you wish to have it
              removed, you may open a{" "}
              <a href="/request-removal">
                deactivation request
              </a>
              . We will remove your profile from the active ledger.
            </li>
          </ul>

          <h3>8.3 Under GDPR (EU/EEA residents)</h3>
          <p>
            If you are located in the European Union or European Economic Area,
            you have additional rights under the General Data Protection
            Regulation:
          </p>
          <ul>
            <li>
              <strong>Right to access</strong> — request a copy of data we hold
              about you.
            </li>
            <li>
              <strong>Right to rectification</strong> — request correction of
              inaccurate data.
            </li>
            <li>
              <strong>Right to erasure</strong> — request deletion of your data,
              subject to our legitimate interest in maintaining an auditable
              public record and the practical limitation that Git history is
              immutable.
            </li>
            <li>
              <strong>Right to object</strong> — object to processing based on
              legitimate interests.
            </li>
            <li>
              <strong>Right to data portability</strong> — all data is already
              publicly available in machine-readable JSON format.
            </li>
          </ul>
          <p>
            To exercise these rights, open a GitHub Issue or contact us at the
            address below.
          </p>

          <h3>8.4 Under the Information Technology Act, 2000 (India)</h3>
          <p>
            ProHealthLedger operates as an intermediary under Section&nbsp;79 of
            the IT Act. We do not author, edit, or endorse any user-submitted
            vote. We will comply with lawful requests from Indian authorities and
            provide reasonable assistance per the IT (Intermediary Guidelines)
            Rules, 2021.
          </p>

          <h3>8.5 Under CCPA (California residents)</h3>
          <p>
            California residents have the right to know what personal
            information is collected, request deletion (subject to the same
            limitations as GDPR erasure), and opt out of the sale of personal
            information. We do <strong>not</strong> sell personal information.
          </p>
        </section>

        {/* ── 9. Third-Party Services ── */}
        <section className="legal-section">
          <h2>9. Third-Party Services</h2>
          <p>We rely on the following third-party services:</p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Purpose</th>
                <th>Governing terms</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GitHub</td>
                <td>Authentication (OAuth), data storage, issue tracking</td>
                <td>
                  <a
                    href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Privacy Statement
                  </a>
                  {" · "}
                  <a
                    href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>
                </td>
              </tr>
              <tr>
                <td>LinkedIn</td>
                <td>
                  Authentication (Sign In with LinkedIn via OpenID Connect)
                </td>
                <td>
                  <a
                    href="https://www.linkedin.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn Privacy Policy
                  </a>
                  {" · "}
                  <a
                    href="https://www.linkedin.com/legal/l/api-terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    API Terms of Use
                  </a>
                  {" · "}
                  <a
                    href="https://legal.linkedin.com/bd-dpa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BD&nbsp;DPA
                  </a>
                </td>
              </tr>
              <tr>
                <td>Vercel (if deployed)</td>
                <td>Web hosting</td>
                <td>
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Vercel Privacy Policy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            We do not sell, rent, or share your personal information with any
            other third parties. Neither GitHub nor LinkedIn Content is made
            available to any third party outside of the authorized platform use
            described in this policy.
          </p>
        </section>

        {/* ── 10. Disclaimers and Limitation of Liability ── */}
        <section className="legal-section">
          <h2>10. Disclaimers and Limitation of Liability</h2>
          <div className="legal-callout legal-callout-info">
            <strong>Platform role:</strong> ProHealthLedger is a neutral
            intermediary. We do not author, verify, investigate, or endorse any
            vote or review. Neither GitHub nor LinkedIn has verified or
            confirmed the accuracy of any data displayed on this platform.
          </div>
          <ul>
            <li>
              All votes represent the <strong>subjective opinion</strong> of the
              individual contributor, not the opinion of ProHealthLedger, its
              operators, GitHub, or LinkedIn.
            </li>
            <li>
              We are not responsible for the accuracy, completeness, or
              consequences of any user-submitted content.
            </li>
            <li>
              LinkedIn profile URLs are used as publicly available identifiers.
              We do not scrape, crawl, spider, or access any LinkedIn content
              outside of the authorized APIs.
            </li>
            <li>
              The platform is provided <strong>&ldquo;as is&rdquo;</strong>{" "}
              without warranties of any kind, express or implied, including but
              not limited to merchantability, fitness for a particular purpose,
              and non-infringement.
            </li>
            <li>
              To the maximum extent permitted by law, ProHealthLedger and its
              operators shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of
              profits, data, or goodwill arising out of or in connection with
              the use of the platform.
            </li>
            <li>
              Contributors are solely responsible for the content of their
              submissions and any legal consequences arising therefrom,
              including but not limited to claims of defamation, libel, or
              tortious interference.
            </li>
            <li>
              You agree to indemnify and hold harmless ProHealthLedger and its
              operators from any claim or action brought by a third party
              resulting from your use of the platform, your submissions, or your
              breach of this Privacy Policy.
            </li>
          </ul>
        </section>

        {/* ── 11. Children ── */}
        <section className="legal-section">
          <h2>11. Children&rsquo;s Privacy</h2>
          <p>
            ProHealthLedger is not intended for use by anyone under the age of
            18. We do not knowingly collect personal information from minors. If
            we learn that we have collected data from a person under 18, we will
            take reasonable steps to delete it.
          </p>
        </section>

        {/* ── 12. Data Retention ── */}
        <section className="legal-section">
          <h2>12. Data Retention</h2>
          <p>
            Vote data is retained <strong>indefinitely</strong> as part of the
            permanent public record. This is the stated purpose of the platform,
            and you consent to this upon submission. Session cookies expire when
            you sign out or after a reasonable inactivity period.
          </p>
          <p>
            GitHub and LinkedIn OAuth tokens and Profile Data are retained only
            for the duration of your active session and for as long as necessary
            to provide the platform&rsquo;s services. Upon request, account
            closure, or termination of our API access, we will delete all
            GitHub and LinkedIn Content as required by the respective terms.
          </p>
          <p>
            Because vote data is committed to a public Git repository, it exists
            in the Git history even if later removed from the active dataset.
            This is an inherent property of Git-based storage.
          </p>
        </section>

        {/* ── 13. Security Incident Notification ── */}
        <section className="legal-section">
          <h2>13. Security Incident Notification</h2>
          <p>
            In the event of a security breach or incident that may affect the
            security of your data, GitHub Content, LinkedIn Content, or their
            respective users, we will promptly notify the affected platforms
            and users in accordance with LinkedIn API Terms (§7.1), GitHub&rsquo;s
            Terms of Service, and applicable data protection laws.
          </p>
        </section>

        {/* ── 14. Changes ── */}
        <section className="legal-section">
          <h2>14. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            reflected by updating the &ldquo;Effective date&rdquo; at the top of
            this page and committing the updated policy to the public
            repository. Your continued use of the platform after changes
            constitutes acceptance of the updated policy. In the event of any
            material change to the scope of our use or disclosure of LinkedIn
            Profile Data, we will notify you or obtain your consent to the
            change as required by applicable law and the LinkedIn API Terms
            (§5.2).
          </p>
        </section>

        {/* ── 15. Contact ── */}
        <section className="legal-section">
          <h2>15. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, wish to exercise
            any of your data rights, need to report a concern, or wish to
            request deletion of your GitHub or LinkedIn data, please:
          </p>
          <ul>
            <li>
              Open a{" "}
              <a
                href="https://github.com/muglikar/ProHealthLedger/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Issue
              </a>{" "}
              on the repository, or
            </li>
            <li>
              Email:{" "}
              <a href="mailto:privacy@prohealthledger.com">
                privacy@prohealthledger.com
              </a>
            </li>
          </ul>
        </section>

        <hr className="legal-divider" />
        <p className="legal-footer-note">
          This privacy policy was last updated on {effectiveDate}. The
          authoritative version is always available at{" "}
          <a
            href="https://github.com/muglikar/ProHealthLedger"
            target="_blank"
            rel="noopener noreferrer"
          >
            the public repository
          </a>
          .
        </p>
      </article>
    </>
  );
}
