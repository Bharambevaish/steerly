import { Timestamp, type WriteBatch } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  bookSlotSchema,
  cancelBookingSchema,
  completeBookingSchema,
  generateSlotsSchema,
  rateBookingSchema,
  type Availability,
  type Booking,
  type BookSlotOutput,
  type GenerateSlotsOutput,
  type OkOutput,
  type Slot,
  type Student,
} from '@steerly/shared';
import { db } from './lib/admin';
import { as, assertSchoolUsable, getBooking, getMember, getSchool, getStudent, sub, subDoc } from './lib/data';
import { ADMIN, assertRole, callable, type Caller } from './lib/guard';
import { notify, notifySchoolAdmins } from './lib/notify';
import { buildSlots, slotId, slotRangeError } from './lib/slots';
import { canTeach } from './lib/teaching';
import { DAY_MS, HOUR_MS, istDate, istLabel } from './lib/time';

const isAdminCaller = (c: Caller) => c.isSuperAdmin || c.role === 'owner' || c.role === 'staff';
const BATCH_LIMIT = 500;

export const generateSlots = callable(generateSlotsSchema, async (data, request): Promise<GenerateSlotsOutput> => {
  const caller = assertRole(request, data.schoolId, [...ADMIN, 'instructor']);
  if (caller.role === 'instructor' && caller.uid !== data.instructorId) {
    throw new HttpsError('permission-denied', 'You can only generate your own slots.');
  }
  const rangeError = slotRangeError(data.from, data.to);
  if (rangeError) throw new HttpsError('invalid-argument', rangeError);

  const school = await getSchool(data.schoolId);
  assertSchoolUsable(school);
  const instructor = await getMember(data.schoolId, data.instructorId);
  if (!canTeach(instructor)) {
    throw new HttpsError('failed-precondition', 'Slots can only be generated for active instructors (or members who also teach).');
  }
  const availability = as<Availability>(await subDoc(data.schoolId, 'availability', data.instructorId).get());
  if (!availability) throw new HttpsError('failed-precondition', 'Set weekly availability for this instructor first.');

  const { slots, past } = buildSlots({
    weekly: availability.weekly,
    from: data.from,
    to: data.to,
    lessonMinutes: school.settings.lessonMinutes,
    nowMs: Date.now(),
  });
  const refs = slots.map((s) => subDoc(data.schoolId, 'slots', slotId(data.instructorId, s.startMs)));
  const existing = new Set<string>();
  for (let i = 0; i < refs.length; i += 300) {
    const snaps = await db.getAll(...refs.slice(i, i + 300));
    snaps.filter((s) => s.exists).forEach((s) => existing.add(s.id));
  }

  let created = 0;
  let batch: WriteBatch = db.batch();
  let inBatch = 0;
  for (let i = 0; i < slots.length; i++) {
    if (existing.has(refs[i].id)) continue;
    const slot: Slot = {
      id: refs[i].id,
      instructorId: data.instructorId,
      instructorName: instructor.name,
      vehicleId: availability.vehicleId,
      start: Timestamp.fromMillis(slots[i].startMs),
      end: Timestamp.fromMillis(slots[i].endMs),
      status: 'open',
      bookingId: null,
    };
    batch.create(refs[i], slot);
    created++;
    if (++inBatch === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();
  return { created, skipped: existing.size + past };
});

export const bookSlot = callable(bookSlotSchema, async (data, request): Promise<BookSlotOutput> => {
  const caller = assertRole(request, data.schoolId, [...ADMIN, 'student']);
  const isStudent = caller.role === 'student';
  const studentId = isStudent ? caller.claims.studentId : data.studentId;
  if (!studentId) throw new HttpsError('invalid-argument', 'Please choose a student.');

  const bookingRef = sub(data.schoolId, 'bookings').doc();
  const slotRef = subDoc(data.schoolId, 'slots', data.slotId);
  const booking = await db.runTransaction(async (tx) => {
    const school = await getSchool(data.schoolId, tx);
    assertSchoolUsable(school);
    const slot = as<Slot>(await tx.get(slotRef));
    if (!slot) throw new HttpsError('not-found', 'This slot no longer exists.');
    const student = await getStudent(data.schoolId, studentId, tx);
    const existing = await tx.get(sub(data.schoolId, 'bookings').where('studentId', '==', studentId));

    const now = Date.now();
    const startMs = slot.start.toMillis();
    if (slot.status !== 'open') throw new HttpsError('failed-precondition', 'Sorry, this slot was just taken. Please pick another.');
    if (startMs <= now) throw new HttpsError('failed-precondition', 'This slot has already started.');
    if (startMs > now + school.settings.bookingWindowDays * DAY_MS) {
      throw new HttpsError('failed-precondition', `You can book up to ${school.settings.bookingWindowDays} days ahead.`);
    }
    if (student.status !== 'active') throw new HttpsError('failed-precondition', 'Only active students can book lessons.');

    const bookings = existing.docs.map((d) => d.data() as Booking);
    const upcoming = bookings.filter((b) => b.status === 'booked' && b.start.toMillis() > now).length;
    if (student.sessionsCompleted + upcoming >= student.sessionsTotal) {
      throw new HttpsError(
        'failed-precondition',
        student.sessionsTotal === 0 ? 'Please enrol in a course before booking lessons.' : 'All sessions in this course are already booked.',
      );
    }
    const day = istDate(startMs);
    const sameDay = bookings.filter((b) => (b.status === 'booked' || b.status === 'completed') && istDate(b.start.toMillis()) === day);
    if (sameDay.length >= school.settings.maxBookingsPerDay) {
      throw new HttpsError('failed-precondition', `You can book at most ${school.settings.maxBookingsPerDay} lesson(s) per day.`);
    }

    const created: Booking = {
      id: bookingRef.id,
      slotId: slot.id,
      studentId,
      studentName: student.name,
      studentPhone: student.phone,
      instructorId: slot.instructorId,
      instructorName: slot.instructorName,
      vehicleId: slot.vehicleId,
      start: slot.start,
      end: slot.end,
      status: 'booked',
      cancelledBy: null,
      cancelReason: null,
      skillsCovered: [],
      instructorNotes: '',
      rating: null,
      feedback: null,
      reminderSent: false,
      createdAt: Timestamp.fromMillis(now),
    };
    tx.create(bookingRef, created);
    tx.update(slotRef, { status: 'booked', bookingId: bookingRef.id });
    return created;
  });

  await notify(booking.instructorId, {
    title: 'New lesson booked',
    body: `${booking.studentName} – ${istLabel(booking.start.toMillis())}`,
    type: 'booking',
    link: `/bookings/${booking.id}`,
  });
  return { bookingId: booking.id };
});

export const cancelBooking = callable(cancelBookingSchema, async (data, request): Promise<OkOutput> => {
  const caller = assertRole(request, data.schoolId, [...ADMIN, 'instructor', 'student']);
  const bookingRef = subDoc(data.schoolId, 'bookings', data.bookingId);

  const { booking, student } = await db.runTransaction(async (tx) => {
    const school = await getSchool(data.schoolId, tx);
    const b = await getBooking(data.schoolId, data.bookingId, tx);
    const slotRef = subDoc(data.schoolId, 'slots', b.slotId);
    const slot = as<Slot>(await tx.get(slotRef));
    const s = as<Student>(await tx.get(subDoc(data.schoolId, 'students', b.studentId)));

    if (caller.role === 'student' && b.studentId !== caller.claims.studentId) throw new HttpsError('permission-denied', 'This is not your booking.');
    if (caller.role === 'instructor' && b.instructorId !== caller.uid) throw new HttpsError('permission-denied', 'This is not your lesson.');
    if (b.status !== 'booked') throw new HttpsError('failed-precondition', 'Only upcoming lessons can be cancelled.');
    if (caller.role === 'student') {
      const cutoff = b.start.toMillis() - school.settings.cancelBeforeHours * HOUR_MS;
      if (Date.now() > cutoff) {
        throw new HttpsError(
          'failed-precondition',
          `Lessons can be cancelled up to ${school.settings.cancelBeforeHours} hours before they start. Please call the school.`,
        );
      }
    }
    tx.update(bookingRef, { status: 'cancelled', cancelledBy: caller.uid, cancelReason: data.reason || null });
    if (slot && slot.bookingId === b.id) tx.update(slotRef, { status: 'open', bookingId: null });
    return { booking: b, student: s };
  });

  const when = istLabel(booking.start.toMillis());
  const body = `Lesson on ${when} was cancelled${data.reason ? `: ${data.reason}` : '.'}`;
  const payload = { title: 'Lesson cancelled', body, type: 'booking' as const, link: `/bookings/${booking.id}` };
  if (caller.role === 'student') {
    await notify(booking.instructorId, { ...payload, body: `${booking.studentName}'s lesson on ${when} was cancelled.` });
  } else {
    const others = [student?.uid, booking.instructorId].filter((u) => u && u !== caller.uid);
    await notify(others, payload);
  }
  return { ok: true };
});

export const completeBooking = callable(completeBookingSchema, async (data, request): Promise<OkOutput> => {
  const caller = assertRole(request, data.schoolId, [...ADMIN, 'instructor']);
  const bookingRef = subDoc(data.schoolId, 'bookings', data.bookingId);

  const { booking, student, courseDone } = await db.runTransaction(async (tx) => {
    const b = await getBooking(data.schoolId, data.bookingId, tx);
    const studentRef = subDoc(data.schoolId, 'students', b.studentId);
    const s = await getStudent(data.schoolId, b.studentId, tx);
    if (!isAdminCaller(caller) && b.instructorId !== caller.uid) throw new HttpsError('permission-denied', 'This is not your lesson.');
    if (b.status !== 'booked') throw new HttpsError('failed-precondition', 'This lesson has already been closed.');
    if (b.start.toMillis() > Date.now()) throw new HttpsError('failed-precondition', "You can't complete a lesson before it starts.");

    const present = data.attendance === 'present';
    tx.update(bookingRef, {
      status: present ? 'completed' : 'no_show',
      skillsCovered: present ? data.skillsCovered : [],
      instructorNotes: data.notes,
    });
    let done = false;
    if (present) {
      const sessionsCompleted = s.sessionsCompleted + 1;
      done = s.sessionsTotal > 0 && sessionsCompleted >= s.sessionsTotal && s.status === 'active';
      tx.update(studentRef, {
        skills: { ...s.skills, ...data.skillLevels },
        sessionsCompleted,
        ...(done ? { status: 'completed' } : {}),
      });
    }
    return { booking: b, student: s, courseDone: done };
  });

  if (data.attendance === 'present') {
    await notify(student.uid, {
      title: courseDone ? 'Course complete!' : 'How was your lesson?',
      body: courseDone
        ? `Congratulations ${student.name}, you've finished all your sessions. Rate your last lesson with ${booking.instructorName}.`
        : `Rate your lesson with ${booking.instructorName}.`,
      type: 'booking',
      link: `/bookings/${booking.id}`,
    });
    if (courseDone) {
      await notifySchoolAdmins(data.schoolId, {
        title: 'Course completed',
        body: `${student.name} has completed ${student.courseName}.`,
        type: 'general',
        link: `/students/${student.id}`,
      });
    }
  } else {
    await notify(student.uid, {
      title: 'Missed lesson',
      body: `You were marked absent for your lesson on ${istLabel(booking.start.toMillis())}.`,
      type: 'booking',
      link: `/bookings/${booking.id}`,
    });
  }
  return { ok: true };
});

export const rateBooking = callable(rateBookingSchema, async (data, request): Promise<OkOutput> => {
  const caller = assertRole(request, data.schoolId, ['student']);
  const bookingRef = subDoc(data.schoolId, 'bookings', data.bookingId);
  await db.runTransaction(async (tx) => {
    const b = await getBooking(data.schoolId, data.bookingId, tx);
    if (b.studentId !== caller.claims.studentId) throw new HttpsError('permission-denied', 'This is not your booking.');
    if (b.status !== 'completed') throw new HttpsError('failed-precondition', 'You can rate a lesson once it is completed.');
    if (b.rating !== null) throw new HttpsError('already-exists', 'You have already rated this lesson.');
    tx.update(bookingRef, { rating: data.rating, feedback: data.feedback || null });
  });
  return { ok: true };
});
