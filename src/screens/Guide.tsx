import { useState } from 'react';
import { Empty, Page } from '../components/ui';
import { setSetting, useSettings } from '../db/settings';
import { parseGuide, type GuideSection } from '../lib/guide';

const PLACEHOLDER = `# My guide to happiness
1. Something that reliably helps me
2. Another one

# What causes me anxiety?
- Something to watch for`;

/** Your own guide, word for word. The first section feeds Today; the rest stay folded away until you open them. */
export default function Guide() {
  const { guide } = useSettings();
  const [draft, setDraft] = useState<string | null>(null);
  const sections = parseGuide(guide);
  const editing = draft !== null;

  const save = async () => {
    await setSetting('guide', (draft ?? '').trim());
    setDraft(null);
  };

  return (
    <Page
      eyebrow="In your words"
      title="My guide"
      action={!editing && <button className="btn-outline px-4 py-2" onClick={() => setDraft(guide)}>{guide ? 'Edit' : 'Write it'}</button>}
    >
      {editing ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Start a section with <b>#</b>. Put each point on its own line. Your first section shows up on Today, one point a day.</p>
          <textarea
            className="input min-h-[60vh] font-serif text-lg leading-snug"
            value={draft}
            placeholder={PLACEHOLDER}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      ) : sections.length === 0 ? (
        <Empty>Write down what you've learned makes you feel good, in your own words. Steady will bring one back to you each day.</Empty>
      ) : (
        <div className="space-y-5">
          {sections.map((s, i) => (i === 0 ? <MainSection key={i} s={s} /> : <FoldedSection key={i} s={s} />))}
        </div>
      )}
    </Page>
  );
}

function MainSection({ s }: { s: GuideSection }) {
  return (
    <section className="card p-6 sm:p-8">
      {s.heading && <h2 className="headline mb-5 text-3xl">{s.heading}</h2>}
      <ol className="space-y-4">
        {s.items.map((it, j) => (
          <li key={j} className="flex gap-4">
            <span className="headline w-7 shrink-0 text-right text-2xl leading-none text-accent">{it.label || '·'}</span>
            <span className="leading-snug">{it.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FoldedSection({ s }: { s: GuideSection }) {
  return (
    <details className="card-tint group p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="headline text-2xl">{s.heading || 'More'}</span>
        <span className="text-sm text-muted group-open:hidden">Show</span>
        <span className="hidden text-sm text-muted group-open:inline">Hide</span>
      </summary>
      <ul className="mt-4 space-y-3">
        {s.items.map((it, j) => (
          <li key={j} className="flex gap-3">
            <span className="w-6 shrink-0 text-right text-muted">{it.label || '–'}</span>
            <span className="leading-snug">{it.text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
