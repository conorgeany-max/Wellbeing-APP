import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteEntry, saveEntry, useEntry, useStrengths } from '../db/repo';
import { formatLong, today } from '../lib/date';
import { SUGGESTED_TAGS } from '../data/tags';
import { Chip, Eyebrow, Page } from '../components/ui';
import { ScalePicker } from '../components/MoodFace';

export default function JournalEntry() {
  const { date = today() } = useParams();
  const navigate = useNavigate();
  const entry = useEntry(date);
  const strengths = useStrengths();
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [text, setText] = useState('');
  const [reflection, setReflection] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !entry) return;
    loaded.current = true;
    setMood(entry.mood); setEnergy(entry.energy); setSleep(entry.sleepHours);
    setText(entry.text); setReflection(entry.reflection); setTags(entry.tags); setUsed(entry.strengthsUsed);
  }, [entry]);

  const toggle = (list: string[], v: string, max = Infinity) =>
    list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v];

  const save = async () => {
    await saveEntry({ date, mood, energy, sleepHours: sleep, text: text.trim(), reflection: reflection.trim(), tags, strengthsUsed: used });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const remove = async () => {
    if (!entry || !confirm('Delete this entry? This cannot be undone.')) return;
    await deleteEntry(entry.id);
    navigate('/journal');
  };

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag('');
  };

  return (
    <Page eyebrow={entry ? 'Journal entry' : 'New entry'} title={formatLong(date)} action={<Link to="/journal" className="btn-ghost px-3 py-2">← All</Link>}>
      <div className="space-y-5">
        <section className="card space-y-5 p-5">
          <div><Eyebrow className="mb-2">Mood</Eyebrow><ScalePicker kind="mood" value={mood} onChange={setMood} /></div>
          <div><Eyebrow className="mb-2">Energy</Eyebrow><ScalePicker kind="energy" value={energy} onChange={setEnergy} /></div>
          <label className="flex items-center justify-between gap-3">
            <Eyebrow>Sleep (hours)</Eyebrow>
            <input type="number" min={0} max={14} step={0.5} className="input w-24 py-2 text-right" value={sleep} onChange={(e) => setSleep(Number(e.target.value))} />
          </label>
        </section>

        <section className="card p-5">
          <Eyebrow className="mb-2">Clear</Eyebrow>
          <textarea className="input min-h-[200px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder="What's on your mind?" />
          <Eyebrow className="mb-2 mt-4">What went well</Eyebrow>
          <textarea className="input min-h-[80px]" value={reflection} onChange={(e) => setReflection(e.target.value)} />
        </section>

        <section className="card p-5">
          <Eyebrow className="mb-2">Tags</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...tags, ...SUGGESTED_TAGS])].map((t) => <Chip key={t} on={tags.includes(t)} onClick={() => setTags(toggle(tags, t))}>{t}</Chip>)}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addTag(); }}>
            <input className="input py-2" placeholder="Add your own tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
            <button className="btn-outline py-2">Add</button>
          </form>
        </section>

        <section className="card p-5">
          <Eyebrow className="mb-2">Strengths used (up to 3)</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {strengths.map((s) => (
              <Chip key={s.id} on={used.includes(s.id)} onClick={() => setUsed(toggle(used, s.id, 3))} title={s.description}>
                {s.rank <= 5 && <span className="text-sage" aria-hidden>✦</span>}{s.name}
              </Chip>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          {entry ? <button className="btn-ghost text-muted" onClick={remove}>Delete</button> : <span />}
          <button className="btn-primary min-w-[140px]" onClick={save}>{saved ? 'Saved ✓' : 'Save'}</button>
        </div>
      </div>
    </Page>
  );
}
