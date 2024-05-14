/* eslint-disable import/prefer-default-export */
import { WorkMode } from '@prisma/client';
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
  companyTwitter: z.string(),
  companyEmail: z.string(),
  invoiceAddress: z.string(),
});

export type PostJobFormValues = z.infer<typeof PostJobFormSchema>;
