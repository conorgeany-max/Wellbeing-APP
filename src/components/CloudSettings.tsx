import { useState } from 'react';
import { setSetting, useSettings } from '../db/settings';
import { useCloudStatus, api } from '../lib/cloud';
import { syncNow } from '../lib/sync';
import { disablePush, enablePush, pushSupported } from '../lib/push';
import { Eyebrow } from './ui';
import { plural } from '../lib/stats';

const ago = (t: number | null) => {
  if (!t) return 'never';
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Shown until ANTHROPIC_API_KEY is set on the server. Everything else works without it. */
function ClaudeNotConnected() {
  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Claude</p>
        <span className="rounded-full bg-line px-2 py-0.5 text-[11px] text-muted">Not connected yet</span>
      </div>
      <p className="text-xs text-muted">
        When connected, Claude answers “Ask my journal” in plain language and can write your monthly reflection. Until then, Ask my journal uses keyword search on this device.
      </p>
      <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted">
        <li>Create a key at <a className="link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.</li>
        <li>In Netlify, add it under Environment variables as <code>ANTHROPIC_API_KEY</code> (scope Functions, secret).</li>
        <li>Trigger a new deploy, then come back here and turn Claude on.</li>
      </ol>
    </div>
  );
}

/** Connect this device to the hosted app: sync, Claude and push reminders. */
export function CloudSettings() {
  const s = useSettings();
  const { status, refresh } = useCloudStatus();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label); setNote('');
    try {
      const msg = await fn();
      if (msg) setNote(msg);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const connect = () => run('connect', async () => {
    const trimmed = code.trim();
    const res = await api<{ authorized: boolean }>('status', {}, trimmed);
    if (!res.authorized) return 'That access code is not right. Copy STEADY_ACCESS_CODE from your Netlify settings.';
    await setSetting('accessCode', trimmed);
    setCode('');
    const { pulled } = await syncNow();
    refresh();
    return pulled ? `Connected. ${plural(pulled, 'change')} came in from the cloud.` : 'Connected and backed up.';
  });

  const disconnect = () => run('disconnect', async () => {
    if (s.pushEnabled) await disablePush();
    await setSetting('accessCode', '');
    await setSetting('useClaude', false);
    refresh();
    return 'This device is disconnected. Your data stays on it and in the cloud.';
  });

  const togglePush = () => run('push', async () => {
    if (s.pushEnabled) { await disablePush(); return 'Reminders turned off on this device.'; }
    const time = s.reminderTime ?? '20:30';
    if (!s.reminderTime) await setSetting('reminderTime', time);
    await enablePush(time);
    return `You'll get a gentle nudge at ${time} on days you haven't checked in.`;
  });

  if (status === null) {
    return (
      <p className="py-3 text-sm text-muted">
        Sync, backup, Claude and push reminders work on the hosted version of Steady. Running it locally keeps everything on this device.
      </p>
    );
  }
  if (!status.configured) {
    return <p className="py-3 text-sm text-muted">The server isn't set up yet: STEADY_ACCESS_CODE is missing in Netlify. See the README.</p>;
  }

  if (!s.accessCode || !status.authorized) {
    return (
      <form className="space-y-3 py-3" onSubmit={(e) => { e.preventDefault(); void connect(); }}>
        <p className="text-sm text-muted">Enter your access code to sync and back up this device. You only need to do this once per device.</p>
        <div className="flex gap-2">
          <input id="access-code" className="input py-2" type="password" autoComplete="current-password" placeholder="Access code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn-primary py-2" disabled={!code.trim() || !!busy}>{busy ? 'Connecting…' : 'Connect'}</button>
        </div>
        {note && <p className="text-sm text-muted">{note}</p>}
      </form>
    );
  }

  return (
    <div className="divide-y divide-line/60">
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div>
          <p className="text-sm font-medium">Sync and backup</p>
          <p className="text-xs text-muted">Last synced {ago(s.lastSync)}. Syncs automatically when you make changes.</p>
        </div>
        <button className="btn-outline py-2" onClick={() => run('sync', async () => { const r = await syncNow(); return r.pulled ? `Synced. ${plural(r.pulled, 'change')} came in.` : 'Everything is up to date.'; })} disabled={!!busy}>
          {busy === 'sync' ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {status.ai ? (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 max-w-sm">
            <p className="text-sm font-medium">Use Claude for “Ask my journal”</p>
            <p className="text-xs text-muted">Your question and recent entries are sent to Anthropic to answer it. Turn off to keep searches on this device.</p>
          </div>
          <button role="switch" aria-checked={s.useClaude} onClick={() => setSetting('useClaude', !s.useClaude)} className={`relative h-7 w-12 rounded-full transition ${s.useClaude ? 'bg-accent' : 'bg-line'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${s.useClaude ? 'left-6' : 'left-1'}`} />
            <span className="sr-only">Use Claude</span>
          </button>
        </div>
      ) : (
        <ClaudeNotConnected />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 max-w-sm">
          <p className="text-sm font-medium">Reminder notifications</p>
          <p className="text-xs text-muted">
            {!status.push ? 'Push keys are not set up in Netlify yet.'
              : !pushSupported() ? 'Not supported in this browser. On iPhone, add Steady to your Home Screen and open it from there.'
              : s.pushEnabled ? `On for this device at ${s.reminderTime ?? '20:30'}. Change the time above.`
              : 'Get a nudge at your reminder time, even when Steady is closed. Skipped on days you have checked in.'}
          </p>
        </div>
        <button className="btn-outline py-2" onClick={togglePush} disabled={!status.push || !pushSupported() || !!busy}>
          {busy === 'push' ? '…' : s.pushEnabled ? 'Turn off' : 'Turn on'}
        </button>
      </div>

      {note && <p className="py-3 text-sm text-muted">{note}</p>}
      <div className="pt-3">
        <Eyebrow className="mb-1">This device</Eyebrow>
        <button className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline" onClick={disconnect} disabled={!!busy}>Disconnect this device</button>
      </div>
    </div>
  );
}
