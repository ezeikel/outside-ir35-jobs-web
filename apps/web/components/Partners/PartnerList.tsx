import {
  type Partner,
  type PartnerCategory,
  partnersByCategory,
  partnerUrl,
} from '@/lib/partners/partners';

const CATEGORY_TITLE: Record<PartnerCategory, string> = {
  insurance: 'IR35 / tax-investigation insurance',
  'contract-review': 'IR35 contract review',
};

const PartnerCard = ({ partner }: { partner: Partner }) => (
  <a
    href={partnerUrl(partner)}
    target="_blank"
    rel="noopener noreferrer sponsored nofollow"
    className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
  >
    <p className="font-display text-lg">{partner.name}</p>
    <p className="mt-1 text-sm text-muted-foreground">{partner.blurb}</p>
    <span className="mt-3 inline-block text-sm text-link">
      Visit {partner.name} →
    </span>
  </a>
);

// Lists affiliate partners by category. Server component — partnerUrl reads env for
// the affiliate link. `only` narrows to one category (e.g. on the insurance form).
const PartnerList = ({ only }: { only?: PartnerCategory } = {}) => {
  const categories: PartnerCategory[] = only
    ? [only]
    : ['insurance', 'contract-review'];

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const partners = partnersByCategory(category);
        if (partners.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="text-xl">{CATEGORY_TITLE[category]}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {partners.map((p) => (
                <PartnerCard key={p.key} partner={p} />
              ))}
            </div>
          </section>
        );
      })}
      <p className="text-xs leading-relaxed text-muted-foreground">
        These are independent third-party providers. Holding active IR35 /
        tax-investigation cover is a strong, checkable trust signal — but it
        does not determine or guarantee a role’s IR35 status. We may earn a
        commission if you take out a policy or review through these links, at no
        extra cost to you. Always check the cover suits your circumstances.
      </p>
    </div>
  );
};

export default PartnerList;
