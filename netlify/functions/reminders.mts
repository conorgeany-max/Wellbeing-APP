import type { Config } from '@netlify/functions';
import webpush from 'web-push';
import { pushStore, syncStore, SNAPSHOT_KEY, type PushRecord, type Snapshot } from '../lib/store.mts';

/** Local date and time for a timezone, e.g. { date: '2026-10-26', time: '21:05' }. */
function localNow(timezone: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// Runs every 15 minutes (UTC). Each device's reminder time is stored in its own
// timezone, so the check is done in local time: send once per local day, after
// the chosen time, and only if there's no check-in for that day yet.
export default async () => {
  const publicKey = Netlify.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Netlify.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(Netlify.env.get('VAPID_SUBJECT') || 'mailto:steady@example.com', publicKey, privateKey);

  const store = pushStore();
  const snapshot = (await syncStore().get(SNAPSHOT_KEY, { type: 'json' })) as Snapshot | null;
  const { blobs } = await store.list();

  for (const { key } of blobs) {
    const rec = (await store.get(key, { type: 'json' })) as PushRecord | null;
    if (!rec) continue;
    const { date, time } = localNow(rec.timezone);
    if (time < rec.time || rec.lastSent === date || snapshot?.lastCheckIn === date) continue;
    try {
      await webpush.sendNotification(
        rec.subscription,
        JSON.stringify({ title: 'Steady', body: 'A few quiet minutes for your check-in?', url: './#/checkin' }),
        { TTL: 60 * 60 * 3 },
      );
      await store.setJSON(key, { ...rec, lastSent: date });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await store.delete(key); // subscription expired
      else console.error('Reminder failed', status, err);
    }
  }
};

export const config: Config = { schedule: '*/15 * * * *' };
