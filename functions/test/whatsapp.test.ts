import { describe, expect, it } from 'vitest';
import { buildAiSensyPayload } from '../src/lib/whatsappPayload';

const msg = { phone10: '9876543210', campaign: 'lesson_reminder', userName: 'Asha', params: ['Asha', 'Ravi', '10:00 AM, Mon 19 Oct', 'Prince Driving School'] };

describe('buildAiSensyPayload', () => {
  it('builds the AiSensy campaign body with a 91-prefixed destination', () => {
    expect(buildAiSensyPayload('key', msg)).toEqual({
      apiKey: 'key',
      campaignName: 'lesson_reminder',
      destination: '919876543210',
      userName: 'Asha',
      templateParams: ['Asha', 'Ravi', '10:00 AM, Mon 19 Oct', 'Prince Driving School'],
    });
  });

  it('normalises phones and stringifies/cleans params', () => {
    const p = buildAiSensyPayload('key', { ...msg, phone10: '+91 98765 43210', userName: ' ', params: [550, 'a\nb', ''] });
    expect(p?.destination).toBe('919876543210');
    expect(p?.userName).toBe('Student');
    expect(p?.templateParams).toEqual(['550', 'a b', '-']);
  });

  it('returns null without a key, a campaign or a valid phone', () => {
    expect(buildAiSensyPayload('', msg)).toBeNull();
    expect(buildAiSensyPayload('key', { ...msg, campaign: '' })).toBeNull();
    expect(buildAiSensyPayload('key', { ...msg, phone10: '12345' })).toBeNull();
  });
});
