import type { Habit, HabitLog, ISODate } from '../db/types';
import { addDays, lastNDays, today, weekStart } from './date';

export type DoneIndex = Map<string, Set<ISODate>>; // habitId -> dates done

export function indexLogs(logs: HabitLog[]): DoneIndex {
  const idx: DoneIndex = new Map();
  for (const l of logs) {
    if (!l.done) continue;
    if (!idx.has(l.habitId)) idx.set(l.habitId, new Set());
    idx.get(l.habitId)!.add(l.date);
  }
  return idx;
}

function weekCount(done: Set<ISODate>, start: ISODate): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (done.has(addDays(start, i))) n++;
  return n;
}

export interface HabitStats {
  current: number; // days (daily) or weeks (weekly)
  best: number;
  unit: 'day' | 'week';
  consistency: number; // 0-1 over the last 30 days
  doneLast30: number;
  thisWeek: number; // completions this week
}

export function habitStats(habit: Habit, done: Set<ISODate> = new Set(), end: ISODate = today()): HabitStats {
  const last30 = lastNDays(30, end);
  const doneLast30 = last30.filter((d) => done.has(d)).length;
  const thisWeek = weekCount(done, weekStart(end));
  const sorted = [...done].sort();

  if (habit.frequency.type === 'daily') {
    // Current streak forgives "not yet today".
    let cur = 0;
    let d = done.has(end) ? end : addDays(end, -1);
    while (done.has(d)) { cur++; d = addDays(d, -1); }
    let best = 0, run = 0, prev: ISODate | null = null;
    for (const s of sorted) {
      run = prev && addDays(prev, 1) === s ? run + 1 : 1;
      best = Math.max(best, run);
      prev = s;
    }
    return { current: cur, best, unit: 'day', consistency: doneLast30 / 30, doneLast30, thisWeek };
  }

  const times = habit.frequency.times;
  const met = (ws: ISODate) => weekCount(done, ws) >= times;
  let cur = 0;
  let ws = weekStart(end);
  if (!met(ws)) ws = addDays(ws, -7); // this week is still in progress
  while (met(ws)) { cur++; ws = addDays(ws, -7); }
  let best = 0;
  if (sorted.length) {
    let run = 0;
    for (let w = weekStart(sorted[0]); w <= weekStart(end); w = addDays(w, 7)) {
      run = met(w) ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  const expected = (times * 30) / 7;
  return { current: cur, best, unit: 'week', consistency: Math.min(1, doneLast30 / expected), doneLast30, thisWeek };
}

export function frequencyLabel(h: Habit): string {
  return h.frequency.type === 'daily' ? 'Daily' : `${h.frequency.times}× a week`;
}
