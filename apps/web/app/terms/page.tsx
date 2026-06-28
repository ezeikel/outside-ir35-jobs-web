import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { H2, P, UL } from '@/components/Legal/LegalPage';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Terms and conditions — outsideir35jobs.com',
  description:
    'The terms and conditions for using outsideir35jobs.com, the UK outside-IR35 contract job board and contractor-identity platform.',
};

const TermsPage = () => (
  <PageWrap>
    <LegalPage title="Terms and conditions" updated="21 June 2026">
      <P>
        These terms govern your use of outsideir35jobs.com (the “service”),
        operated by Chewy Bytes Limited (company number 16443347, registered at
        71-75 Shelton Street, London, WC2H 9JQ). By using the service you agree
        to these terms. If you do not agree, please do not use the service.
      </P>

      <H2>What the service is</H2>
      <P>
        outsideir35jobs.com is a job board and contractor-identity platform for
        UK limited-company contractors who want outside-IR35 contracts. We
        aggregate and host contract listings, let contractors build a verified
        profile and compliance pack, and provide market data such as day-rate
        benchmarks and editorial guidance.
      </P>

      <H2>We do not determine IR35 status</H2>
      <P>
        This is important. Only the end client can legally determine a role’s
        IR35 status, through a Status Determination Statement (SDS). We never
        assert, verify, guarantee, or warrant that any role is “outside IR35”.
        Where a listing indicates an IR35 position, we present it as the
        client’s own stated claim, attributed and dated — not as our
        determination. We surface objectively checkable facts (such as company
        and VAT registration verified against official registers) and the
        client’s claims; nothing on this service is tax or legal advice. You
        should take your own professional advice and consider IR35 insurance.
      </P>

      <H2>Your account</H2>
      <UL>
        <li>
          You are responsible for the information you provide and for keeping
          your account secure.
        </li>
        <li>
          You must provide accurate information and have the right to upload any
          documents you submit.
        </li>
        <li>
          You must not misuse the service, attempt to gain unauthorised access,
          or use it unlawfully.
        </li>
      </UL>

      <H2>Job listings and verification</H2>
      <P>
        Some listings are aggregated from third-party sources; where they are,
        we attribute the source and link back to the original. We are not
        responsible for the accuracy of third-party listings or for the conduct
        of clients, agencies or contractors. Verification checks (for example,
        Companies House and HMRC VAT) confirm only what those official registers
        return at the time of the check.
      </P>

      <H2>Your content</H2>
      <P>
        You retain ownership of the content and documents you upload. You grant
        us the licence needed to store, process and display that content to
        operate the service (for example, to show your profile or match you to
        contracts). You can remove your content or delete your account at any
        time. How we handle your personal data is described in our{' '}
        <Link className="text-verified underline" href="/privacy">
          privacy policy
        </Link>
        .
      </P>

      <H2>Availability and changes</H2>
      <P>
        We aim to keep the service available but do not guarantee uninterrupted
        access. We may change, suspend or withdraw features, and we may update
        these terms. Continued use after a change means you accept the updated
        terms.
      </P>

      <H2>Liability</H2>
      <P>
        To the extent permitted by law, we are not liable for any loss arising
        from your use of the service, from reliance on any listing, claim,
        benchmark or guidance, or from decisions you make about contracts or
        your IR35 position. Nothing in these terms limits liability that cannot
        be limited by law.
      </P>

      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of England and Wales, and the
        courts of England and Wales have exclusive jurisdiction.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about these terms? Email{' '}
        <a
          className="text-verified underline"
          href="mailto:hello@chewybytes.com"
        >
          hello@chewybytes.com
        </a>
        .
      </P>
    </LegalPage>
  </PageWrap>
);

export default TermsPage;
