import {
  JobIR35Signal,
  PosterType,
  Role,
  WorkMode,
} from '@outside-ir35-jobs/db/types';
import { z } from 'zod';

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
