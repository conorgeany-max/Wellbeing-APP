import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { saveEntry, setHabitsForDate, useEntry, useHabitLogs, useHabits, useQuotes, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import { activeStrengthOfWeek, journalPrompt, lowMoodAction, quoteOfDay, reflectPrompt } from '../lib/daily';
import { today } from '../lib/date';
import { frequencyLabel } from '../lib/habits';
import { SUGGESTED_TAGS } from '../data/tags';
import { Chip, Eyebrow } from '../components/ui';
import { ScalePicker } from '../components/MoodFace';
import { SupportLink } from '../components/Support';

const STEPS = ['Check in', 'Clear', 'Habits', 'Reflect'];

export default function CheckIn() {
  const date = today();
  const navigate = useNavigate();
  const existing = useEntry(date);
  const habits = useHabits();
  const logs = useHabitLogs();
  const quotes = useQuotes();
  const strengths = useStrengths();
  const settings = useSettings();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [reflection, setReflection] = useState('');
  const [used, setUsed] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [finished, setFinished] = useState(false);
  const loaded = useRef(false);

  // Editing today's check-in again: start from what's saved.
  useEffect(() => {
    if (loaded.current || existing === undefined) return;
    loaded.current = true;
    setMood(existing.mood); setEnergy(existing.energy); setSleep(existing.sleepHours);
    setText(existing.text); setTags(existing.tags); setReflection(existing.reflection); setUsed(existing.strengthsUsed);
  }, [existing]);
  const savedToday = logs.filter((l) => l.date === date).map((l) => l.habitId).join(',');
  useEffect(() => {
    setDone(new Set(savedToday ? savedToday.split(',') : []));
  }, [savedToday]);

  const focusId = activeStrengthOfWeek(settings.strengthOfWeek, date);
  const quote = quoteOfDay(quotes, date, focusId);
  const prompt = journalPrompt(strengths, date);
  const low = lowMoodAction(strengths, date);
  const shownStrengths = useMemo(() => (showAll ? strengths : strengths.slice(0, 5)), [showAll, strengths]);

  const go = (delta: number) => {
    const next = step + delta;
    if (next < 0 || next >= STEPS.length) return;
    if (delta > 0 && step === 0 && !mood) return;
    setDir(delta);
    setStep(next);
  };

  const finish = async () => {
    await saveEntry({ date, mood, energy, sleepHours: sleep, text: text.trim(), reflection: reflection.trim(), tags, strengthsUsed: used });
    await setHabitsForDate(date, done, habits);
    setFinished(true);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) step === STEPS.length - 1 ? void finish() : go(1);
    else if (info.offset.x > 80) go(-1);
  };

  const toggle = <T,>(list: T[], v: T, max = Infinity) =>
    list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v];

  if (finished) {
    return (
      <Shell onClose={() => navigate('/')}>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col justify-center gap-6 text-center">
          <p className="headline text-6xl text-accent">✓</p>
          <h1 className="headline text-3xl">Thank you for checking in.</h1>
          <p className="text-muted">That's three quiet minutes for you. See you tomorrow, or whenever you're ready.</p>
          {mood <= 2 && low && (
            <div className="card-tint mx-auto max-w-sm p-5 text-left">
              <Eyebrow>One small thing · {low.strength.name}</Eyebrow>
              <p className="mt-2">{low.action}</p>
              <p className="mt-2 text-sm text-muted">Low days happen. Be gentle with yourself.</p>
              <SupportLink className="mt-3" />
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Link to="/" className="btn-primary">Back to today</Link>
            <Link to="/insights" className="btn-outline">See insights</Link>
          </div>
        </motion.div>
      </Shell>
    );
  }

  let body: ReactNode;
  if (step === 0) {
    body = (
      <StepCard n={1} title="How are you, really?" helper="No right answers. Just notice.">
        <div className="space-y-6">
          <Field label="Mood"><ScalePicker kind="mood" value={mood} onChange={setMood} /></Field>
          <Field label="Energy"><ScalePicker kind="energy" value={energy} onChange={setEnergy} /></Field>
          <Field label="Sleep last night">
            <div className="flex items-center justify-center gap-6">
              <button type="button" className="btn-outline h-12 w-12 p-0 text-xl" onClick={() => setSleep((s) => Math.max(0, s - 0.5))} aria-label="Less sleep">−</button>
              <p className="headline w-28 text-center text-4xl">{sleep}<span className="text-lg text-muted">h</span></p>
              <button type="button" className="btn-outline h-12 w-12 p-0 text-xl" onClick={() => setSleep((s) => Math.min(14, s + 0.5))} aria-label="More sleep">+</button>
            </div>
          </Field>
          {mood > 0 && mood <= 2 && (
            <p className="text-center text-sm text-muted">Sorry today is hard. <SupportLink /></p>
          )}
        </div>
      </StepCard>
    );
  } else if (step === 1) {
    body = (
      <StepCard n={2} title="Clear your head." helper="Brain dump. No pressure, no editing.">
        <textarea
          autoFocus
          className="input min-h-[40vh] text-base leading-relaxed"
          placeholder={prompt.prompt}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-4">
          <Eyebrow className="mb-2">Tags (optional)</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...SUGGESTED_TAGS, ...tags])].map((t) => (
              <Chip key={t} on={tags.includes(t)} onClick={() => setTags(toggle(tags, t))}>{t}</Chip>
            ))}
          </div>
        </div>
      </StepCard>
    );
  } else if (step === 2) {
    body = (
      <StepCard n={3} title="Today's habits." helper="Tick what you did. Anything counts.">
        <ul className="space-y-2">
          {habits.map((h) => {
            const on = done.has(h.id);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setDone((d) => { const n = new Set(d); if (on) n.delete(h.id); else n.add(h.id); return n; })}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-accent bg-accent/15' : 'border-line hover:bg-tint'}`}
                >
                  <span className="text-xl" aria-hidden>{h.icon}</span>
                  <span className="flex-1">{h.name}<span className="block text-xs text-muted">{frequencyLabel(h)}</span></span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${on ? 'border-accent bg-accent text-white' : 'border-line'}`}>{on ? '✓' : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </StepCard>
    );
  } else {
    body = (
      <StepCard n={4} title="Reflect." helper="One good thing, and the strengths you used.">
        {quote && (
          <blockquote className="card-tint mb-5 p-5">
            <p className="headline text-lg leading-snug">“{quote.text}”</p>
            <footer className="mt-2 text-sm text-muted">{quote.author}</footer>
          </blockquote>
        )}
        <label className="mb-2 block text-sm font-medium">{reflectPrompt(date)}</label>
        <textarea className="input min-h-[96px]" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Something small is fine." />
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">Which strengths did I use today? <span className="text-muted">(1-3)</span></p>
          <div className="flex flex-wrap gap-2">
            {shownStrengths.map((s) => (
              <Chip key={s.id} on={used.includes(s.id)} onClick={() => setUsed(toggle(used, s.id, 3))} title={s.description}>
                {s.rank <= 5 && <span className={used.includes(s.id) ? '' : 'text-accent'} aria-hidden>✦</span>}
                {s.name}
              </Chip>
            ))}
            <button type="button" className="chip text-muted" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Fewer' : 'All 24'}</button>
          </div>
        </div>
      </StepCard>
    );
  }

  return (
    <Shell onClose={() => navigate('/')} step={step}>
      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            drag={step === 1 ? false : 'x'} // free-writing needs normal text selection
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
      <footer className="pb-safe sticky bottom-0 flex items-center justify-between gap-3 bg-bg/90 py-4 backdrop-blur">
        <button type="button" className="btn-ghost" onClick={() => go(-1)} disabled={step === 0}>Back</button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary min-w-[140px]" onClick={() => go(1)} disabled={step === 0 && !mood}>Next</button>
        ) : (
          <button type="button" className="btn-primary min-w-[140px]" onClick={finish}>Finish</button>
        )}
      </footer>
    </Shell>
  );
}

function Shell({ children, onClose, step }: { children: ReactNode; onClose: () => void; step?: number }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col overflow-x-hidden px-4 pt-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1.5" aria-label="Progress">
          {step !== undefined && STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-accent' : i < step ? 'w-4 bg-accent/50' : 'w-4 bg-line'}`} />
          ))}
        </div>
        <button type="button" onClick={onClose} className="btn-ghost -mr-2 h-11 w-11 px-0 py-0 text-muted" aria-label="Close check-in">✕</button>
      </div>
      {children}
    </div>
  );
}

function StepCard({ n, title, helper, children }: { n: number; title: string; helper: string; children: ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <p className="display text-7xl text-accent">{String(n).padStart(2, '0')}</p>
      <Eyebrow className="mt-3">Step {n} of {STEPS.length} · {STEPS[n - 1]}</Eyebrow>
      <h1 className="headline mt-1 text-3xl">{title}</h1>
      <p className="mb-6 mt-1 text-muted">{helper}</p>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Eyebrow className="mb-2">{label}</Eyebrow>
      {children}
    </div>
  );
}
