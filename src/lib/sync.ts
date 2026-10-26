import { db } from '../db/db';
import { getSettings, setSetting, SYNCED_SETTINGS } from '../db/settings';
import { api, CloudError } from './cloud';

// Sync model: the cloud holds one snapshot of every record. Each sync pulls it,
// merges it with this device record by record (newest updatedAt wins,
// deletions included), applies the winners locally and pushes the merged
// snapshot back. Sample data never leaves the device.

const TABLES = ['entries', 'habits', 'habitLogs', 'quotes', 'strengths'] as const;
type TableName = (typeof TABLES)[number] | 'settings';

interface SyncRecord {
  t: TableName;
  id: string;
  u: number; // updatedAt
  d?: unknown; // the record; absent when deleted
  x?: true; // deleted
}

interface Snapshot {
  version: 1;
  updatedAt: number;
  lastCheckIn: string | null;
  records: Record<string, SyncRecord>;
}

async function localRecords(): Promise<Map<string, SyncRecord>> {
  const out = new Map<string, SyncRecord>();
  for (const t of TABLES) {
    const rows = (await db.table(t).toArray()) as { id: string; updatedAt?: number; sample?: boolean }[];
    for (const r of rows) if (!r.sample) out.set(`${t}:${r.id}`, { t, id: r.id, u: r.updatedAt ?? 0, d: r });
  }
  for (const s of await db.settings.bulkGet(SYNCED_SETTINGS as string[])) {
    if (s?.updatedAt) out.set(`settings:${s.key}`, { t: 'settings', id: s.key, u: s.updatedAt, d: s });
  }
  for (const tomb of await db.tombstones.toArray()) {
    const current = out.get(tomb.key);
    if (!current || current.u < tomb.updatedAt) out.set(tomb.key, { t: tomb.table as TableName, id: tomb.id, u: tomb.updatedAt, x: true });
  }
  return out;
}

/** One check-in per day: if two devices each wrote one for the same date, keep the newer. */
function resolveEntryDates(records: Map<string, SyncRecord>) {
  const byDate = new Map<string, SyncRecord>();
  for (const r of records.values()) {
    if (r.t !== 'entries' || r.x) continue;
    const date = (r.d as { date: string }).date;
    const other = byDate.get(date);
    if (!other) { byDate.set(date, r); continue; }
    const [keep, drop] = other.u >= r.u ? [other, r] : [r, other];
    byDate.set(date, keep);
    records.set(`entries:${drop.id}`, { t: 'entries', id: drop.id, u: keep.u, x: true });
  }
}

async function applyLocally(merged: Map<string, SyncRecord>, local: Map<string, SyncRecord>) {
  const changes = [...merged.entries()].filter(([k, r]) => {
    const l = local.get(k);
    return !l || l.u !== r.u || !!l.x !== !!r.x;
  });
  if (!changes.length) return 0;
  await db.transaction('rw', [...TABLES.map((t) => db.table(t)), db.settings, db.tombstones], async () => {
    // Deletions first so a re-created entry can take over its date.
    for (const [key, r] of changes.filter(([, r]) => r.x)) {
      if (r.t === 'settings') continue;
      await db.table(r.t).delete(r.id);
      await db.tombstones.put({ key, table: r.t, id: r.id, updatedAt: r.u });
    }
    for (const [key, r] of changes.filter(([, r]) => !r.x)) {
      if (r.t === 'entries') {
        // Replace any sample or older entry holding the same date.
        const date = (r.d as { date: string }).date;
        await db.entries.where('date').equals(date).and((e) => e.id !== r.id).delete();
      }
      await db.table(r.t).put(r.d);
      await db.tombstones.delete(key);
    }
  });
  return changes.length;
}

let running: Promise<SyncResult> | null = null;

export interface SyncResult {
  pulled: number;
  at: number;
}

/** Sync with the cloud copy. Safe to call often; concurrent calls share one run. */
export function syncNow(): Promise<SyncResult> {
  running ??= doSync().finally(() => { running = null; });
  return running;
}

async function doSync(attempt = 0): Promise<SyncResult> {
  const { snapshot, etag } = await api<{ snapshot: Snapshot | null; etag: string | null }>('sync');
  const local = await localRecords();
  const merged = new Map(local);
  for (const [key, remote] of Object.entries(snapshot?.records ?? {})) {
    const mine = merged.get(key);
    if (!mine || remote.u > mine.u) merged.set(key, remote);
  }
  resolveEntryDates(merged);
  suppress = true;
  let pulled: number;
  try {
    pulled = await applyLocally(merged, local);
  } finally {
    suppress = false;
  }

  const dates = [...merged.values()].filter((r) => r.t === 'entries' && !r.x).map((r) => (r.d as { date: string }).date).sort();
  const next: Snapshot = { version: 1, updatedAt: Date.now(), lastCheckIn: dates[dates.length - 1] ?? null, records: Object.fromEntries(merged) };
  try {
    await api('sync', { method: 'PUT', body: JSON.stringify(next), headers: etag ? { 'if-match': etag } : { 'x-sync-mode': snapshot ? 'overwrite' : 'new' } });
  } catch (err) {
    // Another device synced in between: start again from its snapshot.
    if (err instanceof CloudError && err.status === 412 && attempt < 2) return doSync(attempt + 1);
    throw err;
  }
  const at = Date.now();
  await setSetting('lastSync', at);
  return { pulled, at };
}

/** Delete the cloud copy (used by "Delete all data"). */
export const deleteCloudCopy = () => api('sync', { method: 'DELETE' });

/** True when this device has an access code and should sync in the background. */
export async function canSync() {
  const s = await getSettings();
  return Boolean(s.accessCode);
}

// ---------- Background sync ----------

let suppress = false; // true while a sync writes, so its own writes don't schedule another
let timer: number | undefined;

/** Schedule a sync shortly after local edits stop. */
export function scheduleSync(delay = 4000) {
  if (suppress) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void canSync().then((ok) => { if (ok) syncNow().catch(() => undefined); });
  }, delay);
}

let hooked = false;
/** Watch the synced tables and sync after any local change. */
export function watchLocalChanges() {
  if (hooked) return;
  hooked = true;
  for (const t of [...TABLES, 'tombstones']) {
    const table = db.table(t);
    table.hook('creating', () => scheduleSync());
    table.hook('updating', () => { scheduleSync(); });
    table.hook('deleting', () => scheduleSync());
  }
}
