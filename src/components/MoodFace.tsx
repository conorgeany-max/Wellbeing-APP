export const MOOD_LABELS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];
export const ENERGY_LABELS = ['', 'Drained', 'Low', 'Steady', 'Good', 'Buzzing'];

export const moodColor = (m: number) => `var(--mood-${Math.max(1, Math.min(5, Math.round(m)))})`;

/** A soft, rounded face whose smile follows the mood (1-5). */
export function MoodFace({ mood, size = 48 }: { mood: number; size?: number }) {
  const curve = (mood - 3) * 5; // negative = frown
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="22" fill={moodColor(mood)} opacity="0.9" />
      <circle cx="17" cy="20" r="2.2" fill="#111111" opacity="0.75" />
      <circle cx="31" cy="20" r="2.2" fill="#111111" opacity="0.75" />
      <path d={`M15 ${31 - curve / 2} Q24 ${31 + curve} 33 ${31 - curve / 2}`} stroke="#111111" strokeOpacity="0.75" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function MoodDot({ mood, size = 10 }: { mood: number; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: moodColor(mood) }} title={MOOD_LABELS[mood]} />;
}

/** Five-option picker used for mood (faces) and energy (dots). */
export function ScalePicker({ value, onChange, kind }: { value: number; onChange: (v: number) => void; kind: 'mood' | 'energy' }) {
  const labels = kind === 'mood' ? MOOD_LABELS : ENERGY_LABELS;
  return (
    <div className="flex justify-between gap-1" role="radiogroup" aria-label={kind}>
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-2 transition ${value === v ? 'bg-accent/15 scale-105' : 'opacity-60 hover:opacity-100'}`}
        >
          {kind === 'mood' ? (
            <MoodFace mood={v} size={value === v ? 48 : 40} />
          ) : (
            <span className="flex h-10 items-end gap-0.5">
              {[1, 2, 3, 4, 5].map((b) => (
                <span key={b} className={`w-1.5 rounded-full ${b <= v ? 'bg-pop' : 'bg-line'}`} style={{ height: 6 + b * 6 }} />
              ))}
            </span>
          )}
          <span className="text-[11px] text-muted">{labels[v]}</span>
        </button>
      ))}
    </div>
  );
}
