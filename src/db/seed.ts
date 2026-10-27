import { db } from './db';
import { getSettings, setSetting } from './settings';
import type { Entry, HabitLog } from './types';
import { STRENGTHS } from '../data/strengths';
import { QUOTES } from '../data/quotes';
import { STARTER_HABITS } from '../data/habits';
import { addDays, fromISO, today } from '../lib/date';

/** First launch: load strengths, quotes, starter habits and demo data. */
export async function ensureSeeded() {
  const settings = await getSettings();
  if (settings.seeded) return;
  // Starter content is identical on every device, so it gets updatedAt 0:
  // any real edit wins over it when syncing, and two fresh devices don't
  // trade copies of the same records.
  const SEED_TIME = 0;
  await db.transaction('rw', [db.strengths, db.quotes, db.habits, db.settings, db.entries, db.habitLogs], async () => {
    await db.strengths.bulkPut(STRENGTHS.map((s) => ({ ...s, updatedAt: SEED_TIME })));
    await db.quotes.bulkPut(
      QUOTES.map((q, i) => ({ id: `q-${i}`, ...q, favourite: false, custom: false, updatedAt: SEED_TIME })),
    );
    await db.habits.bulkPut(
      STARTER_HABITS.map(({ active, ...h }, i) => ({ ...h, archived: !active, order: i, createdAt: SEED_TIME, updatedAt: SEED_TIME })),
    );
    await setSetting('seeded', true);
    await setSetting('sampleData', true);
  });
  await addSampleData();
}

// Small deterministic PRNG so the demo data is the same on every device.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

const SNIPPETS = {
  exercise: ['Went for a run before work and felt clear-headed all morning.', 'Gym session after work. Tired but in a good way.', 'Did a short workout at home. Glad I pushed myself to start.'],
  walk: ['Walked along the river at lunch. The light on the water was lovely.', 'Took the long way home through the park.', 'A slow walk outside helped me reset.'],
  workStress: ['Work was relentless today. Back-to-back meetings and a deadline moved up.', 'Felt anxious about the project review. Kept replaying a conversation.', 'Too many emails, not enough time. Head feels full.'],
  friends: ['Caught up with an old friend on the phone. Laughed a lot.', 'Dinner with friends. Felt really connected.', 'Long chat with my sister, felt close to her.'],
  curiosity: ['Fell down a rabbit hole reading about how memory works. Fascinating.', 'Tried a new recipe from a cookbook I found.', 'Started learning a few words of Spanish.'],
  poorSleep: ['Slept badly and felt foggy all day.', 'Woke up at 4am and could not get back to sleep.', 'Exhausted. Running on coffee.'],
  alcohol: ['Had a few drinks last night, felt flat today.', 'Wine with dinner, slept worse.'],
  neutral: ['Quiet day. Nothing much to report.', 'Ordinary day, got through my list.', 'Mixed day. Some good bits, some meh.'],
};

const REFLECTIONS = {
  good: ['Felt present and calm.', 'Good conversation and fresh air.', 'I was kind to myself today.', 'Got outside and moved.', 'Laughed properly for the first time this week.'],
  low: ['I got through it, that is enough.', 'Asked for help, which was hard but good.', 'At least I made dinner.', 'I noticed the stress early.'],
};

/** Generate 30 days of realistic, gently correlated demo data (ending yesterday). */
export async function addSampleData() {
  const r = mulberry32(42);
  const entries: Entry[] = [];
  const logs: HabitLog[] = [];
  const now = Date.now();
  const end = addDays(today(), -1);

  for (let i = 29; i >= 0; i--) {
    const date = addDays(end, -i);
    const dow = fromISO(date).getDay();
    const weekend = dow === 0 || dow === 6;
    // Skip a few days: missed days are normal.
    if (i === 17 || i === 11 || i === 4) continue;

    const exercise = r() < (weekend ? 0.6 : 0.4);
    const walk = r() < 0.6;
    const meditate = r() < 0.45;
    const noAlcohol = r() < (weekend ? 0.5 : 0.85);
    const read = r() < 0.5;
    const friend = r() < (weekend ? 0.6 : 0.3);
    const kindness = r() < 0.5;
    const gratitudeRoll = r();
    const workStress = !weekend && r() < 0.5;
    const curiosityUsed = i > 9 && r() < 0.55; // not logged lately
    const sleepHours = Math.round(Math.max(4.5, Math.min(9.5, 7 + (r() - 0.5) * 3 - (noAlcohol ? 0 : 0.8))) * 2) / 2;

    let score = 2.75 + (r() - 0.5) * 1.2;
    if (exercise) score += 0.8;
    if (walk) score += 0.35;
    if (meditate) score += 0.25;
    if (!noAlcohol) score -= 0.5;
    if (friend) score += 0.55;
    if (workStress) score -= 1.2;
    if (curiosityUsed) score += 0.45;
    if (weekend) score += 0.3;
    if (dow === 1) score -= 0.35;
    score += (sleepHours - 7) * 0.35;
    const mood = Math.max(1, Math.min(5, Math.round(score)));
    const gratitude = gratitudeRoll < (mood >= 4 ? 0.6 : 0.25);
    const energy = Math.max(1, Math.min(5, Math.round(2.6 + (sleepHours - 7) * 0.5 + (exercise ? 0.7 : 0) + (r() - 0.5))));

    const parts: string[] = [];
    const tags = new Set<string>();
    if (workStress) { parts.push(pick(r, SNIPPETS.workStress)); tags.add('work stress'); if (r() < 0.6) tags.add('anxious'); }
    if (sleepHours < 6) { parts.push(pick(r, SNIPPETS.poorSleep)); tags.add('tired'); }
    if (exercise) { parts.push(pick(r, SNIPPETS.exercise)); tags.add('exercise'); }
    if (walk && r() < 0.6) { parts.push(pick(r, SNIPPETS.walk)); tags.add('nature'); }
    if (friend) { parts.push(pick(r, SNIPPETS.friends)); tags.add(r() < 0.5 ? 'friends' : 'family'); }
    if (curiosityUsed && r() < 0.7) parts.push(pick(r, SNIPPETS.curiosity));
    if (!noAlcohol && r() < 0.6) parts.push(pick(r, SNIPPETS.alcohol));
    if (parts.length === 0) parts.push(pick(r, SNIPPETS.neutral));
    if (mood >= 4 && r() < 0.6) tags.add('grateful');
    if (mood >= 4 && r() < 0.3) tags.add('calm');

    const strengthsUsed = new Set<string>();
    if (friend) strengthsUsed.add('love');
    if (curiosityUsed) strengthsUsed.add('curiosity');
    if (walk && r() < 0.6) strengthsUsed.add('beauty');
    if (kindness) strengthsUsed.add('kindness');
    if (workStress && r() < 0.4) strengthsUsed.add('social-intelligence');
    if (gratitude && strengthsUsed.size < 3) strengthsUsed.add('gratitude');

    entries.push({
      id: `sample-${date}`,
      date,
      mood,
      energy,
      sleepHours,
      text: parts.join(' '),
      reflection: pick(r, mood >= 3 ? REFLECTIONS.good : REFLECTIONS.low),
      tags: [...tags],
      strengthsUsed: [...strengthsUsed].slice(0, 3),
      sample: true,
      createdAt: now,
      updatedAt: now,
    });

    const done: Record<string, boolean> = {
      'h-exercise': exercise,
      'h-sleep': sleepHours >= 8,
      'h-meditate': meditate,
      'h-walk': walk,
      'h-no-alcohol': noAlcohol,
      'h-read': read,
      'h-friend': friend,
      'h-connect': friend || r() < 0.3,
      'h-learn': curiosityUsed,
      'h-beauty': walk && r() < 0.7,
      'h-kindness': kindness,
      'h-gratitude': gratitude,
    };
    for (const [habitId, d] of Object.entries(done)) {
      if (d) logs.push({ id: `${habitId}:${date}`, habitId, date, done: true, sample: true, updatedAt: now });
    }
  }

  await db.transaction('rw', db.entries, db.habitLogs, async () => {
    // Never overwrite a real entry the user has written on the same date.
    const existing = new Set((await db.entries.toArray()).filter((e) => !e.sample).map((e) => e.date));
    await db.entries.bulkPut(entries.filter((e) => !existing.has(e.date)));
    const existingLogs = new Set((await db.habitLogs.toArray()).filter((l) => !l.sample).map((l) => l.id));
    await db.habitLogs.bulkPut(logs.filter((l) => !existingLogs.has(l.id)));
  });
}

export async function removeSampleData() {
  await db.transaction('rw', db.entries, db.habitLogs, async () => {
    await db.entries.filter((e) => !!e.sample).delete();
    await db.habitLogs.filter((l) => !!l.sample).delete();
  });
}
