import type { Entry, Habit, HabitLog, ISODate } from '../db/types';
import { addDays, daysBetween, formatShort } from './date';

export interface Memory {
  kind: 'lifted' | 'onThisDay' | 'goodDay';
  eyebrow: string;
  title: string;
  entry: Entry; // the entry whose words we show
  habitsDone: Habit[]; // what you did that day
}

const LOW = 2;
const GOOD = 4;
const MIN_AGE = 7; // don't resurface last few days: you still remember them

/** First sentence-ish of an entry, for a short preview. */
export function snippet(e: Entry, max = 160): string {
  const text = (e.text || e.reflection).trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max)}…`;
}

const hasWords = (e: Entry) => (e.text || e.reflection).trim().length > 0;

// Deterministic per day, so the card doesn't change every time you open the app.
function dayHash(date: ISODate): number {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const ON_THIS_DAY: [number, string][] = [
  [365, 'A year ago today'],
  [182, 'Six months ago'],
  [91, 'Three months ago'],
  [28, 'Four weeks ago'],
];

/**
 * Pick one past entry worth seeing again today.
 * - After a low check-in: a time you felt like this before, and what you wrote once it lifted.
 * - Otherwise: an entry from this day weeks, months or a year ago.
 * - Otherwise: one of your good days, so what helped stays in mind.
 */
export function pickMemory(entries: Entry[], habits: Habit[], logs: HabitLog[], date: ISODate): Memory | null {
  const past = entries.filter((e) => daysBetween(e.date, date) >= MIN_AGE);
  if (!past.length) return null;
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const habitsOn = (d: ISODate) => {
    const ids = new Set(logs.filter((l) => l.date === d && l.done).map((l) => l.habitId));
    return habits.filter((h) => ids.has(h.id) && !h.archived).slice(0, 4);
  };
  const todayEntry = byDate.get(date);

  if (todayEntry && todayEntry.mood <= LOW) {
    // Most recent low day that was followed by a good one within five days
    const lows = past.filter((e) => e.mood <= LOW).sort((a, b) => b.date.localeCompare(a.date));
    for (const low of lows) {
      for (let i = 1; i <= 5; i++) {
        const later = byDate.get(addDays(low.date, i));
        if (later && later.mood >= GOOD && hasWords(later) && daysBetween(later.date, date) > 0) {
          return {
            kind: 'lifted',
            eyebrow: `You've been here before · ${formatShort(low.date)}`,
            title: `You felt like this on ${formatShort(low.date)}. ${i === 1 ? 'The next day' : `${i} days later`} you wrote:`,
            entry: later,
            habitsDone: habitsOn(later.date),
          };
        }
      }
    }
  }

  for (const [ago, label] of ON_THIS_DAY) {
    const e = byDate.get(addDays(date, -ago));
    if (e && hasWords(e)) return { kind: 'onThisDay', eyebrow: label, title: `On ${formatShort(e.date)} you wrote:`, entry: e, habitsDone: habitsOn(e.date) };
  }

  const good = past.filter((e) => e.mood >= GOOD && hasWords(e));
  if (!good.length) return null;
  const e = good[dayHash(date) % good.length];
  return {
    kind: 'goodDay',
    eyebrow: 'A good day to remember',
    title: `${formatShort(e.date)} was a good day. You wrote:`,
    entry: e,
    habitsDone: habitsOn(e.date),
  };
}
