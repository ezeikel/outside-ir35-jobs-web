import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import PartnerList from '@/components/Partners/PartnerList';

export const metadata: Metadata = {
  title: 'IR35 insurance & contract review — Outside IR35 Jobs',
  description:
    'IR35 / tax-investigation insurance and contract-review providers for UK limited-company contractors. The safe, checkable trust signal.',
  alternates: { canonical: '/partners' },
};

const PartnersPage = () => (
  <PageWrap>
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Protect your contract
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          IR35 insurance & contract review
        </h1>
        <p className="mt-3 text-muted-foreground">
          Holding active IR35 / tax-investigation cover — and an independent
          contract review on file — is the safest, most checkable trust signal a
          contractor can show. Here are specialist providers.
        </p>
      </header>
      <PartnerList />
    </div>
  </PageWrap>
);

export default PartnersPage;
