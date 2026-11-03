import { db } from './db';
import { getSettings, setSetting } from './settings';
import { STRENGTHS } from '../data/strengths';
import { QUOTES } from '../data/quotes';
import { STARTER_HABITS } from '../data/habits';
import { STARTER_GUIDE } from '../data/starterGuide';

/**
 * First launch: load the strengths and quotes the app is built around.
 * Habits, entries and logs start empty, so everything you see is your own.
 */
export async function ensureSeeded() {
  const settings = await getSettings();
  if (!settings.exampleContentRemoved) await removeExampleContent();
  if (STARTER_GUIDE && !settings.guideSeeded && !settings.guide) await setSetting('guide', STARTER_GUIDE);
  if (!settings.guideSeeded) await setSetting('guideSeeded', true);
  if (settings.seeded) return;
  // Starter content is identical on every device, so it gets updatedAt 0:
  // any real edit wins over it when syncing, and two fresh devices don't
  // trade copies of the same records.
  const SEED_TIME = 0;
  await db.transaction('rw', [db.strengths, db.quotes, db.settings], async () => {
    await db.strengths.bulkPut(STRENGTHS.map((s) => ({ ...s, updatedAt: SEED_TIME })));
    await db.quotes.bulkPut(
      QUOTES.map((q, i) => ({ id: `q-${i}`, ...q, favourite: false, custom: false, updatedAt: SEED_TIME })),
    );
    await setSetting('seeded', true);
  });
}

/**
 * Earlier versions filled a new install with 30 days of demo entries and a
 * list of starter habits. Clear those out once, keeping any starter habit
 * you've edited or ticked off for real. The removed habits get tombstones so
 * syncing doesn't bring them back from another device.
 */
async function removeExampleContent() {
  await removeSampleData();
  const starterIds = new Set(STARTER_HABITS.map((h) => h.id));
  await db.transaction('rw', [db.habits, db.habitLogs, db.tombstones, db.settings], async () => {
    const used = new Set((await db.habitLogs.toArray()).map((l) => l.habitId));
    const unused = (await db.habits.toArray()).filter((h) => starterIds.has(h.id) && !h.updatedAt && !used.has(h.id));
    const now = Date.now();
    for (const h of unused) {
      await db.habits.delete(h.id);
      await db.tombstones.put({ key: `habits:${h.id}`, table: 'habits', id: h.id, updatedAt: now });
    }
    await setSetting('exampleContentRemoved', true);
  });
}

/** Delete any demo entries and habit ticks left from earlier versions. */
export async function removeSampleData() {
  await db.transaction('rw', db.entries, db.habitLogs, async () => {
    await db.entries.filter((e) => !!e.sample).delete();
    await db.habitLogs.filter((l) => !!l.sample).delete();
  });
}
