import type { ISODate, Quote, Strength } from '../db/types';
import type { StrengthOfWeek } from '../db/settings';
import { dayOfYear, fromISO, weekStart } from './date';

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The strength of the week only counts during the week it was picked. */
export function activeStrengthOfWeek(sow: StrengthOfWeek | null, date: ISODate): string | null {
  return sow && sow.weekStart === weekStart(date) ? sow.strengthId : null;
}

/**
 * Quote of the day: stable for a date. Every other day it leans on the
 * Strength of the week when one is set.
 */
export function quoteOfDay(quotes: Quote[], date: ISODate, focus: string | null): Quote | undefined {
  if (!quotes.length) return undefined;
  const sorted = [...quotes].sort((a, b) => a.id.localeCompare(b.id));
  if (focus && dayOfYear(date) % 2 === 0) {
    const matching = sorted.filter((q) => q.strength === focus);
    if (matching.length) return matching[hash(date) % matching.length];
  }
  return sorted[hash(date) % sorted.length];
}

/** Journal prompt for the Clear step, rotating through signature strengths. */
export function journalPrompt(strengths: Strength[], date: ISODate): { prompt: string; strength?: Strength } {
  const top = strengths.slice(0, 5);
  if (!top.length) return { prompt: 'What is on your mind?' };
  const s = top[dayOfYear(date) % top.length];
  return { prompt: s.prompt, strength: s };
}

export function reflectPrompt(date: ISODate): string {
  const prompts = ['What went well today?', 'What are you glad happened today?', 'What is one small win from today?'];
  return prompts[dayOfYear(date) % prompts.length];
}

/** A gentle, strength-based action for a low check-in. */
export function lowMoodAction(strengths: Strength[], date: ISODate): { action: string; strength: Strength } | null {
  const top = strengths.slice(0, 5).filter((s) => s.lowMoodAction);
  if (!top.length) return null;
  const s = top[hash(date + 'low') % top.length];
  return { action: s.lowMoodAction!, strength: s };
}

export function dailyChallenge(s: Strength, date: ISODate): string {
  return s.challenges[fromISO(date).getDay() % s.challenges.length];
}
