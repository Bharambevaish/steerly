import { AggregateField, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { getDashboardStatsSchema, type Booking, type DashboardStats, type EnquiryDoc, type Member, type Payment } from '@steerly/shared';
import { sub } from './lib/data';
import { ADMIN, assertRole, callable } from './lib/guard';
import { DAY_MS, istDate } from './lib/time';

const MAX_RANGE_DAYS = 366;

export const getDashboardStats = callable(getDashboardStatsSchema, async (data, request): Promise<DashboardStats> => {
  assertRole(request, data.schoolId, ADMIN);
  const fromMs = Date.parse(data.from);
  const toMs = Date.parse(data.to);
  if (toMs <= fromMs) throw new HttpsError('invalid-argument', 'The end of the range must be after the start.');
  if (toMs - fromMs > MAX_RANGE_DAYS * DAY_MS) throw new HttpsError('invalid-argument', 'Please choose a range of one year or less.');
  const from = Timestamp.fromMillis(fromMs);
  const to = Timestamp.fromMillis(toMs);
  const sid = data.schoolId;

  const [enquiries, students, bookings, payments, members] = await Promise.all([
    sub(sid, 'enquiries').where('createdAt', '>=', from).where('createdAt', '<', to).select('status', 'source').get(),
    sub(sid, 'students')
      .where('status', '==', 'active')
      .aggregate({ count: AggregateField.count(), feeTotal: AggregateField.sum('feeTotal'), feePaid: AggregateField.sum('feePaid') })
      .get(),
    sub(sid, 'bookings').where('start', '>=', from).where('start', '<', to).select('status', 'instructorId', 'instructorName', 'rating').get(),
    sub(sid, 'payments').where('status', '==', 'paid').where('paidAt', '>=', from).where('paidAt', '<', to).select('amount', 'paidAt').get(),
    // All members: instructors plus owners/staff who also teach (names for lessonsByInstructor).
    sub(sid, 'members').get(),
  ]);

  // Enquiries
  const enquiryDocs = enquiries.docs.map((d) => d.data() as Pick<EnquiryDoc, 'status' | 'source'>);
  const bySource = new Map<string, number>();
  for (const e of enquiryDocs) bySource.set(e.source ?? 'app', (bySource.get(e.source ?? 'app') ?? 0) + 1);
  const enrolled = enquiryDocs.filter((e) => e.status === 'Enrolled').length;

  // Students
  const agg = students.data();
  const outstanding = Math.max(0, (agg.feeTotal ?? 0) - (agg.feePaid ?? 0));

  // Lessons
  const names = new Map(members.docs.map((d) => [d.id, (d.data() as Member).name]));
  const perInstructor = new Map<string, { name: string; completed: number; ratingSum: number; ratings: number }>();
  let lessonsCompleted = 0;
  let noShows = 0;
  for (const doc of bookings.docs) {
    const b = doc.data() as Pick<Booking, 'status' | 'instructorId' | 'instructorName' | 'rating'>;
    if (b.status === 'no_show') noShows++;
    if (b.status !== 'completed') continue;
    lessonsCompleted++;
    const row = perInstructor.get(b.instructorId) ?? {
      name: names.get(b.instructorId) ?? b.instructorName,
      completed: 0,
      ratingSum: 0,
      ratings: 0,
    };
    row.completed++;
    if (typeof b.rating === 'number') {
      row.ratingSum += b.rating;
      row.ratings++;
    }
    perInstructor.set(b.instructorId, row);
  }

  // Revenue
  const byDay = new Map<string, number>();
  let revenue = 0;
  for (const doc of payments.docs) {
    const p = doc.data() as Pick<Payment, 'amount' | 'paidAt'>;
    revenue += p.amount;
    if (p.paidAt) {
      const day = istDate(p.paidAt.toMillis());
      byDay.set(day, (byDay.get(day) ?? 0) + p.amount);
    }
  }

  return {
    newEnquiries: enquiryDocs.length,
    conversionRate: enquiryDocs.length ? enrolled / enquiryDocs.length : 0,
    activeStudents: agg.count,
    lessonsCompleted,
    noShows,
    revenue,
    outstanding,
    revenueByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    lessonsByInstructor: [...perInstructor.entries()]
      .map(([instructorId, r]) => ({
        instructorId,
        name: r.name,
        completed: r.completed,
        avgRating: r.ratings ? Math.round((r.ratingSum / r.ratings) * 10) / 10 : null,
      }))
      .sort((a, b) => b.completed - a.completed),
    enquiriesBySource: [...bySource.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
  };
});
