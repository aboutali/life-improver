# Responsive text UX — design spec

**Date:** 2026-06-17
**Status:** Approved, ready for implementation
**Scope:** Make text scale well across desktop / tablet / mobile. Text + readability spacing only — no layout reflow.

## Decisions

- **Scaling method:** fluid `clamp()` (text scales smoothly with viewport; no breakpoint jumps).
- **Preserve desktop:** every token's `max` equals the current desktop pixel size, so the desktop view is pixel-identical. Only tablet/mobile shrink.
- **Body/small copy (13–15px) stays as inline px** — it already reads fine on phones (honors CLAUDE.md "don't promote inline styles to classes prematurely").
- **No CSS framework / no new dependencies** — hand-rolled, per CLAUDE.md.

## Type tokens (added to `:root` in `src/styles.css`)

| Token | Role | Mobile floor → Desktop max | Value |
|---|---|---|---|
| `--fs-display` | dashboard hero score | 44 → 80px | `clamp(2.75rem, 1rem + 7vw, 5rem)` |
| `--fs-h1` | page headline | 24 → 30px | `clamp(1.5rem, 1rem + 2vw, 1.875rem)` |
| `--fs-title` | per-sub score readout | 18 → 20px | `clamp(1.125rem, 0.9rem + 0.6vw, 1.25rem)` |
| `--fs-lead` | section ledes & sub-names | 16 → 18px | `clamp(1rem, 0.9rem + 0.45vw, 1.125rem)` |

Referenced inline as `fontSize: "var(--fs-h1)"`, etc.

## Size → token mapping (the contract — exact, per file)

Only the large display text changes. Everything else stays as-is.

- **`src/components/Header.jsx`**
  - h1 headline: `fontSize: 30` → `fontSize: "var(--fs-h1)"`.
  - Header block padding `"40px 24px 32px"` → `"clamp(24px, 6vw, 40px) 24px clamp(20px, 5vw, 32px)"` (readability spacing — tighten top/bottom on mobile).
- **`src/components/SelfAssessment.jsx`**
  - Dashboard overall number: `fontSize: 80` → `fontSize: "var(--fs-display)"`.
  - Per-sub score readout (the big number next to the tier label, value `fontSize: 20`): → `fontSize: "var(--fs-title)"`.
  - Section lede "How are you, really?" (`fontSize: 18`): → `fontSize: "var(--fs-lead)"`.
- **`src/components/Overview.jsx`**
  - Section lede "The seven dimensions." (`fontSize: 18`): → `fontSize: "var(--fs-lead)"`.
  - **Do NOT touch** the `▾` chevron, which is also `fontSize: 18` — it is an icon, not text.
- **`src/components/Ideas.jsx`**
  - Section lede "{TOTAL_IDEAS} ways forward." (`fontSize: 18`): → `fontSize: "var(--fs-lead)"`.
  - Subcategory name heading (`fontSize: 18`, fontWeight 600): → `fontSize: "var(--fs-lead)"`.
- **`src/components/Sources.jsx`**
  - Section lede "The thinking behind it." (`fontSize: 18`): → `fontSize: "var(--fs-lead)"`.

## Other stylesheet change

- Remove the now-redundant `h1 { font-size: 24px !important; }` from the `@media (max-width: 700px)` block — `--fs-h1` supersedes it.

## Out of scope (deferred)

Pill-row wrapping, the dashboard's fixed 130px label columns and 2-col grid reflow, the empty-state/16px domain-name sizes. These are layout, not text.

## Verification

Run the dev server and screenshot the running app at **1280px (desktop)**, **768px (tablet)**, and **375px (mobile)**, across the four tabs. Confirm: desktop unchanged; headline + dashboard score shrink sensibly on mobile with no overflow; section ledes ease down to 16px on phones.
