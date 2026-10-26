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

## Hosting and cloud features (Netlify)

Steady works fully offline on its own. When it's hosted on Netlify it also gets:

- **Sync and backup:** every device you connect shares the same data, and a copy is kept in your Netlify account (Netlify Blobs). Each record syncs separately and the newest change wins, so you can use your phone and laptop side by side. Sample data never syncs.
- **Claude for "Ask my journal":** ask questions in plain language ("What helps when I'm anxious?"). Your question and recent entries go to Anthropic to answer it. It's off until you turn it on in Settings, and keyword search stays available.
- **Reminder notifications:** a gentle nudge at your reminder time, even when the app is closed, skipped on days you've already checked in. On iPhone this needs iOS 16.4+ and Steady added to the Home Screen.
- **Monthly reflection:** works everywhere; on the hosted app Claude can also write a short reflection for the month.

### One-time setup

1. **Connect the repo:** in Netlify, open the `steady-wellbeing` project → *Project configuration* → *Build & deploy* → *Link repository*, pick this GitHub repo and the `main` branch. Netlify reads `netlify.toml` for the rest.
2. **Environment variables** (*Project configuration* → *Environment variables*, scope *Functions*):

   | Variable | What it is |
   | --- | --- |
   | `STEADY_ACCESS_CODE` | The code each device enters once in Settings → *Sync, Claude and reminders*. Long and random. |
   | `ANTHROPIC_API_KEY` | Your key from https://console.anthropic.com. Needed for Claude answers and monthly write-ups. |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Keys for push notifications. Generate with `npx web-push generate-vapid-keys`. |
   | `VAPID_SUBJECT` | A contact URL or `mailto:` address for push services, e.g. your site URL. |

   After changing a variable, trigger a new deploy so functions pick it up.
3. **On each device:** open the site, go to Settings → *Sync, Claude and reminders*, enter the access code, then turn on Claude and notifications if you want them. Turn off sample data once you start using it for real.

### How it fits together

```
netlify/functions/
  status.mts     GET  /api/status   which features are set up, and whether the access code works
  sync.mts       GET/PUT/DELETE /api/sync   the cloud snapshot (ETag-checked so devices can't overwrite each other)
  ask.mts        POST /api/ask      calls Claude with the Anthropic SDK; the API key never reaches the browser
  push.mts       GET/POST/DELETE /api/push  saves this device's push subscription and reminder time
  reminders.mts  scheduled every 15 minutes: sends reminders in each device's own timezone
src/lib/sync.ts  merge logic (newest change wins per record, deletions sync as tombstones)
public/push-sw.js  shows notifications from the service worker
```

`npm run dev` runs these functions locally too (through `@netlify/vite-plugin`). Set the variables in your shell first, for example `STEADY_ACCESS_CODE=local-test npm run dev`.

## Support

Steady is a self-reflection tool, not a medical service. If you are struggling, the "Need support?" link (Settings, and low-mood check-ins) lists free, confidential lines for your country, e.g. Samaritans **116 123** (UK and Ireland).
