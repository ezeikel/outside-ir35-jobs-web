import {
  ContractorDocType,
  JobIR35Signal,
  PosterType,
  Role,
  WorkMode,
} from '@outside-ir35-jobs/db/types';
import { z } from 'zod';

const INSURANCE_DOC_TYPES = [
  ContractorDocType.PI_INSURANCE,
  ContractorDocType.PL_INSURANCE,
  ContractorDocType.EL_INSURANCE,
] as const;

export const PostJobFormSchema = z.object({
  companyName: z.string(),
  position: z.string(),
  description: z.string(),
  keywords: z.string(),
  location: z.object({
    address: z.string(),
    placeId: z.string(),
    coordinates: z.object({
      lat: z.number().nullable(),
      lng: z.number().nullable(),
    }),
  }),
  companyLogo: z.string(),
  dayRate: z.union([
    z.array(z.number()).length(1), // Array with a single number
    z.tuple([z.number(), z.number()]), // Tuple with two numbers, min and max
  ]),
  howToApply: z.string(),
  applicationEmail: z.string(),
  workMode: z.nativeEnum(WorkMode),
  // The CLIENT's IR35 position, selected by the poster — never our assertion.
  ir35Signal: z.nativeEnum(JobIR35Signal),
  // Poster must confirm the signal reflects the client's stated position.
  ir35Attested: z.boolean().refine((v) => v === true, {
    message: 'Please confirm this reflects the client’s stated IR35 position.',
  }),
  companyTwitter: z.string(),
  companyEmail: z.string(),
  invoiceAddress: z.string(),
});

export type PostJobFormValues = z.infer<typeof PostJobFormSchema>;

// Role chosen at onboarding (first sign-in). The UI offers contractor
// (JOB_SEEKER) vs hiring (JOB_POSTER) — ADMIN is never offered. When hiring, the
// user must also say whether they're a recruiter or hiring directly (posterType).
export const OnboardingRoleSchema = z
  .object({
    role: z.nativeEnum(Role),
    posterType: z.nativeEnum(PosterType).optional(),
  })
  .refine((v) => v.role !== Role.JOB_POSTER || !!v.posterType, {
    message: 'Please tell us whether you’re a recruiter or hiring directly.',
    path: ['posterType'],
  });

export type OnboardingRoleValues = z.infer<typeof OnboardingRoleSchema>;

// Editing a document's compliance metadata (insurer / cover limit / expiry).
// Insurance certs (PI/PL/EL) require all three; right-to-work takes expiry only;
// other types carry no metadata. `coerce` turns form strings into number/date.
export const DocumentMetadataSchema = z
  .object({
    type: z.nativeEnum(ContractorDocType),
    insurer: z.string().trim().min(1).optional(),
    coverLimit: z.coerce.number().int().positive().optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (v) =>
      !(INSURANCE_DOC_TYPES as readonly ContractorDocType[]).includes(v.type) ||
      (!!v.insurer && !!v.coverLimit && !!v.expiresAt),
    {
      message: 'Insurer, cover limit and expiry date are all required.',
      path: ['insurer'],
    },
  );

export type DocumentMetadataValues = z.infer<typeof DocumentMetadataSchema>;

// Adding a limited company to verify. We only collect what's needed to check it
// against the official registers — name, incorporation number, VAT number.
// (Address comes back from Companies House; bank details are not collected here.)
export const AddCompanySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required.'),
  incorporationNumber: z
    .string()
    .trim()
    .min(1, 'Company registration number is required.'),
  vatNumber: z.string().trim().min(1, 'VAT number is required.'),
});

export type AddCompanyValues = z.infer<typeof AddCompanySchema>;

// A contractor's SELF-DECLARED IR35 / tax-investigation insurance. We can't verify
// a policy against a register, so this is a stated fact (provider + expiry), shown
// attributed to the contractor — never a platform guarantee. When `holds` is true,
// provider + expiry are required; when false we clear the fields.
export const Ir35InsuranceSchema = z
  .object({
    holds: z.boolean(),
    provider: z.string().trim().min(1).max(120).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((v) => !v.holds || (!!v.provider && !!v.expiresAt), {
    message: 'Provider and expiry date are required.',
    path: ['provider'],
  });

export type Ir35InsuranceValues = z.infer<typeof Ir35InsuranceSchema>;
