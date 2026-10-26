import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEntries, useStrengths } from '../db/repo';
import { setSetting, useSettings } from '../db/settings';
import type { Strength } from '../db/types';
import { activeStrengthOfWeek, dailyChallenge } from '../lib/daily';
import { lastNDays, today, weekStart } from '../lib/date';
import { MIN_SAMPLE, fmt1, mean, plural } from '../lib/stats';
import { Card, Eyebrow, Page, SectionTitle } from '../components/ui';

export default function Strengths() {
  const strengths = useStrengths();
  const entries = useEntries();
  const settings = useSettings();
  const [open, setOpen] = useState<string | null>(null);
  const date = today();
  const focusId = activeStrengthOfWeek(settings.strengthOfWeek, date);
  const focus = strengths.find((s) => s.id === focusId);

  const stats = useMemo(() => {
    const last30 = new Set(lastNDays(30, date));
    const m = new Map<string, { count30: number; avg: number; n: number }>();
    for (const s of strengths) {
      const used = entries.filter((e) => e.strengthsUsed.includes(s.id));
      m.set(s.id, { count30: used.filter((e) => last30.has(e.date)).length, avg: mean(used.map((e) => e.mood)), n: used.length });
    }
    return m;
  }, [entries, strengths, date]);

  const pickFocus = (id: string) => setSetting('strengthOfWeek', { strengthId: id, weekStart: weekStart(date) });

  const groups: [string, string, Strength[]][] = [
    ['Signature strengths', 'Your top five: the most natural, energising parts of you.', strengths.slice(0, 5)],
    ['Middle strengths', 'Available when you need them.', strengths.slice(5, 19)],
    ['Lesser strengths', 'Not weaknesses, just less natural. Keep habits small and lean on your top strengths to support them.', strengths.slice(19)],
  ];

  return (
    <Page eyebrow="VIA Character Strengths" title="Your strengths">
      <Card sand className="mb-8">
        <Eyebrow>Strength of the week</Eyebrow>
        {focus ? (
          <>
            <p className="headline mt-1 text-2xl">{focus.name}</p>
            <p className="mt-2"><span className="text-muted">Today's tiny challenge:</span> {dailyChallenge(focus, date)}</p>
            <button className="link mt-3 text-sm" onClick={() => setSetting('strengthOfWeek', null)}>Choose another</button>
          </>
        ) : (
          <>
            <p className="mt-1 text-muted">Pick one strength to focus on this week. You'll get a tiny daily challenge and matching quotes.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {strengths.slice(0, 8).map((s) => <button key={s.id} className="chip hover:bg-card" onClick={() => pickFocus(s.id)}>{s.name}</button>)}
            </div>
          </>
        )}
      </Card>

      <SectionTitle eyebrow="Top 5" title="Signature strengths" />
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {strengths.slice(0, 5).map((s) => {
          const st = stats.get(s.id);
          return (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-baseline justify-between">
                <Eyebrow>#{s.rank} · {s.virtue}</Eyebrow>
                <span className="text-sage" aria-hidden>✦</span>
              </div>
              <h3 className="headline mt-1 text-xl">{s.name}</h3>
              <p className="mt-1 text-sm text-muted">{s.description}</p>
              <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm"><span className="eyebrow mr-1">Use it today</span> {s.useIdea}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                <div><p className="headline text-xl">{st?.count30 ?? 0}</p><p className="text-xs text-muted">days used, last 30</p></div>
                <div>
                  {st && st.n >= MIN_SAMPLE ? (
                    <><p className="headline text-xl">{fmt1(st.avg)}</p><p className="text-xs text-muted">avg mood when used ({plural(st.n, 'day')})</p></>
                  ) : (
                    <><p className="headline text-xl text-muted">–</p><p className="text-xs text-muted">mood shows after {MIN_SAMPLE} days</p></>
                  )}
                </div>
              </div>
              {focusId !== s.id && <button className="link mt-3 self-start text-xs" onClick={() => pickFocus(s.id)}>Make this my strength of the week</button>}
            </Card>
          );
        })}
      </div>

      {groups.map(([title, hint, list]) => (
        <section key={title} className="mb-8">
          <SectionTitle title={title} hint={hint} />
          <ul className="card divide-y divide-line/70">
            {list.map((s) => (
              <li key={s.id}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                  <span className="w-6 text-right text-sm text-muted">{s.rank}</span>
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted">{s.virtue}</span>
                </button>
                {open === s.id && (
                  <div className="space-y-2 px-4 pb-4 pl-[3.25rem] text-sm">
                    <p className="text-muted">{s.description}</p>
                    <p><span className="eyebrow mr-1">Try</span>{s.useIdea}</p>
                    <p className="text-xs text-muted">Used on {plural(stats.get(s.id)?.count30 ?? 0, 'day')} in the last 30.</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-center text-sm text-muted">Retook the VIA survey? <Link to="/settings" className="link">Update your ranking in Settings</Link>.</p>
    </Page>
  );
}
