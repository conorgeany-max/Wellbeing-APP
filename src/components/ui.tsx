import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/** Standard screen wrapper: eyebrow + serif title + content, with a gentle fade in. */
export function Page({ eyebrow, title, action, children }: { eyebrow: string; title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto w-full max-w-2xl px-4 pb-28 pt-8 sm:px-6 md:pb-12"
    >
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="headline mt-1 text-3xl sm:text-4xl">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </motion.main>
  );
}

export function Card({ children, className = '', sand = false }: { children: ReactNode; className?: string; sand?: boolean }) {
  return <section className={`${sand ? 'card-sand' : 'card'} p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, hint }: { eyebrow?: string; title: string; hint?: string }) {
  return (
    <div className="mb-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="headline text-xl">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Chip({ on, onClick, children, title }: { on?: boolean; onClick?: () => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" title={title} onClick={onClick} aria-pressed={on} className={`chip ${on ? 'chip-on' : 'text-muted hover:text-ink'}`}>
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label={title}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline text-2xl">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-3 py-2" aria-label="Close">✕</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="headline mt-1 text-2xl">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
