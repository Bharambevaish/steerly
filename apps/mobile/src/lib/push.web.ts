// Web build: no Expo push. Same exports as push.ts so callers don't need Platform checks.
export async function registerForPush(_uid: string): Promise<string | null> {
  return null;
}

export function linkFromNotification(_n: unknown): string | null {
  return null;
}

export function useTappedNotification(): { id: string; link: string | null } | null {
  return null;
}
