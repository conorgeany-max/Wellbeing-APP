import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { setHabitDone, useEntries, useEntry, useHabitLogs, useHabits, useQuotes, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import { dailyChallenge, quoteOfDay, strengthOfDay } from '../lib/daily';
import { addDays, daysBetween, formatLong, greeting, today } from '../lib/date';
import { Eyebrow } from '../components/ui';
import { Logo } from '../components/Nav';
import { ProgressRing } from '../components/ProgressRing';
import { MoodFace, MOOD_LABELS } from '../components/MoodFace';
import { ExperimentCard } from '../components/ExperimentCard';
import { pickMemory, snippet, type Memory } from '../lib/memories';
import { activeExperiment } from '../lib/experiments';
import { guideOfDay } from '../lib/guide';
import type { Entry, Habit } from '../db/types';

/** Consecutive check-in days ending today (or yesterday, if today isn't done yet). */
function checkInStreak(dates: Set<string>): number {
  let d = dates.has(today()) ? today() : addDays(today(), -1);
  let n = 0;
  while (dates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export default function Today() {
  const date = today();
  const settings = useSettings();
  const entries = useEntries();
  const entry = useEntry(date);
  const habits = useHabits();
  const logs = useHabitLogs();
  const quotes = useQuotes();
  const strengths = useStrengths();

  const focus = strengthOfDay(strengths, date);
  const quote = quoteOfDay(quotes, date, focus?.id ?? null);
  const doneToday = new Set(logs.filter((l) => l.date === date).map((l) => l.habitId));
  const habitsDone = habits.filter((h) => doneToday.has(h.id)).length;
  const dates = new Set(entries.map((e) => e.date));
  const streak = checkInStreak(dates);
  const lastDate = entries[0]?.date;
  const away = lastDate ? daysBetween(lastDate, date) : 0;

  const memory = pickMemory(entries, habits, logs, date);
  const experiment = activeExperiment(settings.experiments);
  const rule = guideOfDay(settings.guide, date);

  const hello = `${away >= 2 ? 'Welcome back' : greeting()}${settings.name ? `, ${settings.name}` : ''}.`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-xl flex-col md:max-w-2xl lg:max-w-3xl gap-5 px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-10"
      >
        <Logo className="self-start md:hidden" />

        <header className="flex flex-col items-center gap-3 py-8 text-center md:py-12">
          <p className="text-sm text-muted">{formatLong(date)}</p>
          <h1 className="headline text-5xl sm:text-6xl lg:text-7xl">{hello}</h1>
          {away >= 2 && !entry && <p className="text-muted">Good to see you. Pick up wherever feels right.</p>}
          {!entry && <Link to="/checkin" className="btn-primary btn-arrow mt-4 py-3 pl-6 pr-2.5 text-base">Start check-in</Link>}
        </header>

        {entry
          ? <TodaySoFar entry={entry} habits={habits} doneToday={doneToday} streak={streak} />
          : <AtAGlance habitsDone={habitsDone} habitsTotal={habits.length} streak={streak} />}

        {focus && (
          <section className="card-tint p-6">
            <Eyebrow className="!text-accent">Try today · {focus.name}</Eyebrow>
            <p className="headline mt-2 text-2xl leading-tight">{dailyChallenge(focus, date)}</p>
            <p className="mt-2 text-sm text-muted">Only if it fits your day. A new one tomorrow.</p>
          </section>
        )}

        {rule && (
          <Link to="/guide" className="card flex items-start gap-4 p-6 transition hover:-translate-y-0.5">
            <span className="headline text-4xl leading-none text-accent">{rule.item.label || '❋'}</span>
            <span>
              <Eyebrow>From {rule.title || 'your guide'}</Eyebrow>
              <span className="headline mt-1 block text-2xl leading-tight">{rule.item.text}</span>
            </span>
          </Link>
        )}

        {quote && (
          <figure className="px-4 py-6 text-center">
            <blockquote className="headline text-[1.75rem] leading-[1.15] sm:text-3xl">“{quote.text}”</blockquote>
            <figcaption className="mt-3 text-sm text-muted">{quote.author}</figcaption>
          </figure>
        )}

        {memory && <MemoryCard memory={memory} />}

        {experiment && <ExperimentCard x={experiment} entries={entries} logs={logs} />}
      </motion.main>
    </div>
  );
}

/** Before checking in: habits and streak side by side in one quiet card. */
function AtAGlance({ habitsDone, habitsTotal, streak }: { habitsDone: number; habitsTotal: number; streak: number }) {
  return (
    <section className="card grid grid-cols-2 divide-x divide-line">
      <Link to="/habits" className="flex flex-col items-center gap-3 rounded-l-card p-5 text-center transition hover:bg-tint/60 sm:flex-row sm:gap-4 sm:text-left">
        <ProgressRing value={habitsTotal ? habitsDone / habitsTotal : 0} size={56} stroke={6}>
          <span className="text-sm font-semibold">{habitsTotal ? `${habitsDone}/${habitsTotal}` : '+'}</span>
        </ProgressRing>
        <div>
          <p className="font-semibold">{habitsTotal ? 'Habits' : 'Add a habit'}</p>
          <p className="text-sm text-muted">{habitsTotal ? (habitsDone === habitsTotal ? 'All done' : 'today') : 'Start small'}</p>
        </div>
      </Link>
      <div className="flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:gap-4 sm:text-left">
        <p className="headline flex h-14 items-center text-5xl text-accent">{streak}</p>
        <div>
          <p className="font-semibold">{streak === 1 ? 'Day' : 'Days'} in a row</p>
          <p className="text-sm text-muted">{streak ? 'Nice and steady' : 'Start today'}</p>
        </div>
      </div>
    </section>
  );
}

/** After checking in, Today becomes a summary of your day: how you feel, what you wrote, what's left. */
function TodaySoFar({ entry, habits, doneToday, streak }: { entry: Entry; habits: Habit[]; doneToday: Set<string>; streak: number }) {
  const words = snippet(entry, 140);
  const left = habits.filter((h) => !doneToday.has(h.id));
  return (
    <section className="card p-5">
      <Link to={`/journal/${entry.date}`} className="flex items-center gap-4">
        <MoodFace mood={entry.mood} size={52} />
        <div className="flex-1">
          <Eyebrow>Today so far</Eyebrow>
          <p className="headline text-2xl">Feeling {MOOD_LABELS[entry.mood].toLowerCase()}</p>
          {words
            ? <p className="mt-1 font-serif italic leading-snug">“{words}”</p>
            : <p className="text-sm text-muted">Tap to add to today's entry.</p>}
        </div>
      </Link>
      {habits.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <Eyebrow className="mb-2">{left.length ? `Still to do · ${left.length} of ${habits.length}` : 'Habits'}</Eyebrow>
          {left.length === 0 ? (
            <p className="text-sm">All of today's habits are done. Lovely.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {habits.map((h) => {
                const done = doneToday.has(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    aria-pressed={done}
                    onClick={() => setHabitDone(h.id, entry.date, !done)}
                    className={`chip min-h-[44px] ${done ? 'chip-on' : 'text-muted hover:text-ink'}`}
                  >
                    {done ? '✓' : h.icon} {h.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {streak > 1 && <p className="mt-3 text-xs text-muted">{streak} days of check-ins in a row.</p>}
    </section>
  );
}

/** One of your own past entries, brought back so what helped stays in mind. */
function MemoryCard({ memory }: { memory: Memory }) {
  const { entry } = memory;
  return (
    <Link to={`/journal/${entry.date}`} className="card block p-5 transition hover:-translate-y-0.5">
      <Eyebrow>{memory.eyebrow}</Eyebrow>
      <p className="mt-2 text-sm text-muted">{memory.title}</p>
      <blockquote className="headline mt-2 text-2xl leading-tight">“{snippet(entry, 220)}”</blockquote>
      {memory.habitsDone.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="text-muted">That day you also: </span>
          {memory.habitsDone.map((h) => `${h.icon} ${h.name}`).join(' · ')}
        </p>
      )}
      <p className="mt-3 flex items-center gap-2 text-xs text-muted"><MoodFace mood={entry.mood} size={20} /> Felt {MOOD_LABELS[entry.mood].toLowerCase()} · read the full entry</p>
    </Link>
  );
}
