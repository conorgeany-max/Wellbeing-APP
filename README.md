# Steady

A calm, private well-being app for one person: a 3-minute daily check-in, a journal, habit tracking, quotes, and insights into what helps you feel good. It is built around your VIA Character Strengths, so it nudges you to use your top strengths and shows how using them relates to your mood.

Everything is stored on your device (IndexedDB). There is no login and nothing is sent anywhere.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). On your phone, connect to the same Wi-Fi and run `npm run dev -- --host`, then open the "Network" address it prints.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds the production app into `dist/` |
| `npm run preview` | Serves the built app (this is where the offline/PWA features work) |
| `npm run check:insights` | Generates the sample data in memory and prints what the Insights screen would say |

### Install it like an app

Build and preview (or deploy `dist/` to any static host such as Netlify, Vercel or GitHub Pages). Then:

- **iPhone (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu → Install app.
- **Desktop (Chrome/Edge):** the install icon in the address bar.

Once installed it works offline.

## What's inside

- **Today:** greeting, quote of the day, start check-in, habit progress ring and check-in streak. Missing days just shows "Welcome back".
- **Check-in (4 steps):** 01 Check in (mood, energy, sleep) · 02 Clear (free-write + tags) · 03 Habits · 04 Reflect (quote, prompt, strengths used). Swipe or tap Next. Low check-ins get one small strength-based suggestion and a "Need support?" link.
- **Journal:** entries by month with a mood dot, tags, full-text search, read and edit.
- **Habits:** create, edit, archive; daily or X times a week; link to a strength; 12-week heatmap, current and best streaks, 30-day consistency. Habits tied to lesser strengths get a gentle "keep it small" nudge.
- **Strengths:** your ranked 24 strengths, signature strength cards (use-it-today idea, days used in the last 30, average mood when used) and a Strength of the week with a tiny daily challenge.
- **Quotes:** ~100 built-in quotes (stoic, mindfulness, inspirational), many tagged by strength; favourites; add your own.
- **Insights:** mood and energy over 7/30/90 days, what helps and what weighs on you (habits, tags, strengths), sleep vs mood, best and hardest weekday, habit consistency, words and tags on good vs low days, weekly summary, strengths you haven't used lately, and "Ask my journal".
- **Settings:** theme (system/light/dark), daily reminder, country for support lines, strengths ranking editor, sample data toggle, export/import JSON, delete all.

Insights only show a pattern once there are at least 5 days on each side of the comparison, always show the sample size, and are phrased as observations rather than advice.

## Sample data

On first launch Steady adds 30 days of realistic example data (marked "sample" in the Journal) so Insights has something to show. Turn it off in **Settings → Your data**. Anything you write yourself is never touched by the toggle.

## Project structure

```
src/
  db/          Dexie database, types, settings, seed + sample data, data access (repo.ts)
  data/        Built-in content: strengths, quotes, starter habits, tags, support lines
  lib/         Pure logic: dates, habit streaks, insights engine, "Ask my journal", stats
  components/  Small UI building blocks (cards, mood faces, progress ring, heatmap, nav)
  screens/     One file per screen
scripts/       check-insights.ts (sanity check for the insights engine)
```

The data model (`src/db/types.ts`): `Entry`, `Habit`, `HabitLog`, `Quote`, `Strength`. Every record has a string `id` and `updatedAt`, so it can later sync to a backend such as Supabase without changing shape.

## Plugging in Claude for "Ask my journal"

Out of the box, Ask my journal uses private on-device keyword search plus simple stats (`localProvider` in `src/lib/ask.ts`). To answer questions in natural language, run a small backend that holds your API key (never put a key in the browser) and paste its URL into **Settings → Ask my journal (advanced)**. The app POSTs `{ question, entries }` and expects `{ summary: string[], matchDates: string[] }`.

A minimal backend using the official SDK (`npm install @anthropic-ai/sdk`):

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export async function answer(question: string, entries: unknown[]) {
  const response = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system:
      'You help someone reflect on their private journal. Answer kindly and briefly, as observations, never medical advice. ' +
      'Reply with JSON only: {"summary": string[] (2-4 short sentences), "matchDates": string[] (YYYY-MM-DD of relevant entries)}.',
    messages: [{ role: 'user', content: `Journal entries:\n${JSON.stringify(entries)}\n\nQuestion: ${question}` }],
  });
  const text = response.content.find((b) => b.type === 'text');
  return JSON.parse(text && text.type === 'text' ? text.text : '{"summary":[],"matchDates":[]}');
}
```

If the backend fails, the app falls back to keyword search.

## Support

Steady is a self-reflection tool, not a medical service. If you are struggling, the "Need support?" link (Settings, and low-mood check-ins) lists free, confidential lines for your country, e.g. Samaritans **116 123** (UK and Ireland).
