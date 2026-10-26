import { useMemo, useState } from 'react';
import { createHabit, setHabitDone, updateHabit, useHabitLogs, useHabits, useStrengths } from '../db/repo';
import type { Habit, HabitFrequency } from '../db/types';
import { today } from '../lib/date';
import { frequencyLabel, habitStats, indexLogs } from '../lib/habits';
import { HABIT_ICONS } from '../data/habits';
import { Empty, Eyebrow, Modal, Page } from '../components/ui';
import { Heatmap } from '../components/Heatmap';

export default function Habits() {
  const habits = useHabits(true);
  const logs = useHabitLogs();
  const strengths = useStrengths();
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const idx = useMemo(() => indexLogs(logs), [logs]);
  const date = today();

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const strengthOf = (id?: string) => strengths.find((s) => s.id === id);

  return (
    <Page eyebrow="Habits" title="Small things, often" action={<button className="btn-primary px-4 py-2" onClick={() => setEditing('new')}>New</button>}>
      {active.length === 0 && <Empty>No habits yet. Start with one tiny one.</Empty>}
      <ul className="space-y-4">
        {active.map((h) => {
          const done = idx.get(h.id) ?? new Set<string>();
          const st = habitStats(h, done);
          const isDone = done.has(date);
          const strength = strengthOf(h.strength);
          return (
            <li key={h.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>{h.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-muted">
                    {frequencyLabel(h)}
                    {h.frequency.type === 'weekly' && ` · ${st.thisWeek}/${h.frequency.times} this week`}
                    {strength && ` · builds ${strength.name}`}
                  </p>
                </div>
                <button
                  onClick={() => setHabitDone(h.id, date, !isDone)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition ${isDone ? 'border-sage bg-sage text-white' : 'border-line hover:bg-sand'}`}
                  aria-label={isDone ? `Mark ${h.name} not done today` : `Mark ${h.name} done today`}
                >
                  {isDone ? '✓' : ''}
                </button>
              </div>
              {strength && strength.rank > 19 && (
                <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-xs text-muted">Keep it small and easy to finish. {strength.useIdea}</p>
              )}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <Heatmap done={done} />
                <div className="flex gap-5 text-right">
                  <div><p className="headline text-xl">{st.current}</p><p className="text-[11px] text-muted">current {st.unit}s</p></div>
                  <div><p className="headline text-xl">{st.best}</p><p className="text-[11px] text-muted">best</p></div>
                  <div><p className="headline text-xl">{Math.round(st.consistency * 100)}%</p><p className="text-[11px] text-muted">30 days</p></div>
                </div>
              </div>
              <div className="mt-3 flex gap-3 text-sm">
                <button className="text-muted hover:text-ink" onClick={() => setEditing(h)}>Edit</button>
                <button className="text-muted hover:text-ink" onClick={() => updateHabit(h.id, { archived: true })}>Archive</button>
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 && (
        <div className="mt-8">
          <button className="eyebrow" onClick={() => setShowArchived((v) => !v)}>{showArchived ? '▾' : '▸'} Archived ({archived.length})</button>
          {showArchived && (
            <ul className="mt-3 space-y-2">
              {archived.map((h) => (
                <li key={h.id} className="card-sand flex items-center gap-3 px-4 py-3">
                  <span aria-hidden>{h.icon}</span>
                  <span className="flex-1 text-muted">{h.name}</span>
                  <button className="link text-sm" onClick={() => updateHabit(h.id, { archived: false })}>Restore</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <HabitForm habit={editing} onClose={() => setEditing(null)} strengths={strengths} />
    </Page>
  );
}

function HabitForm({ habit, onClose, strengths }: { habit: Habit | 'new' | null; onClose: () => void; strengths: { id: string; name: string; rank: number }[] }) {
  const key = habit === 'new' ? 'new' : habit?.id ?? 'none';
  return (
    <Modal open={!!habit} onClose={onClose} title={habit === 'new' ? 'New habit' : 'Edit habit'}>
      {habit && <HabitFormBody key={key} habit={habit === 'new' ? null : habit} onClose={onClose} strengths={strengths} />}
    </Modal>
  );
}

function HabitFormBody({ habit, onClose, strengths }: { habit: Habit | null; onClose: () => void; strengths: { id: string; name: string; rank: number }[] }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? '🌱');
  const [type, setType] = useState<'daily' | 'weekly'>(habit?.frequency.type ?? 'daily');
  const [times, setTimes] = useState(habit?.frequency.type === 'weekly' ? habit.frequency.times : 3);
  const [strength, setStrength] = useState(habit?.strength ?? '');

  const submit = async () => {
    if (!name.trim()) return;
    const frequency: HabitFrequency = type === 'daily' ? { type: 'daily' } : { type: 'weekly', times };
    const data = { name: name.trim(), icon, frequency, strength: strength || undefined };
    if (habit) await updateHabit(habit.id, data);
    else await createHabit(data);
    onClose();
  };

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="block">
        <Eyebrow className="mb-2">Name</Eyebrow>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stretch for 2 minutes" />
      </label>
      <div>
        <Eyebrow className="mb-2">Icon</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {HABIT_ICONS.map((i) => (
            <button type="button" key={i} onClick={() => setIcon(i)} className={`h-10 w-10 rounded-xl text-xl ${icon === i ? 'bg-sage/20 ring-2 ring-sage' : 'hover:bg-sand'}`}>{i}</button>
          ))}
        </div>
      </div>
      <div>
        <Eyebrow className="mb-2">How often</Eyebrow>
        <div className="flex items-center gap-2">
          <button type="button" className={`chip ${type === 'daily' ? 'chip-on' : ''}`} onClick={() => setType('daily')}>Daily</button>
          <button type="button" className={`chip ${type === 'weekly' ? 'chip-on' : ''}`} onClick={() => setType('weekly')}>Times per week</button>
          {type === 'weekly' && (
            <input type="number" min={1} max={7} className="input w-20 py-1.5" value={times} onChange={(e) => setTimes(Math.max(1, Math.min(7, Number(e.target.value))))} />
          )}
        </div>
      </div>
      <label className="block">
        <Eyebrow className="mb-2">Builds strength (optional)</Eyebrow>
        <select className="input" value={strength} onChange={(e) => setStrength(e.target.value)}>
          <option value="">None</option>
          {strengths.map((s) => <option key={s.id} value={s.id}>{s.rank}. {s.name}</option>)}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!name.trim()}>Save</button>
      </div>
    </form>
  );
}
