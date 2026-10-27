import { useState } from 'react';
import { SUPPORT } from '../data/support';
import { useSettings } from '../db/settings';
import { Modal } from './ui';

export function SupportContent() {
  const { country } = useSettings();
  const info = SUPPORT.find((s) => s.code === country) ?? SUPPORT[0];
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted">
        If things feel like too much, you don't have to handle it alone. These services are free, confidential and there to listen.
      </p>
      {info.lines.map((l) => (
        <div key={l.name} className="card-tint p-4">
          <p className="font-medium">{l.name}</p>
          {l.phone && (
            <a className="headline mt-1 block text-2xl text-accent" href={`tel:${l.phone.replace(/\s/g, '')}`}>{l.phone}</a>
          )}
          {l.text && <p className="text-muted">{l.text}</p>}
          <a className="link text-xs" href={l.url} target="_blank" rel="noreferrer">{l.url.replace('https://', '')}</a>
        </div>
      ))}
      <p className="text-muted">
        If you are in immediate danger, call <strong className="text-ink">{info.emergency}</strong>. Showing lines for {info.label}; change your country in Settings.
      </p>
      <p className="text-xs text-muted">Steady is a self-reflection tool, not medical advice or a substitute for professional care.</p>
    </div>
  );
}

export function SupportLink({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`px-2 py-2.5 text-sm text-muted underline-offset-4 hover:text-ink hover:underline ${className}`}>
        Need support?
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Need support?">
        <SupportContent />
      </Modal>
    </>
  );
}
