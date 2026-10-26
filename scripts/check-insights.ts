// Sanity check: generate the sample data in memory and print what Insights would say.
// Run with: npm run check:insights
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { ensureSeeded } from '../src/db/seed';
import { computeInsights } from '../src/lib/insights';
import { localProvider } from '../src/lib/ask';

const main = async () => {
  await ensureSeeded();
  const entries = await db.entries.orderBy('date').reverse().toArray();
  const habits = (await db.habits.orderBy('order').toArray()).filter((h) => !h.archived);
  const logs = await db.habitLogs.toArray();
  const strengths = await db.strengths.orderBy('rank').toArray();
  const d = computeInsights(entries, habits, logs, strengths, 30);
  console.log('entries', d.entryCount, 'avg mood', d.avgMood.toFixed(2), 'moods', entries.map((e) => e.mood).join(''));
  console.log('\nWORKS'); d.works.forEach((f) => console.log(' ', f.sentence));
  console.log('\nDOESN\'T'); d.doesnt.forEach((f) => console.log(' ', f.sentence));
  console.log('\nneglected', d.strengths.neglected.map((n) => `${n.strength.name} ${n.daysSince}d`).join(', '));
  console.log('best/hardest', d.bestDay?.day, d.hardestDay?.day, 'good/low days', d.words.nGood, d.words.nLow);
  const a = await localProvider.ask('When did I feel anxious?', entries);
  console.log('\nASK', a.summary.join(' '));
};
void main();
