import type { ISODate } from '../db/types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const today = (): ISODate => toISO(new Date());

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

/** Inclusive list of dates ending at `end`. */
export function lastNDays(n: number, end: ISODate = today()): ISODate[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

/** Monday of the week containing the date. */
export function weekStart(s: ISODate): ISODate {
  const d = fromISO(s);
  const offset = (d.getDay() + 6) % 7;
  return addDays(s, -offset);
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatLong(s: ISODate): string {
  return fromISO(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShort(s: ISODate): string {
  return fromISO(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function dayOfYear(s: ISODate): number {
  const d = fromISO(s);
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
