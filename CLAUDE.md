# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Vite + React 18 single-page app. Version 2.0 is a weekly loop. The app suggests a focus subcategory and a practice. The user keeps them or swaps them. The user checks in once a week and sees the trend over time. The app installs as a PWA and applies updates at a safe moment (next route change or when the page is hidden).

Screens use hash routes. These routes have tabs:

- `#/` Today (home)
- `#/journey` Journey
- `#/assess` Assess (full assessment)
- `#/practices` Practices
- `#/framework` Framework
- `#/sources` Sources

These routes have no tab: `#/welcome` (Welcome), `#/checkin` (Check-in), and `#/settings` (Settings & privacy). `src/lib/router.js` defines the routes.

The point of the project is to **develop, use, and extend** a curated body of meaningful life practices rooted in psychology, philosophy, and contemplative traditions. The framework data is the product — the UI is a thin renderer over it.

## Commands

```bash
npm install        # first run only
npm run dev        # vite dev server on :5173, opens browser
npm run build      # production bundle to dist/
npm run preview    # serve the built bundle
npm test           # Vitest, jsdom environment
npm run lint       # ESLint, config in eslint.config.js
npm run e2e        # Playwright user stories against the built app (run npm run build first)
```

Tests live next to the code they cover, in `__tests__` folders. The Vitest setup file is `src/test/setup.js`. The Vitest config is `vitest.config.js`, separate from `vite.config.js`.

User-story tests live in `e2e/`, one spec per story group. `docs/product/USER_STORIES.md` lists every story. Shared helpers in `e2e/helpers.js` seed storage and freeze the clock. In this container, set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

CI (`.github/workflows/ci.yml`) runs lint, unit tests, build, and the e2e stories on every push and pull request.

When a flow changes, update the matching story in `e2e/` and its row in `USER_STORIES.md` in the same change.

## Architecture

Four layers, top-to-bottom:

1. **Data (`src/data/`)** — `framework.js` exports `FRAMEWORK` (7 domains, 30 subcategories, 300 practices) plus derived `TOTAL_SUBS` / `TOTAL_IDEAS`. `sources.js` exports `SOURCES` (citations grouped by discipline). The UI is generic over this shape — adding a domain, sub, or practice just means editing data.

2. **Library (`src/lib/`):** logic lives here. Components hold no business logic. Each module has a job:
   - `dates.js`: local `YYYY-MM-DD` dates and ISO weeks.
   - `recommend.js`: `suggestFocus`, `suggestPractice`, and `nextPractice`.
   - `trends.js`: score series and change since the first check-in.
   - `ics.js`: calendar files for the weekly check-in and the weekly practice.
   - `storage.js`: storage keys, migration, validators, export, and import.
   - `router.js`: hash routes and the `useRoute()` hook.
   - `shareCard.js`: draws the share image on a canvas.
   - `rhythm.js`: the weekly rhythm. Check-in opening day, season review, lapsed weeks, and calendar defaults.
   - `journey.js`: Journey grouping by week and the next check-in date.
   - `notice.js`: one-shot notices shown above any screen.
   - `download.js`: saves a JSON file in the browser.

   Most functions are pure. `shareCard.js` and `downloadIcs` in `ics.js` call browser APIs.

3. **Hooks (`src/hooks/`):** all persistence lives here, using `localStorage`:
   - `usePersistentState(key, initial, sanitize?)`: generic `useState` mirror; swallows storage errors so private mode degrades to in-memory only. `sanitize(parsed)` returns a cleaned value (invalid entries dropped) or `undefined` (use `initial`); when the cleaned value differs from the stored one, the raw text is first copied to `${key}:bad` (once).
   - `useScores()` — 1–10 ratings keyed `` `${domain.id}-${subIndex}` ``. Exposes `get/set/clear/reset`, `domainAverage(i)`, `overallAverage()`, `lowestSubs()` (all scored subs sorted ascending), and `scoredCount`. Storage key: `life-improver:scores:v1`. (Self-Assessment's dashboard currently recomputes its averages/top/bottom inline rather than via these helpers, but they remain the hook's public API.)
   - `useQuickScores()`: one 1–10 quick score per domain, from onboarding. Exposes `quick`, `setQuick(domainId, value)`, and `reset()`.
   - `useFocus()`: this week's focus, or `null`. Exposes `focus`, `setFocus(focus)`, and `clearFocus()`.
   - `useCheckins()`: weekly check-ins, oldest first. Exposes `checkins`, `addCheckin(checkin)`, and `reset()`.
   - `useToday()`: today's local date. It recomputes on `visibilitychange` and window `focus`. Screens use it instead of calling `toLocalDate()` on each render.

4. **Components (`src/components/`):** `App.jsx` owns the route (`useRoute()`) and creates the four data hooks once: `useScores`, `useQuickScores`, `useFocus`, and `useCheckins`. It passes them as props `scores`, `quick`, `focus`, and `checkins`, along with `navigate`. The routed screen sits inside an `ErrorBoundary` that resets on route change. App sends a newcomer from `#/` to `#/welcome`. A newcomer has no quick scores and no full scores.

   The Framework, Practices, and Sources screens read `FRAMEWORK` / `SOURCES` directly and take no props. Assess takes only `scores`. Self-Assessment (`SelfAssessment.jsx`) and Ideas (`Ideas.jsx`) each render their own horizontal **domain pills** (the `.dp` class) for navigation — there is no shared tab-body sub-component. The results **`Dashboard`** is a sub-component defined inside `SelfAssessment.jsx`.

## Storage keys

All keys start with `life-improver:`. All values are JSON. `src/lib/storage.js` owns the key names.

| Key | Shape | Owner |
|---|---|---|
| `life-improver:scores:v1` | `{ "<domainId>-<subIndex>": 1..10 }` | `useScores` |
| `life-improver:quick:v1` | `{ "<domainId>": 1..10 }` | `useQuickScores` |
| `life-improver:focus:v1` | `Focus` or `null` | `useFocus` |
| `life-improver:checkins:v1` | `CheckIn[]`, oldest first | `useCheckins` |
| `life-improver:meta:v1` | `{ schema: 2, createdAt: ISO string }` | `storage.js` |

`Focus` holds `domainId`, `subIndex`, `practiceIndex`, `startedAt` (local date), and `skipped` (practice indices swapped away this focus). `CheckIn` holds `id`, `date`, `week`, `domainId`, `subIndex`, `practiceIndex`, `practised` (`yes`, `some`, or `no`), `score`, and `note` (max 500 characters).

Rules for storage:

- Bump a key's version when its shape changes. Rename `:v1` to `:v2`, read the old key, and migrate its value in `storage.js`.
- `runMigrations` runs once at startup from `main.jsx`. It is idempotent. It never deletes `life-improver:scores:v1`.
- Sanitize stored values by shape. Add sanitizers to `storage.js` and pass them to `usePersistentState`.

## Conventions worth preserving

- **Score key shape is load-bearing.** `` `${domain.id}-${subIndex}` `` means renaming a domain is fine, but reordering or deleting a sub silently strands stored assessments. If you ever need to reorder, bump the storage-key version (`:v1` → `:v2`) and migrate.
- **Domain `id` must stay stable and unique.** Append new domains with a fresh id. Same goes for sub order — append, don't reshuffle.
- **Tone of the content matters.** Domain/sub `desc` strings and practice text use a deliberate contemplative voice ("the seven grounds of a life", "where the water wants to go", "a garden is planted one seed at a time"). When editing or adding entries, match that register — don't rewrite into generic productivity-blog phrasing. Practices are imperative, terse, and evidence-flavoured.
- **Citations live in `sources.js`.** Many `note` fields explicitly map a source to a subcategory (e.g. *"Referenced in Sleep & Recovery practices"*). When adding a practice that leans on a specific source, add or update the matching `SOURCES` entry to keep the mapping intact.
- **Styling is split deliberately.** Reusable presentational classes live in `src/styles.css`. Each v2 screen has its own section. A section starts with a marker like `/* === v2: Today === */`. The current markers are Today, Onboarding, CheckIn, Journey, Settings, Share, and App shell. Put new classes in the section for their screen. In use today: `.sf` (serif), `.bl` (accent bar), `.tabbar`/`.ti` (tabs), `.bnav`/`.bn` (mobile bottom navigation), `.dp`/`.prog` and `.sp` (domain and subcategory pills), `.sh` (horizontal pill scroller), `.cd` (card), `.ir` (idea row), `.oh`/`.ob`/`.os` (Overview accordion), `.split` (two-column dashboard grid), `.btn` with `.btn-primary`, `.btn-danger`, and `.btn-tap` (buttons; `.btn-tap` sets a 44px touch target), `.btn-text` (text button, defined in the Today section), and `.input` (form fields). The global `.sr-only` class hides text visually and keeps it for screen readers. One-off layout (paddings, flex gaps, colors used in exactly one place) stays inline in JSX. Don't promote inline styles to classes prematurely; don't inline styles that already have a class.
- **No external CSS framework.** All visuals are hand-rolled to keep the artifact lightweight and the aesthetic deliberate (Source Sans 3 / Source Serif 4, blue `#2B6CB0` accent, off-white surfaces). Resist the urge to introduce Tailwind or component libraries.

## Extending the framework

To add a new domain to `FRAMEWORK`: pick the next unused `id`, write a `desc` paragraph in the established voice, and add at least 2–3 subs each with `name`, `desc`, and ~10 imperative `ideas` strings. Then add or update relevant `SOURCES` entries.

To add a single practice: append a string to the relevant sub's `ideas` array. No other change needed — counts in the header update automatically via `TOTAL_IDEAS`.
