import type { Entry } from '../db/types';
import { WEEKDAYS, formatShort, fromISO } from './date';
import { MIN_SAMPLE, fmt1, mean, plural } from './stats';
import { STOPWORDS } from './text';
import { api } from './cloud';

// "Ask my journal". Two providers: private on-device keyword search (always
// available) and Claude via the hosted app's /api/ask function (opt-in).

export interface AskResult {
  matches: Entry[];
  summary: string[]; // short plain-English observations
  terms: string[];
  source: 'local' | 'ai';
}

export interface AskProvider {
  name: string;
  ask(question: string, entries: Entry[]): Promise<AskResult>;
}

// Related words so "When did I feel anxious?" also finds "worried".
const SYNONYMS: string[][] = [
  ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'stressed', 'stress', 'panic', 'overwhelmed'],
  ['sleep', 'slept', 'tired', 'exhausted', 'insomnia', 'awake', 'nap', 'rest'],
  ['happy', 'joy', 'great', 'good', 'lovely', 'grateful', 'glad', 'proud'],
  ['sad', 'low', 'down', 'lonely', 'cry', 'cried', 'flat'],
  ['exercise', 'run', 'ran', 'gym', 'workout', 'swim', 'yoga'],
  ['friend', 'friends', 'sister', 'brother', 'family', 'mum', 'dad', 'partner'],
  ['work', 'meeting', 'meetings', 'deadline', 'emails', 'boss', 'project'],
  ['nature', 'park', 'river', 'walk', 'outside', 'outdoors', 'garden', 'sea'],
  ['angry', 'anger', 'frustrated', 'annoyed', 'irritated'],
  ['calm', 'peaceful', 'relaxed', 'present', 'still'],
];

const QUESTION_WORDS = new Set(['when', 'did', 'feel', 'felt', 'how', 'what', 'why', 'days', 'day', 'show', 'times', 'ever', 'last', 'often', 'usually', 'tend']);

export function extractTerms(question: string): string[] {
  const words = question.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !QUESTION_WORDS.has(w));
  const terms = new Set<string>();
  for (const w of words) {
    terms.add(w);
    for (const group of SYNONYMS) if (group.includes(w)) group.forEach((g) => terms.add(g));
  }
  return [...terms];
}

function matches(entry: Entry, terms: string[]): boolean {
  const hay = `${entry.text} ${entry.reflection}`.toLowerCase();
  const tags = entry.tags.map((t) => t.toLowerCase());
  return terms.some((t) => tags.some((tag) => tag.includes(t)) || new RegExp(`\\b${t}`, 'i').test(hay));
}

export const localProvider: AskProvider = {
  name: 'Keyword search',
  async ask(question, entries) {
    const terms = extractTerms(question);
    if (!terms.length) return { matches: [], summary: ['Try a word or feeling, like “anxious”, “sleep” or “family”.'], terms, source: 'local' };
    const found = entries.filter((e) => matches(e, terms)).sort((a, b) => b.date.localeCompare(a.date));
    const summary: string[] = [];
    if (!found.length) {
      summary.push(`No entries mention “${terms[0]}” or related words yet.`);
      return { matches: found, summary, terms, source: 'local' };
    }
    const overall = mean(entries.map((e) => e.mood));
    const avg = mean(found.map((e) => e.mood));
    summary.push(`${plural(found.length, 'entry', 'entries')} match, most recently on ${formatShort(found[0].date)}.`);
    if (found.length >= MIN_SAMPLE) {
      const diff = avg - overall;
      const comparison = Math.abs(diff) < 0.3 ? 'about the same as' : diff > 0 ? 'above' : 'below';
      summary.push(`Mood on those days averaged ${fmt1(avg)}, ${comparison} your overall ${fmt1(overall)}.`);
      const sleep = mean(found.map((e) => e.sleepHours));
      const allSleep = mean(entries.map((e) => e.sleepHours));
      if (Math.abs(sleep - allSleep) >= 0.4) summary.push(`You slept ${fmt1(sleep)}h on average before those days, vs ${fmt1(allSleep)}h usually.`);
      const dow = new Map<number, number>();
      for (const e of found) dow.set(fromISO(e.date).getDay(), (dow.get(fromISO(e.date).getDay()) ?? 0) + 1);
      const [topDay, topCount] = [...dow.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topCount >= 3 && topCount / found.length >= 0.35) summary.push(`They happened most often on ${WEEKDAYS[topDay]}s (${topCount} of ${found.length}).`);
    } else {
      summary.push(`That is fewer than ${MIN_SAMPLE} entries, so it is too early to spot a pattern.`);
    }
    const tagCounts = new Map<string, number>();
    for (const e of found) for (const t of e.tags) if (!terms.includes(t)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const common = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).filter(([, c]) => c >= 2).slice(0, 3).map(([t]) => `“${t}”`);
    if (common.length) summary.push(`Often tagged alongside ${common.join(', ')}.`);
    return { matches: found, summary, terms, source: 'local' };
  },
};

/** Entries in the compact shape sent to Claude (most recent first, long text trimmed). */
export function forClaude(entries: Entry[], limit = 240) {
  return [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(({ date, mood, energy, sleepHours, text, reflection, tags, strengthsUsed }) => ({
      date, mood, energy, sleepHours, tags, strengthsUsed,
      text: text.length > 700 ? `${text.slice(0, 700)}…` : text,
      reflection,
    }));
}

/**
 * Claude provider: sends the question and recent entries to the app's own
 * /api/ask function, which holds the API key and calls Claude.
 */
export const claudeProvider: AskProvider = {
  name: 'Claude',
  async ask(question, entries) {
    const data = await api<{ summary: string[]; matchDates: string[] }>('ask', {
      method: 'POST',
      body: JSON.stringify({ mode: 'ask', question, entries: forClaude(entries) }),
    });
    const order = new Map(data.matchDates.map((d, i) => [d, i]));
    const matches = entries.filter((e) => order.has(e.date)).sort((a, b) => order.get(a.date)! - order.get(b.date)!);
    return { matches, summary: data.summary, terms: [], source: 'ai' };
  },
};

export function askJournal(question: string, entries: Entry[], provider: AskProvider = localProvider) {
  return provider.ask(question, entries);
}
