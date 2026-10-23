// Status → badge tone/label maps shared across pages (kept out of component files for fast refresh).
import type { Booking, PaymentStatus, StudentStatus } from '@steerly/shared';
import type { Tone } from '../components/ui';

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = { created: 'amber', paid: 'emerald', failed: 'red', cancelled: 'slate' };
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { created: 'Awaiting payment', paid: 'Paid', failed: 'Failed', cancelled: 'Cancelled' };

export const BOOKING_TONE: Record<Booking['status'], Tone> = { booked: 'blue', completed: 'emerald', cancelled: 'slate', no_show: 'red' };
export const BOOKING_LABEL: Record<Booking['status'], string> = { booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };

export const STUDENT_STATUS_TONE: Record<StudentStatus, Tone> = { active: 'emerald', completed: 'blue', dropped: 'slate' };
