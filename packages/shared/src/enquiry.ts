import { z } from 'zod';

// Fallbacks used before a school has created its own courses (and by the Phase 0 form).
export const COURSES = [
  'Beginner Car Driving',
  'Practical Driving Training',
  'Confidence Building',
  'Traffic & Road Practice',
] as const;

export const PREFERRED_TIMES = ['Morning', 'Afternoon', 'Evening', 'Flexible'] as const;

export const ENQUIRY_STATUSES = ['New', 'Contacted', 'Enrolled', 'Lost'] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, '').slice(-10))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number.'));

// What the public enquiry form is allowed to submit. Mirrors validNewEnquiry() in firestore.rules.
export const enquiryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your full name.')
    .max(80, 'Name is too long.')
    // Spreadsheet formula characters (CSV injection, see docs/SECURITY_REVIEW.md M1). Mirrors safeText() in firestore.rules.
    .refine((v) => !/^[=+@\t\r-]/.test(v), 'Name cannot start with = + - or @.'),
  phone: phoneSchema,
  courseId: z.string().max(64).nullable().default(null),
  courseName: z.string().trim().min(1, 'Please select a preferred course.').max(80),
  preferredTime: z.enum(PREFERRED_TIMES, { error: 'Please select your preferred time.' }),
  source: z.enum(['app', 'web']).default('app'),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
