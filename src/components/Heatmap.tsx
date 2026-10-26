import type { ISODate } from '../db/types';
import { addDays, formatShort, today, weekStart } from '../lib/date';

/** GitHub-style calendar of the last N weeks; columns are weeks, rows Mon-Sun. */
export function Heatmap({ done, weeks = 12, color = 'rgb(var(--accent))' }: { done: Set<ISODate>; weeks?: number; color?: string }) {
  const end = today();
  const start = addDays(weekStart(end), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div className="flex gap-[3px] overflow-hidden" aria-label="Habit calendar">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((d) => (
            <span
              key={d}
              title={`${formatShort(d)}${done.has(d) ? ': done' : ''}`}
              className="h-3 w-3 rounded-[3px]"
              style={{ background: d > end ? 'transparent' : done.has(d) ? color : 'rgb(var(--line) / 0.7)' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
