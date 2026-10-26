import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { useEntries, useHabitLogs, useHabits, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import { computeInsights, type Finding } from '../lib/insights';
import { askJournal, localProvider, remoteProvider, type AskResult } from '../lib/ask';
import { formatShort, formatLong } from '../lib/date';
import { MIN_SAMPLE, fmt1, plural } from '../lib/stats';
import { useChartTheme } from '../lib/chartTheme';
import { Card, Chip, Empty, Eyebrow, Page, SectionTitle, Stat } from '../components/ui';
import { MoodDot } from '../components/MoodFace';

const RANGES = [7, 30, 90] as const;

export default function Insights() {
  const entries = useEntries();
  const habits = useHabits();
  const logs = useHabitLogs();
  const strengths = useStrengths();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const theme = useChartTheme();
  const data = useMemo(() => computeInsights(entries, habits, logs, strengths, range), [entries, habits, logs, strengths, range]);

  if (!data.hasData) {
    return (
      <Page eyebrow="Insights" title="Patterns will appear here">
        <Empty>Check in for a few days and Steady will start to notice what helps. Or turn on sample data in <Link className="link" to="/settings">Settings</Link> to explore.</Empty>
      </Page>
    );
  }

  const axis = { stroke: theme.axis, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tooltipStyle = { contentStyle: { background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }, labelStyle: { color: theme.axis } };
  const series = data.series.map((p) => ({ ...p, label: formatShort(p.date) }));
  const loggedInRange = data.series.filter((p) => p.mood !== null).length;

  return (
    <Page eyebrow="Insights" title="What helps, what doesn't">
      <p className="-mt-3 mb-6 text-sm text-muted">
        Based on {plural(data.entryCount, 'check-in')}. Patterns only appear once there are at least {MIN_SAMPLE} days to compare, and they are observations, not advice.
      </p>
      <div className="space-y-6">
        {/* Weekly summary */}
        <Card sand>
          <Eyebrow>This week</Eyebrow>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <Stat label="Avg mood" value={fmt1(data.weekly.avgMood)} sub={Number.isFinite(data.weekly.prevAvg) ? `${fmt1(data.weekly.prevAvg)} last week` : undefined} />
            <Stat label="Check-ins" value={`${data.weekly.n}/7`} />
            <Stat label="Top habit" value={data.weekly.topHabit ? data.weekly.topHabit.habit.icon : '–'} sub={data.weekly.topHabit ? `${data.weekly.topHabit.habit.name}, ${data.weekly.topHabit.count}×` : 'None yet'} />
          </div>
          {data.weekly.highlight && (
            <p className="mt-4 border-t border-line pt-3 font-serif italic">“{data.weekly.highlight.text}” <span className="not-italic text-xs text-muted">, {formatShort(data.weekly.highlight.date)}</span></p>
          )}
        </Card>

        {/* Mood & energy over time */}
        <Card>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <SectionTitle title="Mood and energy" hint={`${loggedInRange} check-ins in the last ${range} days`} />
            <div className="flex gap-1.5">{RANGES.map((r) => <Chip key={r} on={range === r} onClick={() => setRange(r)}>{r}d</Chip>)}</div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={24} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: theme.axis }} />
                <Line name="Mood" dataKey="mood" stroke={theme.mood} strokeWidth={2} dot={range <= 30 ? { r: 3, strokeWidth: 0, fill: theme.mood } : false} activeDot={{ r: 5 }} connectNulls />
                <Line name="Energy" dataKey="energy" stroke={theme.energy} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* What works / what doesn't */}
        <div className="grid gap-6 md:grid-cols-2">
          <FindingList title="What seems to help" eyebrow="Linked with higher mood" items={data.works} tone="good" empty="Nothing clear yet. Keep checking in and ticking habits." />
          <FindingList title="What seems to weigh on you" eyebrow="Linked with lower mood" items={data.doesnt} tone="low" empty="No clear drags on your mood so far." />
        </div>

        {/* Strengths */}
        <Card>
          <SectionTitle eyebrow="Strengths and mood" title="Your strengths in action" />
          {data.strengths.neglected.length > 0 && (
            <ul className="mb-4 space-y-2">
              {data.strengths.neglected.slice(0, 3).map((n) => (
                <li key={n.strength.id} className="rounded-xl bg-lavender/15 px-4 py-3 text-sm">
                  {n.daysSince === null ? `You haven't logged ${n.strength.name} yet.` : `You haven't logged ${n.strength.name} in ${n.daysSince} days.`}
                  {n.nWith >= MIN_SAMPLE && ` On days you do, your mood averages ${fmt1(n.avgWith)}.`}
                  <span className="mt-1 block text-xs text-muted">Idea: {n.strength.useIdea}</span>
                </li>
              ))}
            </ul>
          )}
          <Eyebrow className="mb-2">Most used, last 30 days</Eyebrow>
          <ul className="space-y-2">
            {data.strengths.usage.filter((u) => u.count30 > 0).slice(0, 6).map((u) => (
              <li key={u.strength.id} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate">{u.strength.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line/60">
                  <span className="block h-full rounded-full" style={{ width: `${(u.count30 / 30) * 100}%`, background: theme.energy }} />
                </span>
                <span className="w-24 text-right text-xs text-muted">{plural(u.count30, 'day')}{u.nWith >= MIN_SAMPLE ? ` · ${fmt1(u.avgWith)}` : ''}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Number after the dot: average mood on days you used it (shown from {MIN_SAMPLE} days).</p>
        </Card>

        {/* Sleep vs mood */}
        <Card>
          <SectionTitle title="Sleep and mood" hint={sleepSentence(data.sleep)} />
          <div className="h-56">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} />
                <XAxis type="number" dataKey="sleep" name="Sleep" unit="h" domain={['dataMin - 0.5', 'dataMax + 0.5']} {...axis} />
                <YAxis type="number" dataKey="mood" name="Mood" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
                <ZAxis range={[70, 70]} />
                <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={data.sleep.points} fill={theme.mood} fillOpacity={0.7} stroke={theme.surface} strokeWidth={2} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Day of week */}
        <Card>
          <SectionTitle
            title="Your week"
            hint={data.bestDay && data.hardestDay
              ? `${data.bestDay.day}s tend to be your best days (avg ${fmt1(data.bestDay.avg)}, ${data.bestDay.n} days). ${data.hardestDay.day}s tend to be hardest (avg ${fmt1(data.hardestDay.avg)}, ${data.hardestDay.n} days).`
              : 'Need a few more weeks to compare days.'}
          />
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={data.weekdays.map((w) => ({ ...w, short: w.day.slice(0, 3), avg: Number.isFinite(w.avg) ? Number(w.avg.toFixed(2)) : 0 }))} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="short" {...axis} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
                <Tooltip {...tooltipStyle} cursor={{ fill: theme.grid, opacity: 0.4 }} formatter={(v: number, _n, p) => [`${v} (${p.payload.n} days)`, 'Avg mood']} />
                <Bar dataKey="avg" fill={theme.mood} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Habit consistency */}
        <Card>
          <SectionTitle title="Habit consistency" hint="Last 30 days. Any progress counts." />
          <ul className="divide-y divide-line/60">
            {data.habits.map(({ habit, stats }) => (
              <li key={habit.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span aria-hidden>{habit.icon}</span>
                <span className="flex-1 truncate">{habit.name}</span>
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line/60 sm:w-32">
                  <span className="block h-full rounded-full" style={{ width: `${stats.consistency * 100}%`, background: theme.mood }} />
                </span>
                <span className="w-10 text-right">{Math.round(stats.consistency * 100)}%</span>
                <span className="hidden w-28 text-right text-xs text-muted sm:block">{stats.current} now · {stats.best} best {stats.unit}s</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Words */}
        <Card>
          <SectionTitle title="Words and tags" hint={`Good days are mood 4-5 (${data.words.nGood}), low days are mood 1-2 (${data.words.nLow}).`} />
          <div className="grid gap-5 sm:grid-cols-2">
            <WordColumn title="On good days" words={data.words.good} tags={data.words.goodTags} n={data.words.nGood} />
            <WordColumn title="On low days" words={data.words.low} tags={data.words.lowTags} n={data.words.nLow} />
          </div>
        </Card>

        <AskJournal />

        <p className="text-center text-xs text-muted">These are patterns in your own notes, not medical advice. Correlation isn't cause.</p>
      </div>
    </Page>
  );
}

function sleepSentence(s: { r: number; shortAvg: number; longAvg: number; nShort: number; nLong: number }) {
  if (s.nShort >= MIN_SAMPLE && s.nLong >= MIN_SAMPLE) {
    const diff = s.longAvg - s.shortAvg;
    if (Math.abs(diff) >= 0.3)
      return `After 7+ hours your mood averaged ${fmt1(s.longAvg)} (${s.nLong} days), vs ${fmt1(s.shortAvg)} after less (${s.nShort} days).`;
    return `Your mood looks similar whether you sleep more or less than 7 hours (${s.nLong} vs ${s.nShort} days).`;
  }
  return `Need at least ${MIN_SAMPLE} nights on each side of 7 hours to compare.`;
}

function FindingList({ title, eyebrow, items, tone, empty }: { title: string; eyebrow: string; items: Finding[]; tone: 'good' | 'low'; empty: string }) {
  return (
    <Card>
      <SectionTitle eyebrow={eyebrow} title={title} />
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 6).map((f) => (
            <li key={f.id} className="flex gap-3 text-sm">
              <span className={`mt-0.5 flex h-7 min-w-[3rem] items-center justify-center rounded-full px-2 text-xs font-semibold ${tone === 'good' ? 'bg-sage/15 text-sage' : 'bg-lavender/20 text-ink'}`}>
                {f.diff > 0 ? '+' : '−'}{fmt1(Math.abs(f.diff))}
              </span>
              <span>
                <span className="font-medium">{f.icon ? `${f.icon} ` : ''}{f.label}</span>
                <span className="block text-muted">{f.sentence}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function WordColumn({ title, words, tags, n }: { title: string; words: { word: string; count: number }[]; tags: [string, number][]; n: number }) {
  return (
    <div>
      <Eyebrow className="mb-2">{title}</Eyebrow>
      {n < 2 ? (
        <p className="text-sm text-muted">Not enough days yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(([t, c]) => <span key={`t-${t}`} className="rounded-full bg-sand px-2.5 py-1 text-xs">#{t} <span className="text-muted">{c}</span></span>)}
          {words.map((w) => <span key={w.word} className="rounded-full border border-line px-2.5 py-1 text-xs">{w.word} <span className="text-muted">{w.count}</span></span>)}
          {tags.length + words.length === 0 && <p className="text-sm text-muted">No repeated words yet.</p>}
        </div>
      )}
    </div>
  );
}

function AskJournal() {
  const entries = useEntries();
  const { askEndpoint } = useSettings();
  const [q, setQ] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true); setError('');
    try {
      const provider = askEndpoint ? remoteProvider(askEndpoint) : localProvider;
      setResult(await askJournal(question, entries, provider));
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Something went wrong'}. Showing keyword results instead.`);
      setResult(await askJournal(question, entries, localProvider));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle eyebrow="Ask my journal" title="Look back" hint="Ask a question or type a word. It searches your entries and summarises the pattern." />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input className="input" placeholder="When did I feel anxious?" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" disabled={busy || !q.trim()}>{busy ? '…' : 'Ask'}</button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['When did I feel anxious?', 'sleep', 'friends', 'work'].map((s) => (
          <button key={s} className="text-xs text-muted underline-offset-4 hover:underline" onClick={() => { setQ(s); void ask(s); }}>{s}</button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-muted">{error}</p>}
      {result && (
        <div className="mt-4 space-y-3">
          <div className="card-sand space-y-1 p-4 text-sm">
            {result.summary.map((s, i) => <p key={i}>{s}</p>)}
            {result.terms.length > 1 && <p className="text-xs text-muted">Also matched: {result.terms.slice(1, 8).join(', ')}</p>}
          </div>
          <ul className="space-y-2">
            {result.matches.slice(0, 8).map((e) => (
              <li key={e.id}>
                <Link to={`/journal/${e.date}`} className="flex gap-3 rounded-xl px-2 py-2 text-sm hover:bg-sand">
                  <MoodDot mood={e.mood} />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">{formatLong(e.date)}</span>
                    <span className="line-clamp-2">{e.text || e.reflection}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {result.matches.length > 8 && <p className="text-xs text-muted">And {result.matches.length - 8} more in the Journal.</p>}
        </div>
      )}
    </Card>
  );
}

