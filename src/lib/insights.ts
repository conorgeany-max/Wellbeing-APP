import type { Entry, Habit, HabitLog, ISODate, Strength } from '../db/types';
import { addDays, daysBetween, fromISO, lastNDays, today, WEEKDAYS } from './date';
import { habitStats, indexLogs, type HabitStats } from './habits';
import { MIN_SAMPLE, fmt1, mean, pearson, plural } from './stats';
import { topWords } from './text';

export interface Finding {
  id: string;
  label: string;
  icon?: string;
  sentence: string;
  diff: number; // mood difference vs comparison
  n: number; // sample size of the group
  kind: 'habit' | 'tag' | 'strength';
}

export interface InsightsData {
  hasData: boolean;
  entryCount: number;
  avgMood: number;
  avgEnergy: number;
  series: { date: ISODate; mood: number | null; energy: number | null }[];
  works: Finding[];
  doesnt: Finding[];
  sleep: { points: { sleep: number; mood: number }[]; r: number; shortAvg: number; longAvg: number; nShort: number; nLong: number };
  weekdays: { day: string; avg: number; n: number }[];
  bestDay: { day: string; avg: number; n: number } | null;
  hardestDay: { day: string; avg: number; n: number } | null;
  habits: { habit: Habit; stats: HabitStats }[];
  words: { good: { word: string; count: number }[]; low: { word: string; count: number }[]; goodTags: [string, number][]; lowTags: [string, number][]; nGood: number; nLow: number };
  weekly: { avgMood: number; n: number; topHabit: { habit: Habit; count: number } | null; highlight: { date: ISODate; text: string } | null; prevAvg: number };
  strengths: {
    usage: { strength: Strength; count30: number; avgWith: number; nWith: number; avgWithout: number; diff: number }[];
    neglected: { strength: Strength; daysSince: number | null; avgWith: number; nWith: number }[];
  };
}

const MEANINGFUL = 0.3; // mood points before we call something a pattern

export function computeInsights(
  entries: Entry[],
  habits: Habit[],
  logs: HabitLog[],
  strengths: Strength[],
  rangeDays: number,
  end: ISODate = today(),
): InsightsData {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const moods = entries.map((e) => e.mood);
  const avgMood = mean(moods);
  const done = indexLogs(logs);

  // --- Mood & energy over time
  const series = lastNDays(rangeDays, end).map((date) => {
    const e = byDate.get(date);
    return { date, mood: e?.mood ?? null, energy: e?.energy ?? null };
  });

  // --- Habits linked with mood
  const findings: Finding[] = [];
  for (const h of habits) {
    const set = done.get(h.id) ?? new Set();
    const withH = entries.filter((e) => set.has(e.date)).map((e) => e.mood);
    const without = entries.filter((e) => !set.has(e.date)).map((e) => e.mood);
    if (withH.length < MIN_SAMPLE || without.length < MIN_SAMPLE) continue;
    const diff = mean(withH) - mean(without);
    const verb = habitVerb(h.name);
    findings.push({
      id: `habit-${h.id}`, kind: 'habit', label: h.name, icon: h.icon, diff, n: withH.length,
      sentence: diff >= 0
        ? `On days you ${verb}, your mood was ${fmt1(diff)} points higher on average (based on ${withH.length} days).`
        : `On days you ${verb}, your mood was ${fmt1(-diff)} points lower on average (based on ${withH.length} days).`,
    });
  }

  // --- Tags linked with mood
  const tagCounts = new Map<string, number[]>();
  for (const e of entries) for (const t of e.tags) tagCounts.set(t, [...(tagCounts.get(t) ?? []), e.mood]);
  const habitNames = new Set(habits.map((h) => h.name.toLowerCase()));
  for (const [tag, ms] of tagCounts) {
    if (ms.length < MIN_SAMPLE || habitNames.has(tag.toLowerCase())) continue; // the habit already says it
    const others = entries.filter((e) => !e.tags.includes(tag)).map((e) => e.mood);
    if (others.length < MIN_SAMPLE) continue;
    const avg = mean(ms);
    const otherAvg = mean(others);
    findings.push({
      id: `tag-${tag}`, kind: 'tag', label: tag, diff: avg - otherAvg, n: ms.length,
      sentence: `Days tagged “${tag}” average ${fmt1(avg)} mood vs ${fmt1(otherAvg)} on other days (${plural(ms.length, 'day')}).`,
    });
  }

  // --- Strengths and mood
  const last30 = new Set(lastNDays(30, end));
  const usage = strengths.map((s) => {
    const withS = entries.filter((e) => e.strengthsUsed.includes(s.id));
    const withoutS = entries.filter((e) => !e.strengthsUsed.includes(s.id));
    const avgWith = mean(withS.map((e) => e.mood));
    const avgWithout = mean(withoutS.map((e) => e.mood));
    return {
      strength: s,
      count30: withS.filter((e) => last30.has(e.date)).length,
      avgWith, nWith: withS.length, avgWithout,
      diff: withS.length >= MIN_SAMPLE && withoutS.length >= MIN_SAMPLE ? avgWith - avgWithout : NaN,
    };
  });
  for (const u of usage) {
    if (!Number.isFinite(u.diff)) continue;
    findings.push({
      id: `strength-${u.strength.id}`, kind: 'strength', label: u.strength.name, diff: u.diff, n: u.nWith,
      sentence: `On days you used ${u.strength.name}, your mood averaged ${fmt1(u.avgWith)} vs ${fmt1(u.avgWithout)} on other days (${plural(u.nWith, 'day')}).`,
    });
  }

  const works = findings.filter((f) => f.diff >= MEANINGFUL).sort((a, b) => b.diff - a.diff);
  const doesnt = findings.filter((f) => f.diff <= -MEANINGFUL).sort((a, b) => a.diff - b.diff);

  const neglected = usage
    .filter((u) => u.strength.rank <= 5)
    .map((u) => {
      const dates = entries.filter((e) => e.strengthsUsed.includes(u.strength.id)).map((e) => e.date).sort();
      const last = dates[dates.length - 1];
      return { strength: u.strength, daysSince: last ? daysBetween(last, end) : null, avgWith: u.avgWith, nWith: u.nWith };
    })
    .filter((n) => n.daysSince === null || n.daysSince >= 5)
    .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));

  // --- Sleep vs mood
  const sleepEntries = entries.filter((e) => e.sleepHours > 0);
  const short = sleepEntries.filter((e) => e.sleepHours < 7).map((e) => e.mood);
  const long = sleepEntries.filter((e) => e.sleepHours >= 7).map((e) => e.mood);
  const sleep = {
    points: sleepEntries.map((e) => ({ sleep: e.sleepHours, mood: e.mood })),
    r: sleepEntries.length >= MIN_SAMPLE ? pearson(sleepEntries.map((e) => e.sleepHours), sleepEntries.map((e) => e.mood)) : NaN,
    shortAvg: mean(short), longAvg: mean(long), nShort: short.length, nLong: long.length,
  };

  // --- Day of week (a weekday needs a few entries before we compare it)
  const MIN_WEEKDAY = 3;
  const weekdays = WEEKDAYS.map((day, i) => {
    const ms = entries.filter((e) => fromISO(e.date).getDay() === i).map((e) => e.mood);
    return { day, avg: mean(ms), n: ms.length };
  });
  const ranked = weekdays.filter((w) => w.n >= MIN_WEEKDAY).sort((a, b) => b.avg - a.avg);
  const bestDay = ranked.length >= 2 ? ranked[0] : null;
  const hardestDay = ranked.length >= 2 ? ranked[ranked.length - 1] : null;

  // --- Habit consistency
  const habitRows = habits.map((h) => ({ habit: h, stats: habitStats(h, done.get(h.id), end) }));

  // --- Words and tags on good vs low days
  const good = entries.filter((e) => e.mood >= 4);
  const low = entries.filter((e) => e.mood <= 2);
  const tagTally = (es: Entry[]) => {
    const m = new Map<string, number>();
    for (const e of es) for (const t of e.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const words = {
    good: topWords(good.map((e) => `${e.text} ${e.reflection}`), 8),
    low: topWords(low.map((e) => `${e.text} ${e.reflection}`), 8),
    goodTags: tagTally(good), lowTags: tagTally(low), nGood: good.length, nLow: low.length,
  };

  // --- Weekly summary (last 7 days)
  const week = lastNDays(7, end);
  const weekEntries = week.map((d) => byDate.get(d)).filter((e): e is Entry => !!e);
  const prevWeek = lastNDays(7, addDays(end, -7)).map((d) => byDate.get(d)).filter((e): e is Entry => !!e);
  let topHabit: { habit: Habit; count: number } | null = null;
  for (const h of habits) {
    const set = done.get(h.id);
    const count = week.filter((d) => set?.has(d)).length;
    if (count && (!topHabit || count > topHabit.count)) topHabit = { habit: h, count };
  }
  const bestEntry = [...weekEntries].sort((a, b) => b.mood - a.mood || b.date.localeCompare(a.date))[0];
  const highlightText = bestEntry ? (bestEntry.reflection || firstSentence(bestEntry.text)) : '';
  const weekly = {
    avgMood: mean(weekEntries.map((e) => e.mood)), n: weekEntries.length, topHabit,
    highlight: bestEntry && highlightText ? { date: bestEntry.date, text: highlightText } : null,
    prevAvg: mean(prevWeek.map((e) => e.mood)),
  };

  return {
    hasData: entries.length > 0,
    entryCount: entries.length,
    avgMood,
    avgEnergy: mean(entries.map((e) => e.energy)),
    series, works, doesnt, sleep, weekdays, bestDay, hardestDay,
    habits: habitRows, words, weekly,
    strengths: { usage: usage.sort((a, b) => b.count30 - a.count30), neglected },
  };
}

function firstSentence(text: string): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? '';
  return s.length > 140 ? `${s.slice(0, 137)}…` : s;
}

/** Turn a habit name into something that reads after "On days you…". */
function habitVerb(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    exercise: 'exercised', meditate: 'meditated', read: 'read', 'walk outside': 'walked outside',
    'no alcohol': 'skipped alcohol', '8h sleep': 'got 8 hours of sleep',
  };
  return map[n] ?? `ticked off “${name}”`;
}
