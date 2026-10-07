# v2.0 Technical Spec: The Weekly Loop

This spec is the contract for all v2.0 work. Read [BACKLOG.md](./BACKLOG.md) for stories.
Read `CLAUDE.md` for conventions. Do not change a contract below without the lead's approval.

## 1. Scope

v2.0 covers A1–A7, B1–B3, C1, E1–E4, E6, E7.

## 2. Navigation (E2)

Use a hash router. GitHub Pages serves the app under `/life-improver/`. Hash routes avoid 404s.
Implement the router in `src/lib/router.js` as a `useRoute()` hook. Add no router dependency.

| Hash | Screen | Component | Tab label |
|---|---|---|---|
| `#/` | Today (home) | `Today.jsx` | Today |
| `#/welcome` | Onboarding | `Onboarding.jsx` | (hidden) |
| `#/checkin` | Weekly check-in | `CheckIn.jsx` | (hidden) |
| `#/journey` | History and trends | `Journey.jsx` | Journey |
| `#/assess` | Full assessment | `SelfAssessment.jsx` | Assess |
| `#/practices` | Practice catalogue | `Ideas.jsx` | Practices |
| `#/framework` | Domain overview | `Overview.jsx` | Framework |
| `#/sources` | Sources | `Sources.jsx` | Sources |
| `#/settings` | Data, privacy, disclaimer | `Settings.jsx` | (footer link) |

Unknown hashes are normalised to `#/` inside `useRoute` (the entry is replaced, so Back does not return to them). `App` redirects `#/` to `#/welcome` when the user has no quick scores and no full scores.

`useRoute()` returns `{ path, focusKey, navigate }`. `navigate(path, { replace, quiet })` uses `location.replace("#" + path)` when `replace` is true, so redirects and the post-Reset jump do not trap the Back button. `quiet` suppresses the focus move and scroll (used by the newcomer redirect). After every non-quiet `hashchange`, `App` moves focus to the first `h2` of the new screen (it adds `tabindex="-1"`). Focus is never moved on first load.

`App` wraps the routed screen in an `ErrorBoundary` ("Your data may be damaged. Export or start over in Settings." with a link to `#/settings`). The screen column is 720px wide for `/`, `/welcome`, `/checkin`, `/journey`, `/settings`, and 960px for the rest. The footer holds three links: Framework, Sources, Settings & privacy.

## 3. Storage (E4)

All keys start with `life-improver:`. All values are JSON. `src/lib/storage.js` owns key names.

| Key | Shape | Owner hook |
|---|---|---|
| `life-improver:scores:v1` | `{ "<domainId>-<subIndex>": 1..10 }` | `useScores` (unchanged) |
| `life-improver:quick:v1` | `{ "<domainId>": 1..10 }` | `useQuickScores` |
| `life-improver:focus:v1` | `Focus` or `null` | `useFocus` |
| `life-improver:checkins:v1` | `CheckIn[]`, oldest first | `useCheckins` |
| `life-improver:meta:v1` | `{ schema: 2, createdAt: ISO string }` | `storage.js` |

```js
// Focus: this week's chosen subcategory and practice.
{
  domainId: 1,            // FRAMEWORK[i].id
  subIndex: 0,            // index into domain.subs
  practiceIndex: 3,       // index into sub.ideas
  startedAt: "2026-10-07",// local date, YYYY-MM-DD
  skipped: [1, 2]         // practice indices the user swapped away this focus
}

// CheckIn: one weekly reflection.
{
  id: "2026-10-07T18:22:01.000Z", // ISO timestamp, unique
  date: "2026-10-07",             // local date, YYYY-MM-DD
  week: "2026-W41",               // ISO week id
  domainId: 1,
  subIndex: 0,
  practiceIndex: 3,
  practised: "yes" | "some" | "no",
  score: 6,                       // 1..10 rating of the focus subcategory
  note: ""                        // free text, max 500 chars
}
```

Hooks validate stored values by shape and fall back to the empty value when the shape is wrong: `usePersistentState(key, initial, validate?)`. Validators live in `storage.js`: scores and quick are plain objects of numbers 1..10; focus is `null` or an object with numeric `domainId`, `subIndex`, `practiceIndex`; check-ins are an array of objects.

A check-in also writes its `score` into `useScores` for the same sub. The full assessment stays in sync.

### Migration helper

`runMigrations(storage = localStorage)` runs once at startup in `main.jsx`.
It writes `meta:v1` when missing. It is idempotent. It never deletes `scores:v1`.

### Export and import (E1)

- `exportData(storage)` returns `{ app: "life-improver", schema: 2, exportedAt, data: { scores, quick, focus, checkins } }`.
- `importData(json, storage)` validates `app` and `schema`. It throws `Error` with a human message on bad input. Check-in `date` must match `YYYY-MM-DD`; notes are cut to 500 characters. It overwrites the four keys. If any write fails, it restores the previous values of all keys and throws "This device has no room for the file." The UI reloads the page after import.

## 4. Library modules (pure, unit-tested)

Put pure logic in `src/lib/`. Components hold no business logic.

### `src/lib/dates.js`
- `toLocalDate(date = new Date())` → `"YYYY-MM-DD"` in local time.
- `isoWeek(date = new Date())` → `"YYYY-Www"` (ISO 8601 week, Monday start).
- `daysBetween(a, b)` → integer days between two `"YYYY-MM-DD"` strings.

### `src/lib/recommend.js`
- `suggestFocus({ scores, quick, framework })` → `{ domainId, subIndex, reason }` or `null`.
  1. Prefer the lowest full score among subs. Ties: lowest domain order, then lowest sub index.
  2. Else use the lowest quick domain score. Pick sub index 0 of that domain.
  3. Else return `null`.
  - `reason` is one short sentence. Example: `"Your lowest score: Sleep & Recovery (3/10)."`
- `suggestPractice({ framework, domainId, subIndex, checkins, skipped = [], today })` → `{ practiceIndex, reason }`.
  - Exclude indices in `skipped`.
  - Exclude practices used in a check-in for that sub within 28 days of `today`.
  - Pick the lowest remaining index. If none remains, ignore the 28-day rule. If still none, return index 0.
- `nextPractice(focus, framework, checkins, today)` → new `Focus` with the current index added to `skipped` and a new `practiceIndex`. When every practice would then be skipped, `skipped` resets to `[current]` and the index after the current one (wrapping) is chosen, so a swap always changes the practice.

### `src/lib/trends.js`
- `seriesFor(checkins, domainId, subIndex)` → `[{ date, score }]` oldest first.
- `changeSinceFirst(series)` → number or `null` when fewer than 2 points.
- `hasCheckinThisWeek(checkins, today)` → boolean.
- `weeksActive(checkins)` → count of distinct weeks.

### `src/lib/ics.js` (B1, B2)
- `buildEvent({ uid, title, description, url, start: Date, durationMin, rrule })` → RFC 5545 string with CRLF line endings.
  - Fold lines at 75 octets. Escape `,` `;` `\` and newlines in text.
  - Include `VCALENDAR`, `VERSION:2.0`, `PRODID:-//Life Improver//EN`, one `VEVENT`, `DTSTAMP` (UTC, `...Z`), `DTSTART` and `DTEND` as floating local time (`YYYYMMDDTHHMMSS`, no `Z`, no `TZID`, built from local getters so weekly reminders keep the same wall-clock time across DST), optional `RRULE`, optional `URL`.
- `checkinEvent({ start, appUrl })` → weekly RRULE `FREQ=WEEKLY`, 15 minutes, title `"Weekly check-in · Life Improver"`, URL `appUrl + "#/checkin"`.
- `practiceEvent({ start, practiceText, subName, appUrl })` → weekly RRULE, 20 minutes, title is the practice text cut to 60 chars.
- `downloadIcs(filename, text)` → triggers a browser download. Not unit-tested.

### `src/lib/shareCard.js` (C1)
- `drawShareCard(canvas, { domains: [{ name, avg }], overall, hideScores, date })` draws a 1080×1350 card.
- `shareOrDownload(canvas, filename)` uses `navigator.share` with a file when available. Else it downloads a PNG.

## 5. Hooks

- `useQuickScores()` → `{ quick, setQuick(domainId, value), reset() }`.
- `useFocus()` → `{ focus, setFocus(focus), clearFocus() }`.
- `useCheckins()` → `{ checkins, addCheckin(checkin), reset() }`.
- `useScores()` stays unchanged.
- `useToday()` → today's local date string, recomputed on `visibilitychange` and window `focus`. Screens use it instead of calling `toLocalDate()` on each render.

`App.jsx` creates all four hook instances once. It passes them as props. Name the props `scores`, `quick`, `focus`, `checkins`.

## 6. Screens

### Today (A7)
- Greeting line in the serif face. Example: "This week, tend one thing."
- Focus card: domain, sub name, practice text, reason line. Buttons: "Swap practice", "Add to calendar".
- When no focus exists: show the suggested focus and a "Plant this seed" button. Show "Choose another" which lists the 3 lowest subs.
- Check-in card: when no check-in exists this week, show "Check in" as the primary action. Else show "Checked in this week" and the last score.
- Calendar card: "Add a weekly check-in to my calendar". Pick day and time. Default Sunday 18:00.
- Small garden: 7 domain bars from full scores, else quick scores.

### Onboarding (A1, A2)
- Step 1 is the hero: eyebrow "Life Improver", serif headline "Your whole life. In one view.", one sentence of intro, a privacy line ("Everything stays on this device.") and a primary "Begin".
- Step 2: 7 domain sliders on one screen. A key press (arrows, Home, End, PageUp, PageDown) or a click records the resting value, so 5 can be chosen. Each shows the domain name and the first sentence of `desc`.
- Step 3: show the suggested focus with its reason. Buttons: "Plant this seed" and "Choose another".
- Finish writes quick scores and focus. Then navigate to `#/`.
- Offer "Skip to the full assessment" as a quiet link.

### CheckIn (A4, A6)
- Three questions on one screen. Practised? (yes, some, no). Rate the focus sub 1–10. Optional note.
- Save writes a `CheckIn`, updates `useScores`, shows a short reward screen with the change since the first check-in. Then offer "Keep this practice" or "Swap practice".

### Journey (A5)
- Empty state when no check-ins exist.
- Stats line: weeks active, check-ins total.
- One row per sub with check-ins: name, inline SVG sparkline, latest score, change since first.
- Log of check-ins, newest first, with note text.

### Settings (E1, E6)
- Export JSON button. Import JSON file input with a confirm step.
- Reset all data with confirm.
- Health disclaimer: "Life Improver offers reflection, not medical or psychological care. If you are in crisis, contact a professional or a local emergency number."
- Privacy: no accounts, no server, no tracking. Data lives in this browser.

### Share card (C1)
- Replace the "Screenshot to share" hint in the assessment dashboard with a "Share image" button.
- Show a toggle "Hide numbers". Default on.

## 7. PWA (B3)

- Add `vite-plugin-pwa`. Register the service worker from `main.jsx` with `registerSW({ immediate: true })` from `virtual:pwa-register` and `registerType: "autoUpdate"` (`injectRegister: false`), so a new version reloads the page by itself.
- Manifest: name "Life Improver", short_name "Life", theme `#2B6CB0`, background `#F5F5F5`, `display: standalone`, `start_url` and `scope` `/life-improver/`.
- Icons: 192 and 512 PNG plus a maskable 512 PNG in `public/`. Generate them from an SVG.

## 8. UI and UX rules

- Mobile first. Design for 375 px width. Touch targets at least 44 px.
- Keep the visual language: Source Sans 3, Source Serif 4, accent `#2B6CB0`, off-white `#F5F5F5`, white cards, 1 px `#D5D5D5` borders, square corners.
- One primary action per screen. Use `.btn-primary` for it.
- Calm tone. No red badges. No streak counters. No loss framing.
- Every interactive element has a visible focus style and an accessible name.
- Respect `prefers-reduced-motion`.
- Copy follows the contemplative voice in `CLAUDE.md`. Short sentences. Imperative mood.

## 9. Styling

- Reusable classes go into `src/styles.css` inside the section for your screen. Section markers look like `/* === v2: Today === */`.
- One-off layout stays inline.
- E7: delete `.bbg` and `.bf`. Keep `.btn-primary` and `.input` because v2 uses them.

## 10. Tests (E3)

- Vitest with `jsdom`. Script `npm test` runs `vitest run`.
- Unit tests for every function in `src/lib/` except download and canvas helpers.
- Component smoke tests with `@testing-library/react` for Today, Onboarding, CheckIn, Journey.
- CI runs lint, test and build.
