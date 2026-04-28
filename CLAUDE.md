# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Vite + React 18 single-page app: an interactive **Life Architecture Framework** with four tabs (Overview, Self-Assessment, Ideas, Sources). The point of the project is to **develop, use, and extend** a curated body of meaningful life practices rooted in psychology, philosophy, and contemplative traditions. The framework data is the product — the UI is a thin renderer over it.

## Commands

```bash
npm install        # first run only
npm run dev        # vite dev server on :5173, opens browser
npm run build      # production bundle to dist/
npm run preview    # serve the built bundle
```

There is no test runner and no lint config. If the user asks for tests or linting, scaffold them — don't pretend either exists.

## Architecture

Three layers, top-to-bottom:

1. **Data (`src/data/`)** — `framework.js` exports `FRAMEWORK` (7 domains × ~4 subs × ~10 practices) plus derived `TOTAL_SUBS` / `TOTAL_IDEAS`. `sources.js` exports `SOURCES` (citations grouped by discipline). The UI is generic over this shape — adding a domain, sub, or practice just means editing data.

2. **Hooks (`src/hooks/`)** — all persistence lives here, using `localStorage`:
   - `usePersistentState(key, initial)` — generic `useState` mirror; swallows storage errors so private mode degrades to in-memory only.
   - `useScores()` — 1–10 ratings keyed `` `${domain.id}-${subIndex}` ``. Exposes `get/set/clear/reset`, `domainAverage(i)`, `overallAverage()`, `lowestSubs()` (sorted ascending — drives "where the water wants to go"), and `scoredCount`. Storage key: `life-improver:scores:v1`.
   - `useCustomPractices()` — user-added practices, keyed the same way. Storage key: `life-improver:custom-practices:v1`.

3. **Components (`src/components/`)** — `App.jsx` owns only the active tab; each tab component is self-contained and receives the relevant hook(s) as props. `DomainSidebar` is the only shared sub-component (used by Self-Assessment and Ideas, with an `accessory` render prop for the right-aligned per-row element).

## Conventions worth preserving

- **Score key shape is load-bearing.** `` `${domain.id}-${subIndex}` `` means renaming a domain is fine, but reordering or deleting a sub silently strands stored assessments. If you ever need to reorder, bump the storage-key version (`:v1` → `:v2`) and migrate.
- **Domain `id` must stay stable and unique.** Append new domains with a fresh id. Same goes for sub order — append, don't reshuffle.
- **Curated vs. user content are separate stores.** Never write user-added practices into `framework.js` and never read curated practices from `localStorage`. The Ideas tab renders curated first, then user practices tagged "yours" beneath.
- **Tone of the content matters.** Domain/sub `desc` strings and practice text use a deliberate contemplative voice ("the seven grounds of a life", "where the water wants to go", "a garden is planted one seed at a time"). When editing or adding entries, match that register — don't rewrite into generic productivity-blog phrasing. Practices are imperative, terse, and evidence-flavoured.
- **Citations live in `sources.js`.** Many `note` fields explicitly map a source to a subcategory (e.g. *"Referenced in Sleep & Recovery practices"*). When adding a practice that leans on a specific source, add or update the matching `SOURCES` entry to keep the mapping intact.
- **Styling is split deliberately.** Reusable presentational classes live in `src/styles.css` (`.cd`, `.sc`, `.bf`, `.db`, `.sp`, `.ti`, `.bbg`, `.ir`, `.oh`, `.ob`, `.os`, `.sh`, `.sf`, `.btn*`, `.input`, `.custom-tag`). One-off layout (paddings, flex gaps, colors used in exactly one place) stays inline in JSX. Don't promote inline styles to classes prematurely; don't inline styles that already have a class.
- **No external CSS framework.** All visuals are hand-rolled to keep the artifact lightweight and the aesthetic deliberate (Source Sans 3 / Source Serif 4, blue `#2B6CB0` accent, off-white surfaces). Resist the urge to introduce Tailwind or component libraries.

## Extending the framework

To add a new domain to `FRAMEWORK`: pick the next unused `id`, write a `desc` paragraph in the established voice, and add at least 2–3 subs each with `name`, `desc`, and ~10 imperative `ideas` strings. Then add or update relevant `SOURCES` entries.

To add a single practice: append a string to the relevant sub's `ideas` array. No other change needed — counts in the header update automatically via `TOTAL_IDEAS`.
