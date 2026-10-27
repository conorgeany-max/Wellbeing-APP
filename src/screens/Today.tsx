import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { setHabitDone, useEntries, useEntry, useHabitLogs, useHabits, useQuotes, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import { activeStrengthOfWeek, dailyChallenge, quoteOfDay } from '../lib/daily';
import { addDays, daysBetween, formatLong, greeting, today } from '../lib/date';
import { Eyebrow, MixedTitle } from '../components/ui';
import { Logo } from '../components/Nav';
import { SpinBadge, Sticker } from '../components/Sticker';
import { ProgressRing } from '../components/ProgressRing';
import { MoodFace, MOOD_LABELS } from '../components/MoodFace';
import { ExperimentCard } from '../components/ExperimentCard';
import { pickMemory, snippet, type Memory } from '../lib/memories';
import { activeExperiment } from '../lib/experiments';
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

  const focusId = activeStrengthOfWeek(settings.strengthOfWeek, date);
  const focus = strengths.find((s) => s.id === focusId);
  const quote = quoteOfDay(quotes, date, focusId);
  const doneToday = new Set(logs.filter((l) => l.date === date).map((l) => l.habitId));
  const habitsDone = habits.filter((h) => doneToday.has(h.id)).length;
  const dates = new Set(entries.map((e) => e.date));
  const streak = checkInStreak(dates);
  const lastDate = entries[0]?.date;
  const away = lastDate ? daysBetween(lastDate, date) : 0;

  const memory = pickMemory(entries, habits, logs, date);
  const experiment = activeExperiment(settings.experiments);

  const hello = `${away >= 2 ? 'Welcome back' : greeting()}${settings.name ? `, ${settings.name}` : ''}.`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-10"
      >
        <Logo className="-rotate-6 self-start md:hidden" />

        <header className="relative flex flex-col items-center gap-5 py-6 text-center md:py-14">
          {/* Stickers float around the hero; fewer and smaller on phones */}
          <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
            <Sticker look="pink" tilt={-8} className="absolute -left-2 -top-2 text-sm sm:text-base lg:-left-36 lg:top-0 lg:text-lg">One day<br />at a time</Sticker>
            <Sticker look="green" tilt={7} delay={1.5} className="absolute -right-1 top-0 text-sm sm:text-base lg:-right-36 lg:top-8 lg:text-lg">Be kind<br />to you</Sticker>
            <SpinBadge text="BREATHE IN · BREATHE OUT · BREATHE IN · BREATHE OUT ·" center="☺" className="absolute -bottom-6 -right-40 hidden lg:inline-flex" />
            <Sticker look="orange" tilt={-5} delay={3} className="absolute bottom-2 -left-32 hidden lg:inline-block">Little<br />wins</Sticker>
          </div>
          <p className="lead relative">{formatLong(date)}</p>
          <MixedTitle className="relative text-[3.25rem] sm:text-7xl">{hello}</MixedTitle>
          {away >= 2 && !entry && <p className="lead relative !text-lg text-muted">Good to see you. Pick up wherever feels right.</p>}
          {!entry && <Link to="/checkin" className="btn-primary btn-arrow relative mt-2 py-3.5 pl-6 pr-3 text-base">Start check-in</Link>}
        </header>

        {entry && <TodaySoFar entry={entry} habits={habits} doneToday={doneToday} streak={streak} />}

        {memory && <MemoryCard memory={memory} />}

        {experiment && <ExperimentCard x={experiment} entries={entries} logs={logs} />}

        {quote && (
          <figure className={`card text-center ${entry ? 'px-6 py-6' : 'px-6 py-8'}`}>
            <Eyebrow>Quote of the day</Eyebrow>
            <blockquote className={`headline mt-4 leading-[1.1] ${entry ? 'text-2xl' : 'text-[1.75rem] sm:text-[2rem]'}`}>“{quote.text}”</blockquote>
            <figcaption className="mt-4 text-sm font-semibold"><span className="squiggle">{quote.author}</span></figcaption>
          </figure>
        )}

        {!entry && (
          <div className="grid grid-cols-2 gap-4">
            <Link to="/habits" className="card flex flex-col items-center gap-3 p-5 text-center transition hover:-translate-y-0.5">
              <ProgressRing value={habits.length ? habitsDone / habits.length : 0}>
                <span className="headline text-3xl">{habitsDone}/{habits.length}</span>
              </ProgressRing>
              <Eyebrow>Habits today</Eyebrow>
            </Link>
            <div className="card flex flex-col items-center justify-center gap-1 p-5 text-center">
              <p className="display text-7xl text-accent">{streak}</p>
              <Eyebrow>{streak === 1 ? 'Day' : 'Days'} in a row</Eyebrow>
              <p className="font-serif text-lg leading-tight">{streak ? 'Nice and steady.' : 'Today is a good day to start.'}</p>
            </div>
          </div>
        )}

        {focus && (
          <Link to="/strengths" className="card-tint p-5 transition hover:-translate-y-0.5">
            <Eyebrow>Strength of the week · {focus.name}</Eyebrow>
            <p className="headline mt-2 text-2xl leading-tight">{dailyChallenge(focus, date)}</p>
          </Link>
        )}
      </motion.main>
    </div>
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
