import { useState } from 'react';
import { addQuote, deleteQuote, toggleFavourite, useQuotes, useStrengths } from '../db/repo';
import { useSettings } from '../db/settings';
import type { Quote } from '../db/types';
import { activeStrengthOfWeek, quoteOfDay } from '../lib/daily';
import { today } from '../lib/date';
import { Chip, Empty, Eyebrow, Modal, Page } from '../components/ui';

type Filter = 'all' | 'favourites' | 'mine';

export default function Quotes() {
  const quotes = useQuotes();
  const strengths = useStrengths();
  const settings = useSettings();
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const qod = quoteOfDay(quotes, today(), activeStrengthOfWeek(settings.strengthOfWeek, today()));
  const strengthName = (id?: string) => strengths.find((s) => s.id === id)?.name;

  const list = quotes
    .filter((q) => (filter === 'favourites' ? q.favourite : filter === 'mine' ? q.custom : true))
    .sort((a, b) => Number(b.custom) - Number(a.custom) || a.author.localeCompare(b.author));

  return (
    <Page eyebrow="Quotes" title="Words to steady you" action={<button className="btn-primary px-4 py-2" onClick={() => setAdding(true)}>Add</button>}>
      {qod && (
        <figure className="card-sand mb-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <Eyebrow>Quote of the day</Eyebrow>
            <Heart q={qod} />
          </div>
          <blockquote className="headline mt-3 text-2xl leading-snug">“{qod.text}”</blockquote>
          <figcaption className="mt-3 text-sm text-muted">{qod.author}{strengthName(qod.strength) && ` · ${strengthName(qod.strength)}`}</figcaption>
        </figure>
      )}
      <div className="mb-4 flex gap-2">
        {(['all', 'favourites', 'mine'] as Filter[]).map((f) => (
          <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? `All (${quotes.length})` : f === 'favourites' ? 'Favourites' : 'My quotes'}</Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty>{filter === 'mine' ? 'Add a quote that means something to you.' : 'Tap the heart on a quote to keep it here.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {list.map((q) => (
            <li key={q.id} className="card flex gap-3 p-4">
              <div className="flex-1">
                <p className="font-serif leading-snug">“{q.text}”</p>
                <p className="mt-1 text-xs text-muted">{q.author}{strengthName(q.strength) && ` · ${strengthName(q.strength)}`}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Heart q={q} />
                {q.custom && <button className="text-xs text-muted hover:text-ink" onClick={() => confirm('Delete this quote?') && deleteQuote(q.id)}>Delete</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a quote">
        <AddQuote strengths={strengths} onDone={() => { setAdding(false); setFilter('mine'); }} />
      </Modal>
    </Page>
  );
}

function Heart({ q }: { q: Quote }) {
  return (
    <button onClick={() => toggleFavourite(q)} className={`text-xl transition ${q.favourite ? 'text-lavender' : 'text-line hover:text-muted'}`} aria-label={q.favourite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={q.favourite}>
      {q.favourite ? '♥' : '♡'}
    </button>
  );
}

function AddQuote({ strengths, onDone }: { strengths: { id: string; name: string }[]; onDone: () => void }) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [strength, setStrength] = useState('');
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; await addQuote(text.trim(), author.trim(), strength || undefined); onDone(); }}>
      <textarea className="input min-h-[100px]" autoFocus placeholder="The quote" value={text} onChange={(e) => setText(e.target.value)} />
      <input className="input" placeholder="Who said it? (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
      <select className="input" value={strength} onChange={(e) => setStrength(e.target.value)}>
        <option value="">Link to a strength (optional)</option>
        {strengths.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="flex justify-end"><button className="btn-primary" disabled={!text.trim()}>Save quote</button></div>
    </form>
  );
}
