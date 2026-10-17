import { z } from 'zod';

export const COURSES = [
  'Beginner Car Driving',
  'Practical Driving Training',
  'Confidence Building',
  'Traffic & Road Practice',
] as const;

export const PREFERRED_TIMES = ['Morning', 'Afternoon', 'Evening', 'Flexible'] as const;

export const ENQUIRY_STATUSES = ['New', 'Contacted', 'Enrolled'] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

// What the public enquiry form is allowed to submit. Mirrors the checks in firestore.rules.
export const enquiryInputSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your full name.').max(80, 'Name is too long.'),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(10, 'Please enter a valid 10-digit phone number.')),
  course: z.enum(COURSES, { error: 'Please select a preferred course.' }),
  preferredTime: z.enum(PREFERRED_TIMES, { error: 'Please select your preferred time.' }),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
