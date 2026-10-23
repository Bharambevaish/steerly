// Pure AiSensy Campaign API payload builder (kept free of Firebase imports for unit tests).
export const AISENSY_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

export interface AiSensyPayload {
  apiKey: string;
  campaignName: string;
  destination: string; // 91XXXXXXXXXX
  userName: string;
  templateParams: string[];
}

export interface WhatsAppMessage {
  phone10: string;
  /** AiSensy campaign name (configured per template via params). */
  campaign: string;
  /** Recipient display name stored by AiSensy. */
  userName: string;
  /** Values for {{1}}, {{2}}, ... in template order. */
  params: (string | number)[];
}

/** Returns null when the message can't be sent (bad phone, no campaign, no key). */
export function buildAiSensyPayload(apiKey: string, msg: WhatsAppMessage): AiSensyPayload | null {
  const phone = msg.phone10.replace(/\D/g, '').slice(-10);
  if (!apiKey || !msg.campaign || !/^[6-9]\d{9}$/.test(phone)) return null;
  return {
    apiKey,
    campaignName: msg.campaign,
    destination: `91${phone}`,
    userName: msg.userName.trim() || 'Student',
    // WhatsApp template params may not contain newlines/tabs or 4+ consecutive spaces.
    templateParams: msg.params.map((p) => String(p).replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim() || '-'),
  };
}
