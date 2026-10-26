import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Entry, Habit, HabitFrequency, HabitLog, Quote, Strength } from './types';
import { uid } from '../lib/id';
import { STRENGTHS } from '../data/strengths';
import { ensureSeeded, removeSampleData } from './seed';

// ---------- Live queries (React hooks) ----------
// Stable empty defaults: a fresh [] each render would retrigger effects that depend on these.
const NO_ENTRIES: Entry[] = [];
const NO_HABITS: Habit[] = [];
const NO_LOGS: HabitLog[] = [];
const NO_QUOTES: Quote[] = [];
const NO_STRENGTHS: Strength[] = [];

export const useEntries = () =>
  useLiveQuery(() => db.entries.orderBy('date').reverse().toArray(), [], NO_ENTRIES);

export const useEntry = (date: string) =>
  useLiveQuery(() => db.entries.where('date').equals(date).first(), [date]);

export const useHabits = (includeArchived = false) =>
  useLiveQuery(
    async () => {
      const all = await db.habits.orderBy('order').toArray();
      return includeArchived ? all : all.filter((h) => !h.archived);
    },
    [includeArchived],
    NO_HABITS,
  );

export const useHabitLogs = () => useLiveQuery(() => db.habitLogs.toArray(), [], NO_LOGS);

export const useQuotes = () => useLiveQuery(() => db.quotes.toArray(), [], NO_QUOTES);

export const useStrengths = () =>
  useLiveQuery(() => db.strengths.orderBy('rank').toArray(), [], NO_STRENGTHS);

// ---------- Entries ----------

export type EntryInput = Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'sample'>;

/** Create or update the single entry for a date. */
export async function saveEntry(input: EntryInput): Promise<Entry> {
  const existing = await db.entries.where('date').equals(input.date).first();
  const now = Date.now();
  const entry: Entry = {
    ...input,
    id: existing?.id ?? uid(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sample: false, // edited entries become real entries
  };
  await db.entries.put(entry);
  return entry;
}

export const updateEntry = (id: string, patch: Partial<Entry>) =>
  db.entries.update(id, { ...patch, updatedAt: Date.now(), sample: false });

export const deleteEntry = (id: string) => db.entries.delete(id);

// ---------- Habits ----------

export async function createHabit(data: { name: string; icon: string; frequency: HabitFrequency; strength?: string }) {
  const count = await db.habits.count();
  const now = Date.now();
  await db.habits.add({ id: uid(), ...data, archived: false, order: count, createdAt: now, updatedAt: now });
}

export const updateHabit = (id: string, patch: Partial<Habit>) =>
  db.habits.update(id, { ...patch, updatedAt: Date.now() });

export async function setHabitDone(habitId: string, date: string, done: boolean) {
  const id = `${habitId}:${date}`;
  if (done) await db.habitLogs.put({ id, habitId, date, done: true, updatedAt: Date.now() });
  else await db.habitLogs.delete(id);
}

export async function setHabitsForDate(date: string, doneIds: Set<string>, habits: Habit[]) {
  await db.transaction('rw', db.habitLogs, async () => {
    for (const h of habits) await setHabitDone(h.id, date, doneIds.has(h.id));
  });
}

// ---------- Quotes ----------

export const toggleFavourite = (q: Quote) =>
  db.quotes.update(q.id, { favourite: !q.favourite, updatedAt: Date.now() });

export const addQuote = (text: string, author: string, strength?: string) =>
  db.quotes.add({ id: uid(), text, author: author || 'Me', strength, favourite: true, custom: true, updatedAt: Date.now() });

export const deleteQuote = (id: string) => db.quotes.delete(id);

// ---------- Strengths ----------

/** Persist a new ranking (array of strength ids, best first). */
export async function saveStrengthOrder(ids: string[]) {
  await db.transaction('rw', db.strengths, async () => {
    for (let i = 0; i < ids.length; i++) await db.strengths.update(ids[i], { rank: i + 1, updatedAt: Date.now() });
  });
}

export async function resetStrengthOrder() {
  await saveStrengthOrder(STRENGTHS.map((s) => s.id));
}

// ---------- Export / import / delete ----------

export interface ExportFile {
  app: 'steady';
  version: 1;
  exportedAt: string;
  entries: Entry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  quotes: Quote[];
  strengths: Strength[];
  settings: { key: string; value: unknown }[];
}

export async function exportAll(): Promise<ExportFile> {
  return {
    app: 'steady',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: await db.entries.toArray(),
    habits: await db.habits.toArray(),
    habitLogs: await db.habitLogs.toArray(),
    quotes: await db.quotes.toArray(),
    strengths: await db.strengths.toArray(),
    settings: await db.settings.toArray(),
  };
}

export async function importAll(data: ExportFile) {
  if (data?.app !== 'steady') throw new Error('This file does not look like a Steady export.');
  await db.transaction('rw', [db.entries, db.habits, db.habitLogs, db.quotes, db.strengths, db.settings], async () => {
    await Promise.all([db.entries.clear(), db.habits.clear(), db.habitLogs.clear(), db.quotes.clear(), db.strengths.clear(), db.settings.clear()]);
    await db.entries.bulkPut(data.entries ?? []);
    await db.habits.bulkPut(data.habits ?? []);
    await db.habitLogs.bulkPut(data.habitLogs ?? []);
    await db.quotes.bulkPut(data.quotes ?? []);
    await db.strengths.bulkPut(data.strengths ?? []);
    await db.settings.bulkPut(data.settings ?? []);
    await db.settings.put({ key: 'seeded', value: true });
  });
}

/** Wipe everything, then start fresh with starter content but no demo data. */
export async function deleteAllData() {
  await db.transaction('rw', [db.entries, db.habits, db.habitLogs, db.quotes, db.strengths, db.settings], async () => {
    await Promise.all([db.entries.clear(), db.habits.clear(), db.habitLogs.clear(), db.quotes.clear(), db.strengths.clear(), db.settings.clear()]);
  });
  await ensureSeeded();
  await removeSampleData();
  await db.settings.put({ key: 'sampleData', value: false });
}
