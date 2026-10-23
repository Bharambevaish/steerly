import { logger } from 'firebase-functions/v2';
import { AISENSY_API_KEY, WHATSAPP_ENABLED } from './params';
import { AISENSY_URL, buildAiSensyPayload, type WhatsAppMessage } from './whatsappPayload';

/** Sends a WhatsApp template message via AiSensy. No-op unless WHATSAPP_ENABLED=true. Never throws. */
export async function sendWhatsApp(msg: WhatsAppMessage): Promise<void> {
  try {
    if (WHATSAPP_ENABLED.value() !== 'true') return;
    const payload = buildAiSensyPayload(AISENSY_API_KEY.value(), msg);
    if (!payload) {
      logger.warn('WhatsApp skipped: missing key/campaign or invalid phone', { campaign: msg.campaign });
      return;
    }
    const res = await fetch(AISENSY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) logger.warn('WhatsApp send failed', { status: res.status, campaign: msg.campaign, body: await res.text().catch(() => '') });
  } catch (err) {
    logger.warn('WhatsApp send error', err);
  }
}
