import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEntries, useEntry, useHabitLogs, useHabits, useQuotes, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import { activeStrengthOfWeek, dailyChallenge, quoteOfDay } from '../lib/daily';
import { addDays, daysBetween, formatLong, greeting, today } from '../lib/date';
import { Eyebrow } from '../components/ui';
import { ProgressRing } from '../components/ProgressRing';
import { MoodFace, MOOD_LABELS } from '../components/MoodFace';

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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="calm-gradient pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 pt-10 sm:px-6 md:pb-12"
      >
        <header>
          <Eyebrow>{formatLong(date)}</Eyebrow>
          <h1 className="headline mt-2 text-4xl sm:text-5xl">
            {away >= 2 ? 'Welcome back' : greeting()}
            {settings.name ? `, ${settings.name}` : ''}.
          </h1>
          {away >= 2 && <p className="mt-2 text-muted">Good to see you. Pick up wherever feels right.</p>}
        </header>

        {quote && (
          <figure className="card-sand p-6">
            <Eyebrow>Quote of the day</Eyebrow>
            <blockquote className="headline mt-3 text-xl leading-snug sm:text-2xl">“{quote.text}”</blockquote>
            <figcaption className="mt-3 text-sm text-muted">{quote.author}</figcaption>
          </figure>
        )}

        {entry ? (
          <Link to={`/journal/${date}`} className="card flex items-center gap-4 p-5">
            <MoodFace mood={entry.mood} size={52} />
            <div className="flex-1">
              <Eyebrow>Checked in</Eyebrow>
              <p className="headline text-xl">Feeling {MOOD_LABELS[entry.mood].toLowerCase()} today</p>
              <p className="text-sm text-muted">Tap to read or add to today's entry.</p>
            </div>
          </Link>
        ) : (
          <Link to="/checkin" className="btn-primary py-4 text-base">Start check-in</Link>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Link to="/habits" className="card flex flex-col items-center gap-2 p-5 text-center">
            <ProgressRing value={habits.length ? habitsDone / habits.length : 0}>
              <span className="headline text-xl">{habitsDone}/{habits.length}</span>
            </ProgressRing>
            <Eyebrow>Habits today</Eyebrow>
          </Link>
          <div className="card flex flex-col items-center justify-center gap-1 p-5 text-center">
            <p className="headline text-5xl text-sage">{streak}</p>
            <Eyebrow>{streak === 1 ? 'Day' : 'Days'} in a row</Eyebrow>
            <p className="text-xs text-muted">{streak ? 'Nice and steady.' : 'Today is a good day to start.'}</p>
          </div>
        </div>

        {focus && (
          <Link to="/strengths" className="card p-5">
            <Eyebrow>Strength of the week · {focus.name}</Eyebrow>
            <p className="mt-1">{dailyChallenge(focus, date)}</p>
          </Link>
        )}
      </motion.main>
    </div>
  );
}
