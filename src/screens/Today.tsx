import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEntries, useEntry, useHabitLogs, useHabits, useQuotes, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import { activeStrengthOfWeek, dailyChallenge, quoteOfDay } from '../lib/daily';
import { addDays, daysBetween, formatLong, greeting, today } from '../lib/date';
import { Eyebrow, MixedTitle } from '../components/ui';
import { Logo } from '../components/Nav';
import { SpinBadge, Sticker } from '../components/Sticker';
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
            <Sticker look="pink" tilt={-8} className="absolute -left-2 -top-2 text-sm sm:-left-36 sm:top-0 sm:text-lg">One day<br />at a time</Sticker>
            <Sticker look="green" tilt={7} delay={1.5} className="absolute -right-1 top-0 text-sm sm:-right-36 sm:top-8 sm:text-lg">Be kind<br />to you</Sticker>
            <SpinBadge text="BREATHE IN · BREATHE OUT · BREATHE IN · BREATHE OUT ·" center="☺" className="absolute -bottom-6 -right-40 hidden sm:inline-flex" />
            <Sticker look="orange" tilt={-5} delay={3} className="absolute bottom-2 -left-32 hidden sm:inline-block">Little<br />wins</Sticker>
          </div>
          <p className="lead relative">{formatLong(date)}</p>
          <MixedTitle className="relative text-[3.25rem] sm:text-7xl">{hello}</MixedTitle>
          {away >= 2 && <p className="lead relative !text-lg text-muted">Good to see you. Pick up wherever feels right.</p>}
          {!entry && <Link to="/checkin" className="btn-primary btn-arrow relative mt-2 py-3.5 pl-6 pr-3 text-base">Start check-in</Link>}
        </header>

        {entry && (
          <Link to={`/journal/${date}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
            <MoodFace mood={entry.mood} size={52} />
            <div className="flex-1">
              <Eyebrow>Checked in</Eyebrow>
              <p className="headline text-2xl">Feeling {MOOD_LABELS[entry.mood].toLowerCase()} today</p>
              <p className="text-sm text-muted">Tap to read or add to today's entry.</p>
            </div>
          </Link>
        )}

        {quote && (
          <figure className="card px-6 py-8 text-center">
            <Eyebrow>Quote of the day</Eyebrow>
            <blockquote className="headline mt-4 text-[1.75rem] leading-[1.1] sm:text-[2rem]">“{quote.text}”</blockquote>
            <figcaption className="mt-4 text-sm font-semibold"><span className="squiggle">{quote.author}</span></figcaption>
          </figure>
        )}

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
