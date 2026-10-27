import { useEffect, useRef, useState, type ReactNode } from 'react';
import { deleteAllData, exportAll, importAll, resetStrengthOrder, saveStrengthOrder, useStrengths, type ExportFile } from '../db/repo';
import { setSetting, useSettings, type ThemeMode } from '../db/settings';
import { addSampleData, removeSampleData } from '../db/seed';
import { SUPPORT } from '../data/support';
import { today } from '../lib/date';
import { Chip, Eyebrow, Page } from '../components/ui';
import { SupportContent } from '../components/Support';
import { CloudSettings } from '../components/CloudSettings';
import { updatePushTime } from '../lib/push';
import { deleteCloudCopy } from '../lib/sync';

export default function Settings() {
  const s = useSettings();
  const strengths = useStrengths();
  const [order, setOrder] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrder(strengths.map((x) => x.id));
  }, [strengths]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    void saveStrengthOrder(next);
  };

  const setReminder = async (time: string) => {
    if (time && typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
    await setSetting('reminderTime', time || null);
    if (time && s.pushEnabled) await updatePushTime(time).catch(() => flash('Saved here, but could not update the reminder server.'));
  };

  const toggleSample = async (on: boolean) => {
    await setSetting('sampleData', on);
    if (on) await addSampleData(); else await removeSampleData();
    flash(on ? 'Sample data added.' : 'Sample data removed.');
  };

  const doExport = async () => {
    const data = await exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `steady-export-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ExportFile;
      if (!confirm('Importing replaces everything currently in Steady. Continue?')) return;
      await importAll(data);
      flash('Import complete.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  const doDelete = async () => {
    if (!confirm('Delete all entries, habits, logs and custom quotes? This cannot be undone. Consider exporting first.')) return;
    if (s.accessCode && confirm('Also delete your cloud backup? If you choose Cancel, your data will come back the next time this device syncs.')) {
      await deleteCloudCopy().catch(() => undefined);
    }
    await deleteAllData();
    flash('Everything has been cleared.');
  };

  const notifBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  return (
    <Page eyebrow="Settings" title="Make it yours">
      {msg && <p className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg shadow-soft">{msg}</p>}
      <div className="space-y-5">
        <Group title="You">
          <Row label="Your name" hint="Used in the greeting.">
            <input key={s.name} className="input w-40 py-2" defaultValue={s.name} onBlur={(e) => setSetting('name', e.target.value.trim())} placeholder="Optional" />
          </Row>
          <Row label="Appearance">
            <div className="flex gap-1.5">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((t) => <Chip key={t} on={s.theme === t} onClick={() => setSetting('theme', t)}>{t[0].toUpperCase() + t.slice(1)}</Chip>)}
            </div>
          </Row>
          <Row label="Daily reminder" hint={notifBlocked ? 'Notifications are blocked in your browser settings.' : s.pushEnabled ? 'Sent as a notification, even when Steady is closed.' : 'Shown while Steady is open. Turn on notifications below for reminders when it is closed.'}>
            <div className="flex items-center gap-2">
              <input type="time" className="input w-32 py-2" value={s.reminderTime ?? ''} onChange={(e) => setReminder(e.target.value)} />
              {s.reminderTime && <button className="text-xs text-muted" onClick={() => setReminder('')}>Off</button>}
            </div>
          </Row>
        </Group>

        <Group title="Sync, Claude and reminders">
          <CloudSettings />
        </Group>

        <Group title="Need support?">
          <Row label="Your country" hint="For the crisis lines shown in the app.">
            <select className="input w-44 py-2" value={s.country} onChange={(e) => setSetting('country', e.target.value)}>
              {SUPPORT.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Row>
          <div className="pt-2"><SupportContent /></div>
        </Group>

        <Group title="Strengths ranking" hint="Update this if you retake the VIA survey. Top 5 are your signature strengths.">
          <ol className="space-y-1">
            {order.map((id, i) => {
              const st = strengths.find((x) => x.id === id);
              if (!st) return null;
              return (
                <li key={id} className={`flex items-center gap-2 rounded-xl py-0.5 pl-3 pr-1 ${i < 5 ? 'bg-accent/10' : ''}`}>
                  <span className="w-6 text-right text-sm text-muted">{i + 1}</span>
                  <span className="flex-1 text-sm">{st.name}</span>
                  <button className="btn-ghost h-10 w-10 px-0 py-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${st.name} up`}>↑</button>
                  <button className="btn-ghost h-10 w-10 px-0 py-0" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${st.name} down`}>↓</button>
                </li>
              );
            })}
          </ol>
          <button className="mt-1 py-2.5 text-sm" onClick={() => resetStrengthOrder()}><span className="link">Reset to my original ranking</span></button>
        </Group>

        <Group title="Your data" hint={s.accessCode ? 'Stored on this device and backed up to your own Netlify account.' : 'Everything stays on this device. Nothing is sent anywhere.'}>
          <Row label="Sample data" hint="30 days of example entries so Insights has something to show. Sample entries never sync.">
            <Toggle on={s.sampleData} onChange={toggleSample} />
          </Row>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn-outline" onClick={doExport}>Export JSON</button>
            <button className="btn-outline" onClick={() => fileRef.current?.click()}>Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
            <button className="btn-ghost text-muted" onClick={doDelete}>Delete all data</button>
          </div>
        </Group>

        <p className="pt-4 text-center text-xs text-muted">Steady is for self-reflection. It offers observations, not medical advice.</p>
      </div>
    </Page>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <Eyebrow>{title}</Eyebrow>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-3 divide-y divide-line/60">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-accent' : 'bg-line'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
