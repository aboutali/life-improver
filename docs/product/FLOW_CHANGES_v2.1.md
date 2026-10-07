# Flow Changes v2.1

Source: 30 end-to-end user stories in `e2e/`, run on phone and desktop. See [USER_STORIES.md](./USER_STORIES.md).
Result: no crashes. Several flows confuse users or dead-end. This document lists the decided changes.

## Theme 1: Choosing a focus is one flow

Problem: the picker shows one domain (S03) or only scored subs (S14). Practices cannot be adopted (S20). Assess ignores Today (S04, S21, S22).

| ID | Change |
|---|---|
| F1 | The focus picker has two parts. "Suggested" lists 3 subs: the lowest full scores, topped up with sub 0 of the lowest quick-rated domains not yet represented. "All areas" lists the 7 domains as expandable groups with every sub. |
| F2 | Each practice row on Practices has a "Practise this week" button. It plants that sub and practice with `origin: "practice"` and navigates to Today. The current practice shows a "This week" tag. |
| F3 | Practices reads `?d=<domainId>&s=<subIndex>` and preselects that domain and sub. |
| F4 | The Assess dashboard shows a primary "See this week's focus" button to Today. Each "Focus here" row has a "Make this my focus" button. |
| F5 | Today shows a quiet card when another scored sub is at least 2 points below the focus sub: "<Sub> is now your lowest (2/10). Switch your focus?" Buttons: "Switch" and "Not now". "Not now" hides the card for that sub until its score changes. |
| F6 | The reason line keeps how the focus was chosen. `origin: "picked"` or `"practice"` reads "You chose this place to begin." |

## Theme 2: The weekly rhythm

| ID | Change |
|---|---|
| R1 | Check-in opens 3 days after `startedAt`. Before that, Today shows "Your first check-in opens <weekday>." in muted text and a quiet "Check in early" link. |
| R2 | Calendar defaults: practice event tomorrow at 07:30; check-in event Sunday 18:00, at least 3 days after today. Each panel shows "First one: <weekday, date>". |
| R3 | The reward view shows "Next check-in: <weekday>". |
| R4 | When `practised` is "no", the reward says "A week without it happens. Smaller is fine." The secondary action reads "Try a smaller practice" and swaps. |
| R5 | The score question is not pre-filled. A hint shows "Last time: 5". |
| R6 | After 4 check-ins on the same sub since `startedAt` or `reviewedAt`, Today shows "Four weeks with <Sub>. Stay for another season, or choose a new focus?" "Stay" writes `reviewedAt: today` on the focus. "Choose" opens the picker. |
| R7 | When the last check-in is more than 14 days old, Today opens with "Welcome back. It has been <n> weeks." Buttons: "Pick up this practice" (hides the card for this visit) and "Start fresh" (opens the picker). |
| R8 | `useToday` also re-checks the date every 60 seconds. |
| R9 | The reward's swap button reads "Try a different practice". |

## Theme 3: First time

| ID | Change |
|---|---|
| O1 | Wizard steps are routes: `#/welcome`, `#/welcome/rate`, `#/welcome/focus`. Back moves between steps. |
| O2 | The draft ratings live in `sessionStorage` (`life-improver:draft`) until "Plant this seed". A reload keeps them. |
| O3 | Welcome offers "I have a saved copy" with a file input. A restore goes to Today with a notice "Restored <n> check-ins." |
| O4 | Empty states on Check-in and Journey link straight to `#/welcome` ("Begin with a one-minute welcome"). |
| O5 | A newcomer on any route except welcome sees a slim banner "New here? Begin with a one-minute welcome." |

## Theme 4: Trust in saved data

| ID | Change |
|---|---|
| D1 | Unparsable JSON is copied to `<key>:bad` before it is replaced. |
| D2 | When saving fails, a persistent banner says "Saving is off in this browser. Download a copy before you leave." "Download a copy" exports the in-memory state. |
| D3 | When a sanitizer drops data, Today shows "Some saved data could not be read." with a link to Settings. Settings offers "Download the damaged copy". |
| D4 | Restore skips the confirm dialog when no data exists. After restore, Today shows "Restored <n> check-ins." |

## Theme 5: Navigation and access

| ID | Change |
|---|---|
| N1 | The header has a Settings link (gear icon with label "Settings") on all screen sizes. |
| N2 | A "Skip to content" link is the first focusable element. |
| N3 | Assess, Practices, Framework and Sources titles become `<h2>`. |
| N4 | Framework accordion headers are buttons with `aria-expanded`. Each sub name links to `#/practices?d=..&s=..`. |
| N5 | Sources shows a "Browse the practices" link at the top. |
| N6 | The note textarea shows the global focus outline. |
| N7 | Garden marks partial domain averages: "8.0 · 1 of 5 rated". It uses the full average only when at least half the subs are rated; else the quick score with the partial count. |
| N8 | Journey groups the log by week, newest first. The sparkline uses the latest score per week. Older weeks beyond 6 collapse behind "Show earlier weeks". |

## Not changed

- Swap counter and "maybe a different subject" after 5 swaps. F1 and R6 cover the need.
- Hiding Today and Journey tabs for newcomers. O5 covers the need with less surprise.
