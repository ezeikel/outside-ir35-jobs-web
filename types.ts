/* eslint-disable import/prefer-default-export */
import { z } from 'zod';

export const PostJobFormSchema = z.object({
  companyName: z.string(),
  position: z.string(),
  jobDescription: z.string(),
  keywords: z.string(),
  location: z.string(),
  companyLogo: z.string(),
  dayRate: z.union([
    z.array(z.number()).length(1), // Array with a single number
    z.tuple([z.number(), z.number()]), // Tuple with two numbers, min and max
  ]),
  howToApply: z.string(),
  applicationEmail: z.string(),
  workMode: z.string(),
  companyTwitter: z.string(),
  companyEmail: z.string(),
  invoiceAddress: z.string(),
});
