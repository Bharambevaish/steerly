import { logger } from 'firebase-functions/v2';

/** Security-relevant events, written as structured `security_event` logs for Cloud Logging alerts. */
export type SecurityEvent =
  | 'otp_wrong'
  | 'otp_locked'
  | 'otp_rate_limited_phone'
  | 'otp_rate_limited_ip'
  | 'otp_daily_cap_reached'
  | 'otp_dev_mode_ignored'
  | 'permission_denied'
  | 'claims_changed'
  | 'member_invited'
  | 'member_updated'
  | 'school_status_changed'
  | 'account_deleted'
  | 'webhook_bad_signature';

/** "+919876543210" / "9876543210" → "******3210". Never log full phone numbers. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `******${digits.slice(-4)}` : '****';
}

export function securityEvent(event: SecurityEvent, data: Record<string, unknown> = {}): void {
  const severityWarn: SecurityEvent[] = ['otp_locked', 'otp_rate_limited_ip', 'otp_daily_cap_reached', 'otp_dev_mode_ignored', 'webhook_bad_signature'];
  const entry = { security_event: event, ...data };
  if (severityWarn.includes(event)) logger.warn(`security: ${event}`, entry);
  else logger.info(`security: ${event}`, entry);
}
