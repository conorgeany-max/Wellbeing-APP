const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each even felt feel feeling few for from further get got had has have having he her here hers him his how i i'm if in into is it it's its just like me more most my myself no nor not now of off on once only or other our out over own really same she should so some still such than that the their them then there these they this those through to too today under until up very was we were what when where which while who why will with would you your bit day much back things thing way went made make one two lot`.split(/\s+/),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^a-z']+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function topWords(texts: string[], limit = 10): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    // Count each word once per entry so one long rant doesn't dominate.
    for (const w of new Set(tokenize(t))) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export { STOPWORDS };
