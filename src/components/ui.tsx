import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/**
 * Big studio-style headline: the first word in heavy condensed caps, the rest in serif caps.
 * Non-string titles render as given.
 */
export function MixedTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  if (typeof children !== 'string') return <h1 className={`display ${className}`}>{children}</h1>;
  const [first, ...rest] = children.split(' ');
  return (
    <h1 className={`uppercase leading-[0.9] ${className}`}>
      <span className="display">{first}</span>
      {rest.length > 0 && <span className="headline"> {rest.join(' ')}</span>}
    </h1>
  );
}

/** Standard screen wrapper: serif lead line + mixed headline + content, rising in gently. */
export function Page({ eyebrow, title, action, children }: { eyebrow: string; title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-2xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:pt-8"
    >
      <header className="mb-10 flex flex-col items-center gap-4 text-center">
        <p className="lead">{eyebrow}</p>
        <MixedTitle className="text-[2.75rem] sm:text-6xl">{title}</MixedTitle>
        {action}
      </header>
      {children}
    </motion.main>
  );
}

export function Card({ children, className = '', tint = false }: { children: ReactNode; className?: string; tint?: boolean }) {
  return <section className={`${tint ? 'card-tint' : 'card'} p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, hint }: { eyebrow?: string; title: string; hint?: string }) {
  return (
    <div className="mb-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="headline text-2xl sm:text-3xl">{title}</h2>
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
  return <p className="rounded-card border-2 border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label={title}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline text-3xl">{title}</h2>
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
      <p className="headline mt-1 text-4xl">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
