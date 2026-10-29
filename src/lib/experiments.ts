import type { Entry, HabitLog, ISODate } from '../db/types';
import { getSettings, setSetting } from '../db/settings';
import type { Finding } from './insights';
import { addDays, daysBetween, today } from './date';
import { fmt1, mean } from './stats';
import { uid } from './id';

/** A 7-day try of something Insights linked with better mood. */
export interface Experiment {
  id: string;
  kind: Finding['kind'];
  ref: string; // habit id, tag, or strength id
  label: string;
  icon?: string;
  start: ISODate;
  days: number;
  baseline: number | null; // average mood in the two weeks before starting
  stoppedOn?: ISODate; // ended early
  closed?: boolean; // result seen and put away
}

export interface ExperimentProgress {
  day: number; // 1-based day of the experiment, capped at `days`
  finished: boolean;
  marks: { date: ISODate; state: 'done' | 'missed' | 'future' }[];
  doneCount: number;
  doneToday: boolean;
}

export interface ExperimentResult {
  headline: string;
  detail: string;
}

const DAYS = 7;
const BASELINE_DAYS = 14;
const CLEAR = 0.3; // same threshold Insights uses before calling something a pattern

function didOn(x: Experiment, date: ISODate, byDate: Map<ISODate, Entry>, logIds: Set<string>): boolean {
  if (x.kind === 'habit') return logIds.has(`${x.ref}:${date}`);
  const e = byDate.get(date);
  if (!e) return false;
  return x.kind === 'tag' ? e.tags.includes(x.ref) : e.strengthsUsed.includes(x.ref);
}

const lastDay = (x: Experiment) => addDays(x.start, x.days - 1);

export function experimentProgress(x: Experiment, entries: Entry[], logs: HabitLog[], date: ISODate = today()): ExperimentProgress {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const logIds = new Set(logs.filter((l) => l.done).map((l) => l.id));
  const end = x.stoppedOn ?? lastDay(x);
  const marks = Array.from({ length: x.days }, (_, i) => {
    const d = addDays(x.start, i);
    const state: 'done' | 'missed' | 'future' = didOn(x, d, byDate, logIds) ? 'done' : d >= date || d > end ? 'future' : 'missed';
    return { date: d, state };
  });
  return {
    day: Math.min(x.days, Math.max(1, daysBetween(x.start, date) + 1)),
    finished: !!x.stoppedOn || date > lastDay(x),
    marks,
    doneCount: marks.filter((m) => m.state === 'done').length,
    doneToday: didOn(x, date, byDate, logIds),
  };
}

/** Plain-language read-out once the week is over. Small numbers, so it stays modest. */
export function experimentResult(x: Experiment, entries: Entry[], logs: HabitLog[]): ExperimentResult {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const logIds = new Set(logs.filter((l) => l.done).map((l) => l.id));
  const end = x.stoppedOn ?? lastDay(x);
  const window = entries.filter((e) => e.date >= x.start && e.date <= end);
  const did = window.filter((e) => didOn(x, e.date, byDate, logIds)).map((e) => e.mood);
  const didnt = window.filter((e) => !didOn(x, e.date, byDate, logIds)).map((e) => e.mood);
  const length = daysBetween(x.start, end) + 1;
  const doneDays = Array.from({ length }, (_, i) => addDays(x.start, i)).filter((d) => didOn(x, d, byDate, logIds)).length;

  if (doneDays === 0) {
    return {
      headline: "You didn't get to it this time.",
      detail: "That's useful to know too. A smaller version, or tying it to something you already do each day, might fit better.",
    };
  }
  const tally = `You did it on ${doneDays} of ${length} days.`;
  if (window.length < 3) {
    return { headline: tally, detail: `Only ${window.length} check-in${window.length === 1 ? '' : 's'} that week, so there isn't enough to say how it affected your mood.` };
  }
  const avg = mean(window.map((e) => e.mood));
  const parts: string[] = [];
  if (x.baseline !== null) parts.push(`Your mood averaged ${fmt1(avg)} that week, vs ${fmt1(x.baseline)} in the two weeks before.`);
  else parts.push(`Your mood averaged ${fmt1(avg)} that week.`);
  if (did.length >= 2 && didnt.length >= 2) parts.push(`Days you did it: ${fmt1(mean(did))}. Days you didn't: ${fmt1(mean(didnt))}.`);

  const change = x.baseline !== null ? avg - x.baseline : did.length >= 2 && didnt.length >= 2 ? mean(did) - mean(didnt) : 0;
  const verdict = change >= CLEAR
    ? 'It looks like it helped. Worth keeping.'
    : change <= -CLEAR
      ? 'Your mood was lower this week, though a lot of things shape a week. It might be worth another try another time.'
      : 'No clear change this time. One week is short, so trust how it felt too.';
  return { headline: `${tally} ${verdict}`, detail: parts.join(' ') };
}

export function experimentTitle(x: Pick<Experiment, 'kind' | 'label' | 'ref'>): string {
  if (x.kind === 'habit') return x.label;
  if (x.kind === 'tag') return `More “${x.ref}” days`;
  return `Use ${x.label}`;
}

export function experimentHowTo(x: Pick<Experiment, 'kind' | 'label' | 'ref'>): string {
  if (x.kind === 'habit') return 'Tick it off here or in Habits on days you do it.';
  if (x.kind === 'tag') return `Tag “${x.ref}” in your check-in on days it happens.`;
  return `Tick ${x.label} under strengths in your check-in on days you use it.`;
}

export const activeExperiment = (list: Experiment[]) => list.find((x) => !x.closed);

export async function startExperiment(f: Finding, entries: Entry[]) {
  const start = today();
  const before = entries.filter((e) => e.date < start && daysBetween(e.date, start) <= BASELINE_DAYS).map((e) => e.mood);
  const ref = f.id.replace(/^(habit|tag|strength)-/, '');
  const x: Experiment = {
    id: uid(), kind: f.kind, ref, label: f.label, icon: f.icon, start, days: DAYS,
    baseline: before.length >= 3 ? mean(before) : null,
  };
  const { experiments } = await getSettings();
  await setSetting('experiments', [x, ...experiments.map((e) => (e.closed ? e : { ...e, closed: true }))]);
}

async function patchExperiment(id: string, patch: Partial<Experiment>) {
  const { experiments } = await getSettings();
  await setSetting('experiments', experiments.map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

export const stopExperiment = (id: string) => patchExperiment(id, { stoppedOn: today() });
export const closeExperiment = (id: string) => patchExperiment(id, { closed: true });
