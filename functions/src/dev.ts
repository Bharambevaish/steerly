import { onRequest } from 'firebase-functions/v2/https';
import { AISENSY_API_KEY } from './lib/params';
import { runDailyDigest, runLessonReminders } from './triggers';

/**
 * Emulator-only HTTP hook to run a scheduled job on demand:
 *   GET /devRunScheduled?job=lessonReminders|dailyDigest&now=<epoch ms>
 * Only exported from index.ts when FUNCTIONS_EMULATOR === 'true', so it is never deployed.
 */
export function makeDevRunScheduled() {
  return onRequest({ secrets: [AISENSY_API_KEY] }, async (req, res) => {
    const job = String(req.query.job ?? '');
    const now = req.query.now === undefined ? Date.now() : Number(req.query.now);
    if (!Number.isFinite(now)) {
      res.status(400).json({ error: 'now must be epoch milliseconds' });
      return;
    }
    if (job === 'lessonReminders') {
      res.json({ job, now, result: await runLessonReminders(now) });
    } else if (job === 'dailyDigest') {
      res.json({ job, now, result: await runDailyDigest(now) });
    } else {
      res.status(400).json({ error: 'job must be lessonReminders or dailyDigest' });
    }
  });
}
