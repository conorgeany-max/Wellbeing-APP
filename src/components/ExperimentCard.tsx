import type { Entry, HabitLog } from '../db/types';
import { setHabitDone } from '../db/repo';
import {
  closeExperiment, experimentHowTo, experimentProgress, experimentResult, experimentTitle, startExperiment, stopExperiment, type Experiment,
} from '../lib/experiments';
import { formatShort, today } from '../lib/date';
import type { Finding } from '../lib/insights';
import { Eyebrow } from './ui';

/** The current 7-day experiment: progress while it runs, a plain read-out when it ends. */
export function ExperimentCard({ x, entries, logs }: { x: Experiment; entries: Entry[]; logs: HabitLog[] }) {
  const p = experimentProgress(x, entries, logs);
  const title = `${x.icon ? `${x.icon} ` : ''}${experimentTitle(x)}`;

  if (p.finished) {
    const r = experimentResult(x, entries, logs);
    return (
      <section className="card-tint p-5">
        <Eyebrow>Your 7-day experiment · results</Eyebrow>
        <p className="headline mt-2 text-2xl leading-tight">{title}</p>
        <Dots marks={p.marks} />
        <p className="mt-3 font-medium">{r.headline}</p>
        <p className="mt-1 text-sm text-muted">{r.detail}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary px-4 py-2" onClick={() => closeExperiment(x.id)}>Got it</button>
          <button
            className="btn-outline px-4 py-2"
            onClick={() => startExperiment({ id: `${x.kind}-${x.ref}`, kind: x.kind, label: x.label, icon: x.icon, diff: 0, n: 0, sentence: '' }, entries)}
          >
            Try another week
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card-tint p-5">
      <Eyebrow>Your 7-day experiment · day {p.day} of {x.days}</Eyebrow>
      <p className="headline mt-2 text-2xl leading-tight">{title}</p>
      <Dots marks={p.marks} />
      <p className="mt-3 text-sm text-muted">
        {p.doneCount === 0 ? 'Not yet this week.' : `Done on ${p.doneCount} ${p.doneCount === 1 ? 'day' : 'days'} so far.`} {experimentHowTo(x)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {x.kind === 'habit' && (
          <button
            className={p.doneToday ? 'btn-outline px-4 py-2' : 'btn-primary px-4 py-2'}
            aria-pressed={p.doneToday}
            onClick={() => setHabitDone(x.ref, today(), !p.doneToday)}
          >
            {p.doneToday ? '✓ Done today' : 'Done today'}
          </button>
        )}
        <button className="link text-sm text-muted" onClick={() => stopExperiment(x.id)}>End early</button>
      </div>
    </section>
  );
}

function Dots({ marks }: { marks: { date: string; state: 'done' | 'missed' | 'future' }[] }) {
  return (
    <ol className="mt-3 flex gap-2" aria-label="Days of the experiment">
      {marks.map((m) => (
        <li
          key={m.date}
          title={`${formatShort(m.date)}: ${m.state === 'done' ? 'done' : m.state === 'missed' ? 'not done' : 'to come'}`}
          className={`h-3.5 flex-1 rounded-full ${m.state === 'done' ? 'bg-accent' : m.state === 'missed' ? 'border-2 border-line' : 'bg-line/50'}`}
        />
      ))}
    </ol>
  );
}

/** Small "Try it for 7 days" button for a finding in Insights. */
export function TryButton({ f, entries, active }: { f: Finding; entries: Entry[]; active?: Experiment }) {
  const running = active && `${active.kind}-${active.ref}` === f.id;
  if (running) return <span className="mt-1 inline-block text-xs font-semibold text-accent">Trying this now</span>;
  return (
    <button
      className="link mt-1 text-xs font-semibold"
      onClick={() => {
        if (active && !window.confirm(`You're already trying “${experimentTitle(active)}”. Stop that and try this instead?`)) return;
        startExperiment(f, entries);
      }}
    >
      Try it for 7 days
    </button>
  );
}
