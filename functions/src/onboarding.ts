import { maskPhone, securityEvent } from './lib/securityLog';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  COLLECTIONS,
  createSchoolSchema,
  DEFAULT_SCHOOL_SETTINGS,
  fromE164,
  inviteMemberSchema,
  joinSchoolSchema,
  toE164,
  TRIAL_DAYS,
  updateMemberSchema,
  type Course,
  type CreateSchoolOutput,
  type Invite,
  type JoinSchoolOutput,
  type Member,
  type OkOutput,
  type School,
  type SchoolCodeDoc,
  type SchoolSlugDoc,
  type UserDoc,
} from '@steerly/shared';
import { auth, db } from './lib/admin';
import { setClaims } from './lib/claims';
import { generateCode, receiptPrefixFromName, slugCandidates } from './lib/codes';
import { as, assertSchoolUsable, getSchool, schoolRef, sub, subDoc, userRef } from './lib/data';
import { ADMIN, assertRole, callable, OWNER, requireAuth } from './lib/guard';
import { buildStudent, findStudentByPhone } from './lib/studentRecord';
import { DAY_MS } from './lib/time';

const codeRef = (code: string) => db.collection(COLLECTIONS.schoolCodes).doc(code);
const slugRef = (slug: string) => db.collection(COLLECTIONS.schoolSlugs).doc(slug);

const DEFAULT_COURSES: Omit<Course, 'id'>[] = [
  {
    name: 'Beginner Car Driving (Manual)',
    description: 'Learn to drive a manual car from scratch: controls, clutch, traffic, parking and the RTO test.',
    vehicleType: 'car_manual',
    sessions: 15,
    sessionMinutes: 60,
    price: 550000,
    active: true,
    order: 1,
  },
  {
    name: 'Beginner Car Driving (Automatic)',
    description: 'Learn to drive an automatic car with confidence in city traffic.',
    vehicleType: 'car_auto',
    sessions: 15,
    sessionMinutes: 60,
    price: 650000,
    active: true,
    order: 2,
  },
  {
    name: 'Two-wheeler Training',
    description: 'Balance, gears, traffic rules and test preparation for scooters and motorcycles.',
    vehicleType: 'two_wheeler',
    sessions: 10,
    sessionMinutes: 60,
    price: 250000,
    active: true,
    order: 3,
  },
];

export const createSchool = callable(createSchoolSchema, async (data, request): Promise<CreateSchoolOutput> => {
  const caller = requireAuth(request);
  if (caller.claims.schoolId && !caller.isSuperAdmin) {
    throw new HttpsError('failed-precondition', 'You already belong to a school.');
  }
  const ref = db.collection(COLLECTIONS.schools).doc();
  const schoolId = ref.id;
  const now = Date.now();

  const code = await db.runTransaction(async (tx) => {
    const userDoc = as<UserDoc>(await tx.get(userRef(caller.uid)));
    let slug: string | null = null;
    for (const candidate of slugCandidates(data.name, data.city)) {
      if (!(await tx.get(slugRef(candidate))).exists) {
        slug = candidate;
        break;
      }
    }
    let joinCode: string | null = null;
    for (let i = 0; i < 8 && !joinCode; i++) {
      const candidate = generateCode(6);
      if (!(await tx.get(codeRef(candidate))).exists) joinCode = candidate;
    }
    if (!slug || !joinCode) throw new HttpsError('aborted', 'Please try again.');

    const school: School = {
      id: schoolId,
      name: data.name,
      slug,
      code: joinCode,
      logoUrl: null,
      brandColor: '#F59E0B',
      phone: data.phone,
      email: caller.email,
      address: data.address,
      city: data.city,
      ownerUid: caller.uid,
      settings: { ...DEFAULT_SCHOOL_SETTINGS, receiptPrefix: receiptPrefixFromName(data.name) },
      subscription: {
        plan: 'starter',
        status: 'trial',
        trialEndsAt: Timestamp.fromMillis(now + TRIAL_DAYS * DAY_MS),
        currentPeriodEnd: null,
        razorpaySubscriptionId: null,
      },
      createdAt: Timestamp.fromMillis(now),
    };
    const owner: Member = {
      uid: caller.uid,
      name: data.ownerName,
      phone: caller.phone ?? toE164(data.phone),
      email: caller.email,
      role: 'owner',
      active: true,
      createdAt: Timestamp.fromMillis(now),
    };
    const lookup: SchoolCodeDoc & SchoolSlugDoc = { schoolId, name: data.name };
    tx.create(ref, school);
    tx.create(slugRef(slug), lookup);
    tx.create(codeRef(joinCode), lookup);
    tx.set(subDoc(schoolId, 'members', caller.uid), owner);
    for (const course of DEFAULT_COURSES) {
      const c = sub(schoolId, 'courses').doc();
      tx.set(c, { ...course, id: c.id } satisfies Course);
    }
    if (userDoc) {
      tx.update(userRef(caller.uid), { name: userDoc.name || data.ownerName });
    } else {
      const fresh: UserDoc = {
        uid: caller.uid,
        name: data.ownerName,
        phone: caller.phone,
        email: caller.email,
        role: null,
        schoolId: null,
        studentId: null,
        expoPushToken: null,
        createdAt: Timestamp.fromMillis(now),
      };
      tx.set(userRef(caller.uid), fresh);
    }
    return joinCode;
  });

  if (!caller.isSuperAdmin) await setClaims(caller.uid, { role: 'owner', schoolId });
  return { schoolId, code };
});

export const joinSchool = callable(joinSchoolSchema, async (data, request): Promise<JoinSchoolOutput> => {
  const caller = requireAuth(request);
  if (caller.claims.schoolId || caller.role) throw new HttpsError('failed-precondition', 'You already belong to a school.');
  if (!caller.phone) throw new HttpsError('failed-precondition', 'Please sign in with your mobile number to join a school.');

  const lookup = as<SchoolCodeDoc>(await codeRef(data.code).get());
  if (!lookup) throw new HttpsError('not-found', 'No school found with that code. Please check and try again.');
  const schoolId = lookup.schoolId;
  assertSchoolUsable(await getSchool(schoolId));

  const phone = fromE164(caller.phone);
  const existing = await findStudentByPhone(schoolId, phone);
  let studentId: string;
  if (existing) {
    if (existing.uid && existing.uid !== caller.uid) {
      throw new HttpsError('already-exists', 'A student with your number is already registered at this school. Please contact the school.');
    }
    studentId = existing.id;
    await subDoc(schoolId, 'students', studentId).update({ uid: caller.uid });
  } else {
    const ref = sub(schoolId, 'students').doc();
    studentId = ref.id;
    const student = buildStudent({
      id: studentId,
      name: data.name,
      phone,
      email: caller.email,
      course: null,
      instructor: null,
      branchId: null,
      uid: caller.uid,
    });
    await ref.set(student);
  }
  await userRef(caller.uid).set({ name: data.name }, { merge: true });
  await setClaims(caller.uid, { role: 'student', schoolId, studentId });
  return { schoolId, studentId };
});

export const inviteMember = callable(inviteMemberSchema, async (data, request): Promise<OkOutput> => {
  const caller = assertRole(request, data.schoolId, ADMIN);
  if (caller.role === 'staff' && data.role !== 'instructor') {
    throw new HttpsError('permission-denied', 'Staff can only invite instructors.');
  }
  assertSchoolUsable(await getSchool(data.schoolId));
  const e164 = toE164(data.phone);

  const userSnap = await db.collection(COLLECTIONS.users).where('phone', '==', e164).limit(1).get();
  const user = userSnap.empty ? null : (userSnap.docs[0].data() as UserDoc);
  if (user) {
    if (user.role === 'superAdmin') throw new HttpsError('failed-precondition', 'This number belongs to a Steerly administrator.');
    if (user.schoolId && user.schoolId !== data.schoolId) {
      throw new HttpsError('already-exists', 'This person already belongs to another school.');
    }
  }
  // Only someone already in THIS school (e.g. a deactivated member) is re-added instantly. Anyone else,
  // including an existing user with no school, gets an invite they accept by signing in (consent).
  if (user && user.schoolId === data.schoolId) {
    if (user.role === 'student') {
      throw new HttpsError('failed-precondition', 'This number is registered as a student. Use a different number for staff.');
    }
    const existing = as<Member>(await subDoc(data.schoolId, 'members', user.uid).get());
    if (existing?.active) throw new HttpsError('already-exists', `${existing.name} is already a member of this school.`);
    const member: Member = {
      uid: user.uid,
      name: data.name,
      phone: e164,
      email: user.email,
      role: data.role,
      active: true,
      createdAt: existing?.createdAt ?? Timestamp.now(),
    };
    await subDoc(data.schoolId, 'members', user.uid).set(member);
    await setClaims(user.uid, { role: data.role, schoolId: data.schoolId });
    securityEvent('member_invited', { schoolId: data.schoolId, by: caller.uid, uid: user.uid, role: data.role, mode: 'reactivated' });
    return { ok: true };
  }

  const invite: Invite = { phone: e164, name: data.name, role: data.role, invitedBy: caller.uid, createdAt: Timestamp.now() };
  await subDoc(data.schoolId, 'invites', e164).set(invite);
  securityEvent('member_invited', { schoolId: data.schoolId, by: caller.uid, phone: maskPhone(e164), role: data.role, mode: 'invite' });
  return { ok: true };
});

export const updateMember = callable(updateMemberSchema, async (data, request): Promise<OkOutput> => {
  const caller = assertRole(request, data.schoolId, OWNER);
  const ref = subDoc(data.schoolId, 'members', data.uid);
  const member = as<Member>(await ref.get());
  if (!member) throw new HttpsError('not-found', 'Member not found.');
  // Owners may step down to staff/instructor themselves (checked below: another active owner must remain),
  // but can't deactivate their own account.
  if (data.uid === caller.uid && data.active === false) {
    throw new HttpsError('failed-precondition', "You can't deactivate your own account. Ask another owner to do it.");
  }

  const role = data.role ?? member.role;
  const active = data.active ?? member.active;
  if (member.role === 'owner' && (role !== 'owner' || !active)) {
    const owners = await sub(data.schoolId, 'members').where('role', '==', 'owner').get();
    const activeOwners = owners.docs.map((d) => d.data() as Member).filter((m) => m.active && m.uid !== data.uid);
    if (activeOwners.length === 0) throw new HttpsError('failed-precondition', 'A school needs at least one active owner.');
    // Billing/trial notices go to school.ownerUid; hand it to a remaining owner.
    const school = await getSchool(data.schoolId);
    if (school.ownerUid === data.uid) await schoolRef(data.schoolId).update({ ownerUid: activeOwners[0].uid });
  }

  await ref.update({ role, active });
  if (active) {
    await setClaims(data.uid, { role, schoolId: data.schoolId });
  } else {
    await setClaims(data.uid, {});
    await auth.revokeRefreshTokens(data.uid);
  }
  securityEvent('member_updated', { schoolId: data.schoolId, by: caller.uid, uid: data.uid, role, active });
  return { ok: true };
});
