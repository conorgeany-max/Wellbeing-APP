import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEntries, useHabitLogs, useHabits, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import type { Entry } from '../db/types';
import { fromISO, toISO, today } from '../lib/date';
import { computeInsights } from '../lib/insights';
import { indexLogs } from '../lib/habits';
import { forClaude } from '../lib/ask';
import { api } from '../lib/cloud';
import { MIN_SAMPLE, fmt1, mean, plural } from '../lib/stats';
import { Card, Empty, Page, SectionTitle, Stat } from '../components/ui';
import { MoodDot, moodColor } from '../components/MoodFace';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Days of a 'YYYY-MM' month as ISO dates. */
function monthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => toISO(new Date(y, m - 1, i + 1)));
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

/** Early in a month, the report most worth reading is last month's. */
function defaultMonth() {
  const now = new Date();
  return now.getDate() <= 5 ? shiftMonth(monthKey(now), -1) : monthKey(now);
}

const CACHE = 'steady:report:';
const readCache = (month: string): string[] | null => {
  try { return JSON.parse(localStorage.getItem(CACHE + month) ?? 'null'); } catch { return null; }
};

export default function Report() {
  const { month = defaultMonth() } = useParams();
  const navigate = useNavigate();
  const all = useEntries();
  const habits = useHabits();
  const logs = useHabitLogs();
  const strengths = useStrengths();
  const settings = useSettings();

  const days = useMemo(() => monthDays(month), [month]);
  const end = days[days.length - 1] < today() ? days[days.length - 1] : today();
  const entries = useMemo(() => all.filter((e) => e.date.startsWith(month)), [all, month]);
  const prev = useMemo(() => all.filter((e) => e.date.startsWith(shiftMonth(month, -1))), [all, month]);
  const monthLogs = useMemo(() => logs.filter((l) => l.date.startsWith(month)), [logs, month]);
  const data = useMemo(() => computeInsights(entries, habits, monthLogs, strengths, days.length, end), [entries, habits, monthLogs, strengths, days.length, end]);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const label = fromISO(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const elapsed = days.filter((d) => d <= end).length;

  // Weeks (Mon-Sun) inside the month with at least 3 check-ins
  const weeks = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const e of entries) {
      const d = fromISO(e.date);
      const monday = toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
      groups.set(monday, [...(groups.get(monday) ?? []), e]);
    }
    return [...groups.entries()].filter(([, es]) => es.length >= 3).map(([start, es]) => ({ start, avg: mean(es.map((e) => e.mood)), n: es.length })).sort((a, b) => b.avg - a.avg);
  }, [entries]);

  const done = indexLogs(monthLogs);
  const habitRows = habits
    .map((h) => {
      const n = done.get(h.id)?.size ?? 0;
      const target = h.frequency.type === 'daily' ? elapsed : Math.round((h.frequency.times * elapsed) / 7);
      return { habit: h, n, rate: target ? Math.min(1, n / target) : 0 };
    })
    .sort((a, b) => b.rate - a.rate);

  const moments = [...entries].filter((e) => e.reflection).sort((a, b) => b.mood - a.mood || b.date.localeCompare(a.date)).slice(0, 3);
  const signatureUnused = strengths.slice(0, 5).filter((s) => !entries.some((e) => e.strengthsUsed.includes(s.id)));

  // Claude-written reflection (hosted app only)
  const [written, setWritten] = useState<string[] | null>(() => readCache(month));
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const [shownFor, setShownFor] = useState(month);
  if (shownFor !== month) { setShownFor(month); setWritten(readCache(month)); setError(''); }
  const canWrite = settings.useClaude && !!settings.accessCode && entries.length > 0;

  const write = async () => {
    setWriting(true); setError('');
    try {
      const stats = {
        month: label, checkIns: entries.length, daysInMonth: elapsed,
        avgMood: fmt1(data.avgMood), prevMonthAvgMood: prev.length ? fmt1(mean(prev.map((e) => e.mood))) : null,
        helped: data.works.slice(0, 5).map((f) => f.sentence), weighed: data.doesnt.slice(0, 5).map((f) => f.sentence),
        habits: habitRows.map((r) => `${r.habit.name}: ${Math.round(r.rate * 100)}%`),
        strengthsUsed: data.strengths.usage.filter((u) => u.count30 > 0).map((u) => `${u.strength.name}: ${u.count30} days`),
      };
      const res = await api<{ summary: string[] }>('ask', { method: 'POST', body: JSON.stringify({ mode: 'report', entries: forClaude(entries, 31), stats }) });
      setWritten(res.summary);
      try { localStorage.setItem(CACHE + month, JSON.stringify(res.summary)); } catch { /* storage unavailable */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not write the reflection.');
    } finally {
      setWriting(false);
    }
  };

  const isFuture = month > monthKey(new Date());
  const prevAvg = mean(prev.map((e) => e.mood));

  return (
    <Page
      wide
      eyebrow="Monthly reflection"
      title={label}
      action={
        <div className="flex gap-1">
          <button className="btn-outline px-3 py-2" onClick={() => navigate(`/report/${shiftMonth(month, -1)}`)} aria-label="Previous month">←</button>
          <button className="btn-outline px-3 py-2" onClick={() => navigate(`/report/${shiftMonth(month, 1)}`)} disabled={shiftMonth(month, 1) > monthKey(new Date())} aria-label="Next month">→</button>
        </div>
      }
    >
      {entries.length === 0 || isFuture ? (
        <Empty>No check-ins in {label} yet. <Link to="/insights" className="link">Back to Insights</Link></Empty>
      ) : (
        <div className="space-y-6">
          <Card tint>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Check-ins" value={`${entries.length}/${elapsed}`} sub="days" />
              <Stat label="Avg mood" value={fmt1(data.avgMood)} sub={Number.isFinite(prevAvg) ? `${data.avgMood >= prevAvg ? '↑' : '↓'} from ${fmt1(prevAvg)}` : 'first month'} />
              <Stat label="Avg energy" value={fmt1(data.avgEnergy)} />
              <Stat label="Avg sleep" value={`${fmt1(mean(entries.map((e) => e.sleepHours)))}h`} />
            </div>
          </Card>

          {(canWrite || written) && (
            <Card>
              <SectionTitle eyebrow="In words" title="Your month, reflected" hint={written ? 'Written by Claude from your check-ins.' : 'Claude reads this month’s check-ins and writes a short reflection.'} />
              {written ? (
                <div className="space-y-3 font-serif leading-relaxed">{written.map((p, i) => <p key={i}>{p}</p>)}</div>
              ) : null}
              {canWrite && (
                <button className={`${written ? 'btn-ghost mt-3 text-muted' : 'btn-primary'}`} onClick={write} disabled={writing}>
                  {writing ? 'Writing…' : written ? 'Write it again' : 'Write my reflection'}
                </button>
              )}
              {error && <p className="mt-2 text-sm text-muted">{error}</p>}
            </Card>
          )}

          <Card>
            <SectionTitle title="Mood through the month" />
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
              {Array.from({ length: (fromISO(days[0]).getDay() + 6) % 7 }, (_, i) => <span key={`pad-${i}`} />)}
              {days.map((d) => {
                const e = byDate.get(d);
                return (
                  <Link
                    key={d}
                    to={e ? `/journal/${d}` : '#'}
                    onClick={(ev) => !e && ev.preventDefault()}
                    title={e ? `${d}: mood ${e.mood}` : d}
                    className="flex aspect-square items-center justify-center rounded-lg text-xs"
                    style={{ background: e ? moodColor(e.mood) : 'rgb(var(--line) / 0.5)', color: e ? '#111111' : undefined }}
                  >
                    {fromISO(d).getDate()}
                  </Link>
                );
              })}
            </div>
            {weeks.length >= 2 && (
              <p className="mt-4 text-sm text-muted">
                Your best week started {fromISO(weeks[0].start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (avg {fmt1(weeks[0].avg)}). The hardest started {fromISO(weeks[weeks.length - 1].start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (avg {fmt1(weeks[weeks.length - 1].avg)}).
              </p>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <SectionTitle eyebrow="Linked with higher mood" title="What helped" />
              {data.works.length ? (
                <ul className="space-y-2 text-sm">{data.works.slice(0, 4).map((f) => <li key={f.id}>{f.sentence}</li>)}</ul>
              ) : <p className="text-sm text-muted">Not enough days to compare yet (patterns need {MIN_SAMPLE} days each way).</p>}
            </Card>
            <Card>
              <SectionTitle eyebrow="Linked with lower mood" title="What weighed on you" />
              {data.doesnt.length ? (
                <ul className="space-y-2 text-sm">{data.doesnt.slice(0, 4).map((f) => <li key={f.id}>{f.sentence}</li>)}</ul>
              ) : <p className="text-sm text-muted">Nothing stood out this month.</p>}
            </Card>
          </div>

          <Card>
            <SectionTitle title="Habits" hint="Share of days (or weekly target) you kept each habit. Any progress counts." />
            <ul className="divide-y divide-line/60 text-sm">
              {habitRows.map(({ habit, n, rate }) => (
                <li key={habit.id} className="flex items-center gap-3 py-2">
                  <span aria-hidden>{habit.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{habit.name}</span>
                  <span className="text-xs text-muted">{plural(n, 'day')}</span>
                  <span className="w-10 text-right">{Math.round(rate * 100)}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle title="Strengths in action" />
            <div className="flex flex-wrap gap-2">
              {data.strengths.usage.filter((u) => u.count30 > 0).slice(0, 8).map((u) => (
                <span key={u.strength.id} className="rounded-full bg-pop/20 px-3 py-1 text-sm">✦ {u.strength.name} <span className="text-muted">{u.count30}</span></span>
              ))}
            </div>
            {signatureUnused.length > 0 && (
              <p className="mt-3 text-sm text-muted">Not logged this month: {signatureUnused.map((s) => s.name).join(', ')}. They’ll come round in your daily prompt on Today.</p>
            )}
          </Card>

          {moments.length > 0 && (
            <Card tint>
              <SectionTitle title="Good moments" />
              <ul className="space-y-3">
                {moments.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <MoodDot mood={e.mood} />
                    <p className="font-serif">“{e.reflection}” <span className="font-sans text-xs text-muted">{fromISO(e.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.words.good.length > 0 && (
            <Card>
              <SectionTitle title="Words from your good days" />
              <div className="flex flex-wrap gap-1.5">
                {data.words.good.map((w) => <span key={w.word} className="rounded-full border border-line px-2.5 py-1 text-xs">{w.word} <span className="text-muted">{w.count}</span></span>)}
              </div>
            </Card>
          )}
          <p className="text-center text-xs text-muted">Observations from your own notes, not medical advice. {end === today() ? 'This month is still in progress.' : ''}</p>
        </div>
      )}
    </Page>
  );
}
