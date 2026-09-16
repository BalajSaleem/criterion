import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Criterion",
  description:
    "Learn how Criterion collects, uses, and protects your data while providing authentic Islamic knowledge.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1>Privacy Policy</h1>
        <p className="lead">
          Criterion is committed to protecting your privacy while providing
          authentic Islamic knowledge. This policy explains how we collect,
          use, and safeguard your information.
        </p>

        <p>
          <strong>Last Updated:</strong> September 16, 2026
        </p>

        <hr />

        <h2>Our Commitment</h2>
        <p>
          Criterion exists to serve humanity by making Islamic knowledge
          accessible to all. We collect only the minimal data necessary to
          provide and improve our service. We do not sell your data, show
          advertisements, or track you across the web.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Account Information (Optional)</h3>
        <p>
          If you choose to create an account, we collect:
        </p>
        <ul>
          <li>Email address</li>
          <li>Name (optional)</li>
          <li>Password (encrypted and never stored in plain text)</li>
        </ul>
        <p>
          <strong>Note:</strong> An account is not required to search the Quran
          or Hadith. You can use our search features anonymously without
          creating an account.
        </p>

        <h3>1.2 Chat History (Authenticated Users Only)</h3>
        <p>
          If you create an account and use the chat interface, we store:
        </p>
        <ul>
          <li>Your questions and our responses</li>
          <li>Timestamps of conversations</li>
          <li>Chat visibility settings (public/private)</li>
        </ul>
        <p>
          <strong>Purpose:</strong> To provide you with conversation history
          and enable features like shareable chats.
        </p>
        <p>
          <strong>Control:</strong> You can delete individual chats or your
          entire chat history at any time from your account settings.
        </p>

        <h3>1.3 Search Queries (Anonymous)</h3>
        <p>
          When you search the Quran or Hadith without an account:
        </p>
        <ul>
          <li>Search queries are processed in real-time</li>
          <li>
            We do NOT store your search queries or link them to your identity
          </li>
          <li>
            We may collect anonymized aggregate statistics (e.g., "How many
            people searched for 'patience' this month?")
          </li>
        </ul>

        <h3>1.4 Feedback You Submit</h3>
        <p>
          Criterion lets you rate an answer, flag a problem with it, or leave a
          short comment about how the service is doing. When you do:
        </p>
        <ul>
          <li>
            We store your rating, the reason you selected (if any), and your
            comment, alongside the conversation it refers to
          </li>
          <li>
            We record which Quran verses or Hadith narrations the answer cited,
            so we can find and fix inaccurate sources
          </li>
          <li>
            <strong>We never ask for your email address or any contact
            details.</strong> Feedback is available to everyone, including
            visitors without an account
          </li>
        </ul>
        <p>
          <strong>Purpose:</strong> To find inaccurate or unhelpful answers, to
          understand whether Criterion is serving you well, and to decide what
          to improve next. Feedback is stored in our own database and is not
          shared with any third-party feedback or analytics service.
        </p>
        <p>
          <strong>Control:</strong> Feedback is stored with the chat it refers
          to, so deleting that chat deletes the feedback along with it. Please
          do not include personal information in the comment field.
        </p>

        <h3>1.5 Technical Information</h3>
        <p>
          Like most websites, we automatically collect certain technical
          information:
        </p>
        <ul>
          <li>
            IP address (used for rate limiting and preventing abuse, not stored
            long-term)
          </li>
          <li>Browser type and version</li>
          <li>Device type (mobile, desktop, tablet)</li>
          <li>Operating system</li>
          <li>Referring website (if you came from another site)</li>
          <li>Pages visited and time spent on pages</li>
        </ul>
        <p>
          <strong>Purpose:</strong> To diagnose technical issues, prevent
          abuse, and improve the user experience.
        </p>

        <h3>1.6 Cookies and Local Storage</h3>
        <p>We use minimal cookies and browser storage:</p>
        <ul>
          <li>
            <strong>Authentication cookie:</strong> To keep you logged in (if
            you have an account)
          </li>
          <li>
            <strong>Theme preference:</strong> To remember if you prefer light
            or dark mode
          </li>
          <li>
            <strong>Disclaimer acceptance:</strong> To remember that you've
            read our first-visit disclaimer
          </li>
        </ul>
        <p>
          <strong>No third-party tracking cookies.</strong> We do not use
          advertising cookies or allow third parties to track you on our site.
        </p>

        <h2>2. How We Use Your Information</h2>

        <h3>2.1 To Provide the Service</h3>
        <ul>
          <li>Process your search queries and return relevant results</li>
          <li>Generate AI responses grounded in authentic Islamic sources</li>
          <li>Save your chat history (if you have an account)</li>
        </ul>

        <h3>2.2 To Improve the Service</h3>
        <ul>
          <li>
            Analyze anonymized usage patterns to improve search relevance
          </li>
          <li>Identify and fix technical issues</li>
          <li>Understand which features are most helpful to users</li>
        </ul>

        <h3>2.3 To Ensure Security and Prevent Abuse</h3>
        <ul>
          <li>Rate limiting to prevent spam and abuse</li>
          <li>Detect and block malicious activity</li>
          <li>Protect against unauthorized access to accounts</li>
        </ul>

        <h3>2.4 To Communicate with You (Optional)</h3>
        <ul>
          <li>
            Send important service updates (e.g., changes to this policy)
          </li>
          <li>
            Respond to your support requests or feedback (only if you contact
            us)
          </li>
        </ul>
        <p>
          <strong>We will never send you marketing emails or spam.</strong> All
          communication is service-related only.
        </p>

        <h2>3. How We Share Your Information</h2>

        <h3>3.1 We Do NOT Sell Your Data</h3>
        <p>
          Criterion will never sell, rent, or trade your personal information.
          Period.
        </p>

        <h3>3.2 Third-Party Service Providers</h3>
        <p>
          We use trusted third-party services to operate Criterion. These
          providers have access to your data only to perform specific tasks on
          our behalf:
        </p>

        <h4>Google (Embeddings)</h4>
        <ul>
          <li>
            <strong>What they process:</strong> Search queries (to generate
            semantic embeddings)
          </li>
          <li>
            <strong>Purpose:</strong> Enable semantic search across Quran and
            Hadith
          </li>
          <li>
            <strong>Privacy policy:</strong>{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://policies.google.com/privacy
            </a>
          </li>
        </ul>

        <h4>Vercel (Hosting and Infrastructure)</h4>
        <ul>
          <li>
            <strong>What they process:</strong> Technical information (IP
            addresses, request logs)
          </li>
          <li>
            <strong>Purpose:</strong> Host and deliver the Criterion website
          </li>
          <li>
            <strong>Privacy policy:</strong>{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://vercel.com/legal/privacy-policy
            </a>
          </li>
        </ul>

        <h4>PostgreSQL Database Hosting</h4>
        <ul>
          <li>
            <strong>What they store:</strong> Your account information, chat
            history, and session data
          </li>
          <li>
            <strong>Purpose:</strong> Secure data storage
          </li>
          <li>
            <strong>Security:</strong> All data is encrypted in transit and at
            rest
          </li>
        </ul>

        <h3>3.3 Public Chat Sharing</h3>
        <p>
          If you explicitly choose to make a chat conversation public and share
          its URL:
        </p>
        <ul>
          <li>Anyone with the link can view that specific conversation</li>
          <li>The conversation may be indexed by search engines</li>
          <li>
            You can change a chat from public to private at any time (the link
            will stop working)
          </li>
        </ul>
        <p>
          <strong>Default:</strong> All chats are private unless you explicitly
          change the setting.
        </p>

        <h3>3.4 Legal Requirements</h3>
        <p>
          We may disclose your information if required by law, such as:
        </p>
        <ul>
          <li>In response to a valid court order or subpoena</li>
          <li>To protect our legal rights or defend against legal claims</li>
          <li>
            To prevent imminent harm or illegal activity (e.g., threats of
            violence)
          </li>
        </ul>
        <p>
          We will always seek to notify you before disclosing your information,
          unless prohibited by law.
        </p>

        <h2>4. Data Retention</h2>

        <h3>4.1 Account Data</h3>
        <ul>
          <li>
            <strong>Retention:</strong> Stored until you delete your account
          </li>
          <li>
            <strong>Deletion:</strong> You can delete your account at any time
            from your account settings
          </li>
          <li>
            <strong>Post-deletion:</strong> All your data is permanently
            deleted within 30 days
          </li>
        </ul>

        <h3>4.2 Chat History</h3>
        <ul>
          <li>
            <strong>Retention:</strong> Stored until you delete it or delete
            your account
          </li>
          <li>
            <strong>Control:</strong> You can delete individual chats or your
            entire history at any time
          </li>
        </ul>

        <h3>4.3 Technical Logs</h3>
        <ul>
          <li>
            <strong>Retention:</strong> IP addresses and request logs are
            deleted after 7 days
          </li>
          <li>
            <strong>Exception:</strong> Anonymized aggregate statistics may be
            retained indefinitely
          </li>
        </ul>

        <h2>5. Data Security</h2>
        <p>We take security seriously and implement industry-standard measures:</p>
        <ul>
          <li>
            <strong>Encryption:</strong> All data is encrypted in transit
            (HTTPS/TLS) and at rest
          </li>
          <li>
            <strong>Password security:</strong> Passwords are hashed using
            bcrypt (never stored in plain text)
          </li>
          <li>
            <strong>Access control:</strong> Database access is restricted to
            authorized personnel only
          </li>
          <li>
            <strong>Rate limiting:</strong> Protects against brute-force
            attacks and abuse
          </li>
          <li>
            <strong>Regular updates:</strong> We keep our systems and
            dependencies up-to-date with security patches
          </li>
        </ul>
        <p>
          However, no method of transmission or storage is 100% secure. While
          we strive to protect your data, we cannot guarantee absolute
          security.
        </p>

        <h2>6. Your Rights and Choices</h2>

        <h3>6.1 Access and Portability</h3>
        <ul>
          <li>
            <strong>Access:</strong> You can view all your data in your account
            settings
          </li>
          <li>
            <strong>Export:</strong> You can export your chat history as JSON
            at any time
          </li>
        </ul>

        <h3>6.2 Correction and Deletion</h3>
        <ul>
          <li>
            <strong>Correct:</strong> Update your email or name in account
            settings
          </li>
          <li>
            <strong>Delete:</strong> Delete individual chats, your entire chat
            history, or your account
          </li>
        </ul>

        <h3>6.3 Opt-Out</h3>
        <ul>
          <li>
            <strong>Anonymous usage:</strong> You can use Criterion without an
            account (search only)
          </li>
          <li>
            <strong>Do Not Track:</strong> We respect the Do Not Track (DNT)
            browser setting
          </li>
        </ul>

        <h3>6.4 Data Portability</h3>
        <p>
          You have the right to receive your data in a structured,
          machine-readable format (JSON) and to transfer it to another service.
        </p>

        <h2>7. Children's Privacy</h2>
        <p>
          Criterion is not directed at children under 13. We do not knowingly
          collect personal information from children under 13. If you are a
          parent or guardian and believe your child has provided us with
          personal information, please contact us and we will delete it
          immediately.
        </p>

        <h2>8. International Users</h2>
        <p>
          Criterion is operated from the United States. If you are accessing
          Criterion from outside the United States, please be aware that your
          information may be transferred to, stored, and processed in the
          United States.
        </p>
        <p>
          By using Criterion, you consent to the transfer of your information
          to the United States and the processing of your information in
          accordance with this Privacy Policy.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes in our practices or legal requirements. When we make changes:
        </p>
        <ul>
          <li>We will update the "Last Updated" date at the top</li>
          <li>
            We will notify you via email if you have an account (for
            significant changes)
          </li>
          <li>
            We will display a notice on the website (for significant changes)
          </li>
        </ul>
        <p>
          <strong>Your continued use of Criterion after changes constitutes
          acceptance of the updated policy.</strong>
        </p>

        <h2>10. Open Source Transparency</h2>
        <p>
          Criterion is open source. You can review our code, data handling
          practices, and security measures on GitHub:
        </p>
        <p>
          <a
            href="https://github.com/BalajSaleem/criterion"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm"
          >
            https://github.com/BalajSaleem/criterion
          </a>
        </p>
        <p>
          We believe in radical transparency. If you have questions about how
          we handle your data, you can read the source code yourself or ask the
          community.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or your personal information, please contact us:
        </p>
        <ul>
          <li>
            <strong>Email:</strong> criterion.life.team@gmail.com
          </li>
          <li>
            <strong>GitHub Issues:</strong>{" "}
            <a
              href="https://github.com/BalajSaleem/criterion/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/BalajSaleem/criterion/issues
            </a>
          </li>
          <li>
            <strong>GitHub Discussions:</strong>{" "}
            <a
              href="https://github.com/BalajSaleem/criterion/discussions"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/BalajSaleem/criterion/discussions
            </a>
          </li>
        </ul>
        <p>We will respond to all requests within 30 days.</p>

        <hr />

        <h2>Our Promise</h2>
        <p className="text-lg font-medium">
          Criterion exists to serve humanity by making authentic Islamic
          knowledge accessible to all. We build for the sake of Allah, not for
          profit. We will never compromise your privacy or trust to serve
          commercial interests.
        </p>
        <p className="text-lg font-medium">
          This service is a Sadaqah Jariyah (ongoing charity), and your privacy
          is part of that trust we hold sacred.
        </p>

        <p className="text-sm text-muted-foreground mt-8">
          <strong>Last Updated:</strong> September 16, 2026
        </p>
      </article>
    </div>
  );
}
