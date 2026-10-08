# Mobile UI System

Goal: on a phone the app feels like a native app. On a desktop it stays a calm, readable page.
Tokens and core components live in the global part of `src/styles.css`. Screens use them. Screens add no new colours, radii or font sizes.

## Principles

1. **App chrome.** A translucent app bar on top, a translucent tab bar below, content between. No masthead, no footer on phones.
2. **One large title per screen.** The screen's `<h2>` uses `.t-large`. The app bar shows a small title once the large title scrolls away.
3. **Surfaces, not boxes.** Rounded cards (`.cd`) and grouped lists (`.list` with `.row`) without borders. Soft shadow only.
4. **Readable type.** Body 17 px on phones. Nothing below 14 px except tab labels and eyebrows (12 px, bold, uppercase).
5. **Buttons look like buttons.** Primary is filled and full width on phones. Secondary is tinted (`.btn`). Tertiary is a text button without underline. Underlined links only inside running text.
6. **Thumb reach.** Flows (check-in, onboarding steps 2 and 3) put their primary action in a sticky `.action-bar` at the bottom.
7. **Touch.** Targets at least 44 px. Pressed states scale or dim. No hover-only cues.

## Tokens

| Group | Tokens |
|---|---|
| Colour | `--bg`, `--surface`, `--surface-2`, `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-press`, `--accent-tint`, `--accent-tint-2`, `--danger`, `--danger-tint`, `--separator`, `--bar-bg` |
| Shape | `--r-card` 16, `--r-ctl` 12, `--r-pill`, `--shadow-card`, `--shadow-bar` |
| Space | `--s1` 4 to `--s8` 40 on an 8-point grid, `--gutter` 24 desktop and 16 phone |
| Type | `--fs-large-title`, `--fs-title`, `--fs-headline`, `--fs-body`, `--fs-callout`, `--fs-footnote`, `--fs-caption`, `--fs-display` |
| Controls | `--ctl-h` 44 desktop and 50 phone, `--appbar-h` 52, `--tabbar-h` 56, `--safe-top`, `--safe-bottom` |

Tier colours in the assessment stay as they are. They carry meaning.

## Components

| Class | Use |
|---|---|
| `.t-large`, `.t-title`, `.t-head`, `.t-body`, `.t-sub`, `.t-foot`, `.t-eyebrow` | Text roles. Prefer these over inline font sizes. |
| `.cd` | Card. 16 px padding on phones, 20 px on desktop, 12 px gap below. |
| `.list`, `.row`, `.chev`, `.list-title` | Grouped list. Rows are 52 px or taller with an inset separator. Use for navigation lists, logs and pickers. |
| `.btn` | Secondary, tinted. |
| `.btn-primary` | Primary, filled. Full width on phones. One per screen region. |
| `.btn-danger` | Destructive, tinted red. |
| `.btn-block` | Full width at every size. |
| `.btn-text` | Tertiary text button, accent colour, no underline, 44 px target. |
| `.sp`, `.dp` | Pill chips for sub and domain selection. |
| `.action-bar` | Sticky bottom bar for a flow's primary action. Place it as the last child of the screen. |
| `.input` | Fields. Font size at least 16 px to stop iOS zoom. |

## App bar (phones, below 700 px)

- Sticky at the top. Height `--appbar-h` plus `--safe-top`. Background `--bar-bg` with blur. Hairline below once content scrolls under it.
- Left: a back button (chevron plus parent label) on pushed screens. Pushed screens: `/checkin`, `/settings`, `/framework`, `/sources`, `/welcome/rate`, `/welcome/focus`. Back goes to the parent route: `/` for most, `/welcome` and `/welcome/rate` for the wizard steps, `/practices` for Framework and Sources.
- Centre: the small screen title. It fades in when the screen's large title leaves the viewport.
- Right: the Settings gear on tab screens.
- `/welcome` shows no app bar content except the step progress.

On desktop the header keeps the wordmark and the top tabs, restyled with tokens.

## Tab bar (phones)

- Four tabs: Today, Journey, Assess, Practices. Translucent with blur. Active tab in accent.
- Hidden on flows and pushed screens: `/welcome*`, `/checkin`, `/settings`.

## Footer

- Hidden on phones. The attribution line moves to Settings in an "About" card. Framework and Sources appear as rows in Settings and as links on Practices.
- Desktop keeps the footer.

## Screen rules

- Each screen starts with its large title, then an optional `.t-sub` intro of one or two sentences.
- Content sits on `--bg` with `--gutter` side padding. Cards stack with 12 px gaps.
- Eyebrows above titles use `.t-eyebrow`.
- Numbers use `font-variant-numeric: tabular-nums`.
