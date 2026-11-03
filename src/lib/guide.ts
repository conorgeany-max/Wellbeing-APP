import type { ISODate } from '../db/types';

/**
 * Your own guide: plain text you write in the app, kept word for word.
 * "# Heading" starts a section; each other non-empty line is one point
 * ("1." or "-" in front is optional and kept as the point's label).
 */
export interface GuideItem { label: string; text: string }
export interface GuideSection { heading: string; items: GuideItem[] }

export function parseGuide(raw: string): GuideSection[] {
  const sections: GuideSection[] = [];
  for (const line of raw.split('\n').map((l) => l.trim())) {
    if (!line) continue;
    if (line.startsWith('#')) { sections.push({ heading: line.replace(/^#+\s*/, ''), items: [] }); continue; }
    if (!sections.length) sections.push({ heading: '', items: [] });
    const m = line.match(/^(\d+[.)]|[-•⁃*])\s*(.*)$/);
    const label = m && /^\d/.test(m[1]) ? m[1].replace(/[.)]$/, '') : '';
    sections[sections.length - 1].items.push({ label, text: m ? m[2] : line });
  }
  return sections.filter((s) => s.items.length || s.heading);
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** One point from the first section of your guide, a different one each day. */
export function guideOfDay(raw: string, date: ISODate): { title: string; item: GuideItem } | null {
  const first = parseGuide(raw)[0];
  if (!first?.items.length) return null;
  return { title: first.heading, item: first.items[hash(`guide-${date}`) % first.items.length] };
}
