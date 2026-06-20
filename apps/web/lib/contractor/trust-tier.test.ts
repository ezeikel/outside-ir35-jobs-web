import {
  ContractorDocType,
  ContractorTrustTier,
  DocStatus,
} from '@outside-ir35-jobs/db/types';
import { describe, expect, it } from 'vitest';
import { computeTrustTier, type TrustTierState } from './trust-tier';

const verifiedCompany = {
  companyVerifiedAt: new Date('2026-01-01'),
  vatVerifiedAt: new Date('2026-01-01'),
};

const onFile = (type: ContractorDocType) => ({
  type,
  status: DocStatus.ON_FILE,
});

// A T3-complete state we can degrade in each test.
const fullState = (): TrustTierState => ({
  companies: [verifiedCompany],
  rightToWorkConfirmed: true,
  documents: [
    onFile(ContractorDocType.INCORPORATION),
    onFile(ContractorDocType.PI_INSURANCE),
    onFile(ContractorDocType.PL_INSURANCE),
    onFile(ContractorDocType.EL_INSURANCE),
    onFile(ContractorDocType.RIGHT_TO_WORK),
    onFile(ContractorDocType.CV),
  ],
});

describe('computeTrustTier', () => {
  it('is SELF_DECLARED with nothing verified', () => {
    expect(
      computeTrustTier({
        companies: [],
        documents: [],
        rightToWorkConfirmed: false,
      }),
    ).toBe(ContractorTrustTier.SELF_DECLARED);
  });

  it('stays SELF_DECLARED if company is only half-verified', () => {
    expect(
      computeTrustTier({
        companies: [{ companyVerifiedAt: new Date(), vatVerifiedAt: null }],
        documents: [],
        rightToWorkConfirmed: false,
      }),
    ).toBe(ContractorTrustTier.SELF_DECLARED);
  });

  it('is cumulative: full docs but NO company verification → SELF_DECLARED', () => {
    const s = fullState();
    s.companies = [];
    expect(computeTrustTier(s)).toBe(ContractorTrustTier.SELF_DECLARED);
  });

  it('is IDENTITY_VERIFIED with company+VAT verified but no insurance', () => {
    expect(
      computeTrustTier({
        companies: [verifiedCompany],
        documents: [],
        rightToWorkConfirmed: false,
      }),
    ).toBe(ContractorTrustTier.IDENTITY_VERIFIED);
  });

  it('stays IDENTITY_VERIFIED if only some insurance certs are on file', () => {
    const s = fullState();
    s.documents = [
      onFile(ContractorDocType.PI_INSURANCE),
      onFile(ContractorDocType.PL_INSURANCE),
      // EL missing
    ];
    expect(computeTrustTier(s)).toBe(ContractorTrustTier.IDENTITY_VERIFIED);
  });

  it('is DOCUMENTS_ON_FILE with all insurance but right-to-work not confirmed', () => {
    const s = fullState();
    s.rightToWorkConfirmed = false;
    expect(computeTrustTier(s)).toBe(ContractorTrustTier.DOCUMENTS_ON_FILE);
  });

  it('is DOCUMENTS_ON_FILE when an expected doc is missing', () => {
    const s = fullState();
    s.documents = s.documents.filter((d) => d.type !== ContractorDocType.CV);
    expect(computeTrustTier(s)).toBe(ContractorTrustTier.DOCUMENTS_ON_FILE);
  });

  it('is DOCUMENTS_ON_FILE when an expected doc is EXPIRING (not in-date)', () => {
    const s = fullState();
    s.documents = s.documents.map((d) =>
      d.type === ContractorDocType.PI_INSURANCE
        ? { ...d, status: DocStatus.EXPIRING }
        : d,
    );
    expect(computeTrustTier(s)).toBe(ContractorTrustTier.DOCUMENTS_ON_FILE);
  });

  it('is DOCUMENTS_ON_FILE when an expected doc is FAILED (expired)', () => {
    const s = fullState();
    s.documents = s.documents.map((d) =>
      d.type === ContractorDocType.RIGHT_TO_WORK
        ? { ...d, status: DocStatus.FAILED }
        : d,
    );
    expect(computeTrustTier(s)).toBe(ContractorTrustTier.DOCUMENTS_ON_FILE);
  });

  it('is COMPLIANCE_CURRENT when everything is present, in-date, and RTW confirmed', () => {
    expect(computeTrustTier(fullState())).toBe(
      ContractorTrustTier.COMPLIANCE_CURRENT,
    );
  });
});
