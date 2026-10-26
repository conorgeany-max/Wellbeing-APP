import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEntries, useStrengths } from '../db/repo';
import { formatLong, fromISO, today } from '../lib/date';
import { Chip, Empty, Page } from '../components/ui';
import { MoodDot } from '../components/MoodFace';

export default function Journal() {
  const entries = useEntries();
  const strengths = useStrengths();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (tag && !e.tags.includes(tag)) return false;
      if (!needle) return true;
      return `${e.text} ${e.reflection} ${e.tags.join(' ')}`.toLowerCase().includes(needle);
    });
  }, [entries, q, tag]);

  const byMonth = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const key = fromISO(e.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()];
  }, [filtered]);

  const name = (id: string) => strengths.find((s) => s.id === id)?.name ?? id;
  const hasToday = entries.some((e) => e.date === today());

  return (
    <Page eyebrow="Journal" title="Your entries" action={<Link to={hasToday ? `/journal/${today()}` : '/checkin'} className="btn-primary px-4 py-2">{hasToday ? 'Today' : 'New'}</Link>}>
      <input className="input mb-3" type="search" placeholder="Search everything you've written…" value={q} onChange={(e) => setQ(e.target.value)} />
      {allTags.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {allTags.map((t) => <Chip key={t} on={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</Chip>)}
        </div>
      )}
      {filtered.length === 0 ? (
        <Empty>{entries.length ? 'Nothing matches that search.' : 'Your first check-in will appear here.'}</Empty>
      ) : (
        <div className="space-y-8">
          {byMonth.map(([month, list]) => (
            <section key={month}>
              <p className="eyebrow mb-3">{month}</p>
              <ul className="space-y-3">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link to={`/journal/${e.date}`} className="card block p-4 transition hover:-translate-y-0.5">
                      <div className="flex items-center gap-2">
                        <MoodDot mood={e.mood} />
                        <p className="text-sm font-medium">{formatLong(e.date)}</p>
                        {e.sample && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted">sample</span>}
                      </div>
                      {(e.text || e.reflection) && <p className="mt-2 line-clamp-2 text-sm text-muted">{e.text || e.reflection}</p>}
                      {(e.tags.length > 0 || e.strengthsUsed.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          {e.tags.map((t) => <span key={t} className="rounded-full bg-tint px-2 py-0.5 text-muted">{t}</span>)}
                          {e.strengthsUsed.map((s) => <span key={s} className="rounded-full bg-pop/20 px-2 py-0.5 text-muted">✦ {name(s)}</span>)}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
