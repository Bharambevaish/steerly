import { securityEvent } from './lib/securityLog';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import {
  setSchoolStatusSchema,
  startSubscriptionSchema,
  type OkOutput,
  type PlanId,
  type StartSubscriptionOutput,
} from '@steerly/shared';
import { getSchool, schoolRef } from './lib/data';
import { assertRole, callable, OWNER, requireAuth } from './lib/guard';
import { RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_PRO, RAZORPAY_PLAN_STARTER, RAZORPAY_PLAN_WHITELABEL } from './lib/params';
import { razorpay, razorpayErrorMessage } from './lib/razorpay';

const PLAN_PARAM = { starter: RAZORPAY_PLAN_STARTER, pro: RAZORPAY_PLAN_PRO, whitelabel: RAZORPAY_PLAN_WHITELABEL } as const;
/** Monthly billing cycles before the subscription ends (10 years). */
const TOTAL_CYCLES = 120;

export const startSubscription = callable(
  startSubscriptionSchema,
  async (data, request): Promise<StartSubscriptionOutput> => {
    assertRole(request, data.schoolId, OWNER);
    const school = await getSchool(data.schoolId);
    if (school.subscription.status === 'active' && school.subscription.plan === data.plan) {
      throw new HttpsError('failed-precondition', 'You are already subscribed to this plan.');
    }
    const planId = PLAN_PARAM[data.plan as PlanId].value();
    if (!planId) throw new HttpsError('failed-precondition', 'This plan is not available yet. Please contact Steerly support.');
    try {
      const subscription = await razorpay().subscriptions.create({
        plan_id: planId,
        total_count: TOTAL_CYCLES,
        customer_notify: 1,
        notes: { schoolId: data.schoolId, plan: data.plan },
      });
      if (!subscription.short_url) throw new Error('Razorpay returned no short_url');
      await schoolRef(data.schoolId).update({ 'subscription.razorpaySubscriptionId': subscription.id });
      return { url: subscription.short_url };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('Razorpay subscriptions.create failed', { message: razorpayErrorMessage(err) });
      throw new HttpsError('unavailable', "We couldn't start the subscription. Please try again.");
    }
  },
  { secrets: [RAZORPAY_KEY_SECRET] },
);

export const setSchoolStatus = callable(setSchoolStatusSchema, async (data, request): Promise<OkOutput> => {
  const caller = requireAuth(request);
  if (!caller.isSuperAdmin) throw new HttpsError('permission-denied', 'Only Steerly administrators can change a school status.');
  await getSchool(data.schoolId);
  await schoolRef(data.schoolId).update({ 'subscription.status': data.status });
  securityEvent('school_status_changed', { schoolId: data.schoolId, by: caller.uid, status: data.status });
  return { ok: true };
});
