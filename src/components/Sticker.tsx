import type { CSSProperties, ReactNode } from 'react';

type Look = { bg: string; fg: string; ring: string };

/** Flat colours borrowed from playful print stickers; fixed so they read the same in both themes. */
const LOOKS = {
  blue: { bg: '#3300FF', fg: '#FFFFFF', ring: '#FFFFFF' },
  green: { bg: '#1FA34A', fg: '#FFFFFF', ring: '#FFFFFF' },
  pink: { bg: '#FF5FCF', fg: '#2A1890', ring: '#FFE14D' },
  orange: { bg: '#FF7A1A', fg: '#FFFFFF', ring: '#FFFFFF' },
} satisfies Record<string, Look>;

/** A tilted, outlined word-sticker that bobs gently and wiggles on hover. */
export function Sticker({ children, look = 'blue', tilt = 0, delay = 0, className = '' }: { children: ReactNode; look?: keyof typeof LOOKS; tilt?: number; delay?: number; className?: string }) {
  const l = LOOKS[look];
  const style = {
    background: l.bg,
    color: l.fg,
    boxShadow: `0 0 0 4px ${l.ring}, 0 6px 14px -6px rgb(0 0 0 / 0.35)`,
    '--tilt': `${tilt}deg`,
    '--delay': `${delay}s`,
  } as CSSProperties;
  return (
    <span aria-hidden className={`sticker display pointer-events-auto inline-block select-none rounded-[14px] px-3 py-2 text-center text-lg leading-[0.85] ${className}`} style={style}>
      {children}
    </span>
  );
}

/** A round badge with text running around its edge that slowly turns. */
export function SpinBadge({ text, center, size = 112, className = '' }: { text: string; center: ReactNode; size?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex select-none items-center justify-center rounded-full bg-pop text-ink ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 h-full w-full">
        <defs><path id="badge-circle" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
        <text className="display fill-[#111]" style={{ fontSize: 11.5, letterSpacing: 1 }}>
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </svg>
      <span className="text-2xl text-[#111]">{center}</span>
    </span>
  );
}
