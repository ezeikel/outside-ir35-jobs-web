import type { Metadata } from 'next';
import LegalPage, { H2, P, UL } from '@/components/Legal/LegalPage';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Privacy policy — outsideir35.jobs',
  description:
    'How outsideir35.jobs collects, uses, stores and protects your personal data, your lawful basis, retention, processors and your rights under UK GDPR.',
};

const PrivacyPage = () => (
  <PageWrap>
    <LegalPage title="Privacy policy" updated="21 June 2026">
      <P>
        This privacy policy explains how outsideir35.jobs (“we”, “us”, “our”), a
        service operated by Chewy Bytes Limited (company number 16443347,
        registered at 71-75 Shelton Street, London, WC2H 9JQ), collects, uses
        and protects your personal data. Chewy Bytes Limited is the data
        controller.
      </P>
      <P>
        We are committed to keeping your data safe and to being honest about
        what we do with it. If you have any questions, contact us at{' '}
        <a
          className="text-verified underline"
          href="mailto:hello@chewybytes.com"
        >
          hello@chewybytes.com
        </a>
        .
      </P>

      <H2>Who this applies to</H2>
      <P>
        This policy covers contractors (job seekers), people who post or hire
        for contracts, and visitors to the site.
      </P>

      <H2>What we collect</H2>
      <UL>
        <li>
          <strong>Account details</strong> — your name and email address when
          you sign in (via Google), and the role you choose at onboarding.
        </li>
        <li>
          <strong>Contractor profile</strong> — information you choose to
          provide, including your limited company details (company name,
          registration number, VAT number) and uploaded documents (CV,
          certificate of incorporation, insurance certificates, right-to-work
          evidence).
        </li>
        <li>
          <strong>Information extracted from your CV</strong> — when you upload
          a CV we use AI to extract a structured summary of your skills and
          experience to help match you to contracts. We extract professional
          competency only and do not extract identity details such as your name,
          address or phone number from the CV.
        </li>
        <li>
          <strong>Job postings</strong> — the content you submit if you post a
          contract.
        </li>
        <li>
          <strong>Technical data</strong> — basic logs and error reports needed
          to run and secure the service.
        </li>
      </UL>

      <H2>How we use it, and our lawful basis</H2>
      <P>Under UK GDPR we rely on the following lawful bases:</P>
      <UL>
        <li>
          <strong>Performance of a contract</strong> — to provide your account,
          your profile, document storage, and job-matching features you ask for.
        </li>
        <li>
          <strong>Legitimate interests</strong> — to operate, secure and improve
          the platform, and to surface relevant contracts to you. We balance
          this against your rights.
        </li>
        <li>
          <strong>Legal obligation</strong> — where we must keep or disclose
          data to comply with the law.
        </li>
        <li>
          <strong>Consent</strong> — where we ask for it; you can withdraw
          consent at any time.
        </li>
      </UL>

      <H2>Verification of company and tax details</H2>
      <P>
        When you add a limited company, we check the details you provide against
        official public registers: Companies House (to confirm the company is
        registered and active) and, where available, HMRC’s “Check a UK VAT
        number” service (to confirm a VAT registration). We record only the
        result of these checks (for example, “verified” and the date). We never
        assert a role’s IR35 status — only the end client can determine that.
      </P>

      <H2>Where your data is stored and who processes it</H2>
      <P>
        We use trusted service providers (processors) to run the platform. Your
        data may be processed by:
      </P>
      <UL>
        <li>
          <strong>Neon</strong> (PostgreSQL database) and{' '}
          <strong>Vercel</strong> (hosting) — core application data; servers in
          the United States.
        </li>
        <li>
          <strong>Cloudflare R2</strong> — secure, private storage for your
          uploaded documents (CV, certificates). These are never publicly
          accessible; they are served only to you via short-lived, signed links.
        </li>
        <li>
          <strong>Anthropic and OpenAI</strong> — AI processing to extract your
          CV profile and to power semantic search and matching.
        </li>
        <li>
          <strong>Companies House and HMRC</strong> — to verify company and VAT
          details you provide.
        </li>
        <li>
          <strong>Google</strong> — sign-in.
        </li>
      </UL>
      <P>
        Some of these providers are based outside the UK. Where data is
        transferred internationally, it is protected by appropriate safeguards
        as required by UK GDPR. Data is encrypted in transit (HTTPS/TLS) and at
        rest.
      </P>

      <H2>How long we keep it</H2>
      <P>
        We keep your account and profile data for as long as your account is
        active. If you close your account or ask us to delete your data, we
        remove your personal data and uploaded documents, except where we must
        keep certain records to comply with the law.
      </P>

      <H2>Your rights</H2>
      <P>Under UK GDPR you have the right to:</P>
      <UL>
        <li>access the personal data we hold about you;</li>
        <li>ask us to correct inaccurate data;</li>
        <li>ask us to delete your data;</li>
        <li>restrict or object to certain processing;</li>
        <li>request a copy of your data in a portable format;</li>
        <li>withdraw consent where we rely on it.</li>
      </UL>
      <P>
        To exercise any of these, email{' '}
        <a
          className="text-verified underline"
          href="mailto:hello@chewybytes.com"
        >
          hello@chewybytes.com
        </a>
        . You also have the right to complain to the Information Commissioner’s
        Office (ICO) at{' '}
        <a
          className="text-verified underline"
          href="https://ico.org.uk"
          target="_blank"
          rel="noopener noreferrer"
        >
          ico.org.uk
        </a>
        .
      </P>

      <H2>Security</H2>
      <P>
        We protect your data with encryption in transit and at rest, private
        storage for documents, access controls, and monitoring. No system is
        perfectly secure, but we work to keep your data safe and will notify the
        relevant authorities and affected users of any breach as required by
        law.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        We may update this policy from time to time. We will update the “last
        updated” date above when we do.
      </P>
    </LegalPage>
  </PageWrap>
);

export default PrivacyPage;
