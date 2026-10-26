import { getStore } from '@netlify/blobs';

// Strong consistency so a sync never reads a stale snapshot.
export const syncStore = () => getStore({ name: 'steady-sync', consistency: 'strong' });
export const pushStore = () => getStore({ name: 'steady-push', consistency: 'strong' });

export const SNAPSHOT_KEY = 'snapshot';

export interface Snapshot {
  version: 1;
  updatedAt: number;
  lastCheckIn: string | null; // most recent entry date, used by reminders
  records: Record<string, unknown>;
}

export interface PushRecord {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  time: string; // 'HH:MM' in the user's timezone
  timezone: string;
  lastSent: string | null; // local date of the last reminder
}
