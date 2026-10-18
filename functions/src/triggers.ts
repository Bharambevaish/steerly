import { Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { COLLECTIONS, TIMEZONE, type Booking, type EnquiryDoc, type School, type Student, type Vehicle } from '@steerly/shared';
import { db } from './lib/admin';
import { as, schoolIdOf, schoolRef, subDoc } from './lib/data';
import { notify, notifySchoolAdmins } from './lib/notify';
import { AISENSY_API_KEY, WHATSAPP_CAMPAIGN_LESSON_REMINDER } from './lib/params';
import { sendWhatsApp } from './lib/whatsapp';
import { addDays, DAY_MS, daysBetween, HOUR_MS, istDate, istDateLabel, istDayStart, istLabel } from './lib/time';

/** Sources an admin enters by hand; they don't need a "new enquiry" alert. */
const ADMIN_SOURCES = new Set(['walk_in', 'phone', 'referral']);

export const onEnquiryCreated = onDocumentCreated('schools/{schoolId}/enquiries/{enquiryId}', async (event) => {
  const enquiry = event.data?.data() as EnquiryDoc | undefined;
  if (!enquiry || ADMIN_SOURCES.has(enquiry.source)) return;
  await notifySchoolAdmins(event.params.schoolId, {
    title: 'New enquiry',
    body: `New enquiry: ${enquiry.name} – ${enquiry.courseName}`,
    type: 'enquiry',
    link: `/enquiries/${event.params.enquiryId}`,
  });
});

// ---------- Lesson reminders (every 15 min) ----------

export const lessonReminders = onSchedule({ schedule: 'every 15 minutes', timeZone: TIMEZONE, secrets: [AISENSY_API_KEY] }, async () => {
  const now = Date.now();
  const snap = await db
    .collectionGroup('bookings')
    .where('status', '==', 'booked')
    .where('reminderSent', '==', false)
    .where('start', '>', Timestamp.fromMillis(now))
    .where('start', '<=', Timestamp.fromMillis(now + 2 * HOUR_MS))
    .get();
  for (const doc of snap.docs) {
    try {
      await remindBooking(doc);
    } catch (err) {
      logger.error('lessonReminders: failed for booking', { path: doc.ref.path, err });
    }
  }
  logger.info(`lessonReminders: ${snap.size} reminder(s)`);
});

async function remindBooking(doc: QueryDocumentSnapshot): Promise<void> {
  const b = doc.data() as Booking;
  const schoolId = schoolIdOf(doc.ref);
  // Claim the reminder first so overlapping runs never double-send.
  const claimed = await db.runTransaction(async (tx) => {
    const fresh = as<Booking>(await tx.get(doc.ref));
    if (!fresh || fresh.reminderSent || fresh.status !== 'booked') return false;
    tx.update(doc.ref, { reminderSent: true });
    return true;
  });
  if (!claimed) return;
  const student = as<Student>(await subDoc(schoolId, 'students', b.studentId).get());
  const when = istLabel(b.start.toMillis());
  const link = `/bookings/${b.id}`;
  await notify(student?.uid, { title: 'Lesson reminder', body: `Your lesson with ${b.instructorName} is at ${when}.`, type: 'lesson_reminder', link });
  await notify(b.instructorId, { title: 'Upcoming lesson', body: `${b.studentName} at ${when}.`, type: 'lesson_reminder', link });
  const school = as<School>(await schoolRef(schoolId).get());
  await sendWhatsApp({
    phone10: b.studentPhone,
    campaign: WHATSAPP_CAMPAIGN_LESSON_REMINDER.value(),
    userName: b.studentName,
    params: [b.studentName, b.instructorName, when, school?.name ?? 'your driving school'],
  });
}

// ---------- Daily digest (08:00 IST) ----------

const VEHICLE_FIELDS = [
  ['insuranceExpiry', 'Insurance'],
  ['pucExpiry', 'PUC'],
  ['fitnessExpiry', 'Fitness certificate'],
] as const;
/** Alert on these days-left values only, so admins aren't nagged every day. */
const EXPIRY_ALERT_DAYS = new Set([15, 7, 3, 1, 0]);

async function vehicleExpiries(today: string): Promise<void> {
  const start = Timestamp.fromMillis(istDayStart(today));
  const end = Timestamp.fromMillis(istDayStart(addDays(today, 16)));
  const bySchool = new Map<string, string[]>();
  for (const [field, label] of VEHICLE_FIELDS) {
    const snap = await db.collectionGroup('vehicles').where(field, '>=', start).where(field, '<', end).get();
    for (const doc of snap.docs) {
      const v = doc.data() as Vehicle;
      const expiry = v[field];
      if (!v.active || !expiry) continue;
      const left = daysBetween(today, istDate(expiry.toMillis()));
      if (!EXPIRY_ALERT_DAYS.has(left)) continue;
      const sid = schoolIdOf(doc.ref);
      const text = `${v.regNumber}: ${label} ${left === 0 ? 'expires today' : `expires in ${left} day(s)`}`;
      bySchool.set(sid, [...(bySchool.get(sid) ?? []), text]);
    }
  }
  for (const [sid, lines] of bySchool) {
    await notifySchoolAdmins(sid, { title: 'Vehicle documents expiring', body: lines.join('\n'), type: 'general', link: '/vehicles' });
  }
}

async function testDatesTomorrow(today: string): Promise<void> {
  const tomorrow = addDays(today, 1);
  const start = Timestamp.fromMillis(istDayStart(tomorrow));
  const end = Timestamp.fromMillis(istDayStart(addDays(tomorrow, 1)));
  for (const [field, label] of [['llTestDate', "Learner's licence test"], ['dlTestDate', 'Driving licence test']] as const) {
    const snap = await db.collectionGroup('students').where(field, '>=', start).where(field, '<', end).get();
    for (const doc of snap.docs) {
      const s = doc.data() as Student;
      if (s.status !== 'active') continue;
      const sid = schoolIdOf(doc.ref);
      const when = istLabel(s[field]?.toMillis() ?? start.toMillis());
      await notify(s.uid, { title: `${label} tomorrow`, body: `Your ${label.toLowerCase()} is on ${when}. All the best!`, type: 'test_date', link: '/progress' });
      await notifySchoolAdmins(sid, { title: `${label} tomorrow`, body: `${s.name} – ${when}`, type: 'test_date', link: `/students/${s.id}` });
    }
  }
}

async function followUpsToday(today: string): Promise<void> {
  const start = Timestamp.fromMillis(istDayStart(today));
  const end = Timestamp.fromMillis(istDayStart(addDays(today, 1)));
  const snap = await db.collectionGroup('enquiries').where('followUpAt', '>=', start).where('followUpAt', '<', end).get();
  const bySchool = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const e = doc.data() as EnquiryDoc;
    if (e.status === 'Enrolled' || e.status === 'Lost') continue;
    const sid = schoolIdOf(doc.ref);
    bySchool.set(sid, [...(bySchool.get(sid) ?? []), e.name]);
  }
  for (const [sid, names] of bySchool) {
    const body = names.length === 1 ? `Follow up with ${names[0]} today.` : `${names.length} follow-ups today: ${names.slice(0, 5).join(', ')}${names.length > 5 ? '…' : ''}`;
    await notifySchoolAdmins(sid, { title: 'Enquiry follow-ups', body, type: 'enquiry', link: '/enquiries' });
  }
}

async function subscriptionChecks(today: string, now: number): Promise<void> {
  const snap = await db.collection(COLLECTIONS.schools).where('subscription.status', 'in', ['trial', 'past_due']).get();
  for (const doc of snap.docs) {
    const school = doc.data() as School;
    const s = school.subscription;
    const trialEnd = s.trialEndsAt?.toMillis() ?? 0;
    try {
      if (s.status === 'trial') {
        if (trialEnd && daysBetween(today, istDate(trialEnd)) === 3) {
          await notify(school.ownerUid, {
            title: 'Your trial ends in 3 days',
            body: `Your Steerly trial ends on ${istDateLabel(trialEnd)}. Choose a plan to keep using Steerly without interruption.`,
            type: 'general',
            link: '/settings/billing',
          });
        } else if (trialEnd && trialEnd <= now) {
          await schoolRef(school.id).update({ 'subscription.status': 'past_due' });
          await notify(school.ownerUid, {
            title: 'Your trial has ended',
            body: 'Choose a plan within 7 days to keep your school active.',
            type: 'general',
            link: '/settings/billing',
          });
        }
      } else {
        const since = Math.max(trialEnd, s.currentPeriodEnd?.toMillis() ?? 0);
        if (since && since + 7 * DAY_MS < now) {
          await schoolRef(school.id).update({ 'subscription.status': 'suspended' });
          await notify(school.ownerUid, {
            title: 'School suspended',
            body: 'Your Steerly subscription is overdue, so your school has been suspended. Choose a plan to reactivate it.',
            type: 'general',
            link: '/settings/billing',
          });
        }
      }
    } catch (err) {
      logger.error('subscriptionChecks failed for school', { schoolId: school.id, err });
    }
  }
}

export const dailyDigest = onSchedule({ schedule: '0 8 * * *', timeZone: TIMEZONE, timeoutSeconds: 540 }, async () => {
  const now = Date.now();
  const today = istDate(now);
  const jobs: [string, () => Promise<void>][] = [
    ['vehicleExpiries', () => vehicleExpiries(today)],
    ['testDatesTomorrow', () => testDatesTomorrow(today)],
    ['followUpsToday', () => followUpsToday(today)],
    ['subscriptionChecks', () => subscriptionChecks(today, now)],
  ];
  for (const [name, job] of jobs) {
    try {
      await job();
    } catch (err) {
      logger.error(`dailyDigest: ${name} failed`, err);
    }
  }
});
