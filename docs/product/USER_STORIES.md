# User Stories for End-to-End Tests

Each story becomes a Playwright test in `e2e/`. Tests run on a phone (Pixel 7) and a desktop project.
Clock start: Wednesday 2026-10-07 10:00 local. Use `freezeAt` and `page.clock` to move time.

Hypotheses mark places where the flow may not make sense. Tests record friction for them.

## Group 1: First time and first week (`e2e/onboarding.spec.js`)

| ID | Story | Expected today | Hypothesis |
|---|---|---|---|
| S01 | A newcomer rates all 7 domains and plants the suggested seed. | Steps are routes (`#/welcome/rate`, `#/welcome/focus`). Lands on Today with a focus (`origin: "suggested"`); the draft is cleared. | None. |
| S02 | A newcomer rates only 4 domains and continues. | Suggestion uses rated domains only; unrated garden rows are empty, not drawn as rated. | Unrated domains may look rated in the garden. Not confirmed. |
| S03 | A newcomer picks another focus on step 3. | Picker has "Suggested" (3 subs from the quick ratings) and "All areas" (7 expandable domains with every sub). A sub from any domain can be chosen; Today says "You chose this place to begin." | Fixed in v2.1 (F1, F6). |
| S04 | A newcomer skips to the full assessment and rates one domain. | The dashboard has a primary "See this week's focus" button to Today, which suggests the lowest sub. | Fixed in v2.1 (F4). |
| S05 | A newcomer presses Back or reloads during step 2 or step 3. | Back moves between steps; reload keeps the step and the ratings (`sessionStorage` draft); nothing is saved until "Plant this seed". | Fixed in v2.1 (O1, O2). |
| S06 | A user plants a seed and looks at Today on the same day. | Today invites practice. The check-in card says "Your first check-in opens Saturday." with a quiet "Check in early" link and no primary button. | Fixed in v2.1 (R1). |
| S07 | A user adds the practice and the weekly check-in to the calendar. | Practice defaults to tomorrow 07:30, check-in to the first Sunday 18:00 at least 3 days out; each panel says "First one: <date>". Two valid `.ics` files that do not collide. | Fixed in v2.1 (R2). |
| S08 | A newcomer opens `#/checkin`, `#/journey` or `#/assess` directly. | A slim "New here?" banner on each; check-in and Journey empty states link straight to `#/welcome` ("Begin with a one-minute welcome"). | Fixed in v2.1 (O4, O5). |
| S30 | A user restores a saved copy from the welcome screen. | A wrong file shows an inline error and changes nothing; a real export lands on Today with "Restored 2 check-ins." (dismissable). | New in v2.1 (O3, D4). |
| S31 | A user opens `#/welcome/focus` without a draft. | Redirects to `#/welcome/rate`; with fewer than 4 ratings it stays there; with 4 in the draft the link opens the step. | New in v2.1 (O1, O2). |
| S32 | A newcomer opens `#/practices`. | The slim banner shows and links to the welcome; it disappears once one sub is rated. | New in v2.1 (O5). |
| S33 | A user looks at Today before and on day 3 of a focus. | Before: "Your first check-in opens Thursday." and "Check in early". On Thursday (clock moved, no reload): the primary "Check in" button. | New in v2.1 (R1, R8). |
| S34 | A user plants on a Sunday and opens the calendar panels. | Practice first date is Monday; check-in first date is the Sunday a week later (at least 3 days out); other days follow the same rule. | New in v2.1 (R2). |

## Group 2: The weekly loop over time (`e2e/weekly-loop.spec.js`)

| ID | Story | Expected today | Hypothesis |
|---|---|---|---|
| S10 | A user checks in 4 days after planting and keeps the practice. | Form starts empty, no "Last time" hint for a quick-score-only user. Reward says "Next check-in: Sunday". Today shows "checked in". | None. |
| S11 | A user checks in, swaps the practice, and returns next week. | Reward button reads "Try a different practice". New practice shown, check-in due again, "Last time: 5" hint. | None. |
| S12 | A user checks in twice in one week. | Second entry allowed. Journey counts the week once, marks the second entry "Added later", and plots one point for the week. | Fixed in v2.1 (N8). The season card says "Four weeks" after 4 check-ins, even when only 3 weeks passed. |
| S13 | A tab stays open from Sunday 23:50 to Monday 00:10. | Today shows check-in due again with no focus or visibility event. | Fixed in v2.1 (R8). |
| S14 | A user checks in 4 weeks on one sub with rising scores. | Today shows the season card "Four weeks with <Sub>". "Choose" opens the two-part picker (Suggested, All areas). | Fixed in v2.1 (R6, F1). |
| S15 | A user returns after 5 weeks without a check-in. | Welcome-back card. "Pick up this practice" hides it for the visit, even after reload. "Not this week" reward offers "Try a smaller practice". | Fixed in v2.1 (R7, R4). |
| S16 | A user answers "Not this week" with a score of 2. | Score not pre-filled, "Last time: 4" hint. Reward says "A week without it happens. Smaller is fine." | Fixed in v2.1 (R4, R5). |
| S17 | A user swaps 11 times, then chooses another focus. | Picker lists Suggested subs. Picking one sets origin "picked" and the reason "You chose this place to begin." Journey shows both subs. | Fixed in v2.1 (F1, F6). |
| S18 | A user opens the calendar link `#/checkin` after checking in. | Note about the existing check-in. | None. |
| S19 | A user has 8 weeks of data across 2 subs. | Journey shows 6 weeks, newest first, with "Show earlier weeks" for the rest. | Fixed in v2.1 (N8). |
| S40 | A user finishes a season (4 check-ins) and taps "Stay". | `reviewedAt` is written, the card goes and stays gone after reload, and the next season counts from the review. | None. |
| S41 | A user finishes a season and taps "Choose". | The picker opens and decides nothing. "Keep this focus" closes it, the card stays. Picking a sub plants it and removes the card. | None. |
| S42 | A user returns after 5 weeks and taps "Start fresh". | The picker opens and the card goes. A new focus shows "Your first check-in opens Saturday." History stays. | None. |
| S43 | A user returns after exactly 14, then 15 days. | No card at 14 days. At 15 days "It has been 2 weeks." | None. |
| S44 | Another sub is 3 points below the focus; the user taps "Switch". | Nudge card names the sub and score. Switch plants it with origin "picked". | None. |
| S45 | The user taps "Not now" on the nudge. | Card hidden and stays hidden after reload. When that sub's score changes, it returns. | None. |
| S46 | A user checks in on a Saturday. | Reward says "Next check-in: Sunday" (tomorrow). | Weekday without a date reads like a daily rhythm. |
| S47 | The score question on the check-in form. | Starts empty with a "Last time: N" hint tied to the group. Save needs both answers. | None. |
| S48 | Journey with entries over 2 weeks, 2 in the first. | Week headings newest first. One sparkline point per week (latest score). No "Show earlier weeks" under 7 weeks. | None. |

## Group 3: Other stories (`e2e/other.spec.js`)

| ID | Story | Expected today | Hypothesis |
|---|---|---|---|
| S20 | A user browses Practices and adopts one as this week's practice. | The current practice shows a "This week" tag and no button; every other row has "Practise this week". One tap plants it (`origin: "practice"`, `startedAt` today), goes to Today, and the reason reads "You chose this place to begin." The tag moves. | Fixed in v2.1 (F2, F6). Adopting inside the current sub restarts the check-in clock, so a person with 2 check-ins reads "Your first check-in opens Saturday." (friction). |
| S21 | A user completes all 30 subs, shares the image, returns to Today. | Image downloads. The dashboard has "See this week's focus" and "Make this my focus" on each "Focus here" row except the current focus. Today keeps the focus and shows "Humor is now your lowest (2/10). Switch your focus?"; Switch plants Humor. | Fixed in v2.1 (F4, F5). |
| S22 | A user lowers another sub below the focus sub in Assess. | One point lower: silent. Two points lower: nudge card with Switch and "Not now". "Not now" hides it, survives a reload, and it returns when that sub's score changes. | Fixed in v2.1 (F5). |
| S23 | A user downloads a copy, starts over, restores in a new browser. | Welcome offers "I have a saved copy". On an empty device no confirm dialog; lands on Today with "Restored 2 check-ins." On a device with data Settings still asks to confirm. | Fixed in v2.1 (O3, D4). |
| S24 | Storage throws (private mode). | A persistent "Saving is off in this browser" alert (no dismiss) from the first screen. The loop works in memory. "Download a copy" in the banner and in Settings exports the in-memory check-in and focus. A reload loses everything. | Fixed in v2.1 (D2). |
| S25 | A keyboard-only user completes the loop on desktop. | "Skip to content" is the first stop and moves focus to main. Focus ring on every control. Framework headers are buttons that open with Enter; sub names are links. | Fixed in v2.1 (N2, N4, R1). |
| S26 | Every route has named controls and a sane heading order. | No unnamed controls, one h1, at least one h2 per route, no heading jumps, no mouse-only clickable elements. Focus lands on the screen title after nav. | Fixed in v2.1 (N3, N4). |
| S27 | A phone user reaches Framework, Sources and Settings. | Settings: gear in the header, one tap, 44px, on every screen size. Framework and Sources: tabs on desktop, footer links on a phone. | Settings fixed in v2.1 (N1). Framework and Sources are still footer-only on a phone. |
| S28 | Framework and Sources link to related practices. | Framework headers are buttons with `aria-expanded`; each sub name links to `#/practices?d=..&s=..` and opens that sub. | Fixed in v2.1 (N4, F3). |
| S29 | Damaged storage shows a recovery path. | "Some saved data could not be read." with "Open Settings" on every route (dismissable). Settings offers "Download the damaged copy" (also after a reload). | Fixed in v2.1 (D3). |
| S29b | Unparsable JSON is stored under a key. | The broken text is copied to `<key>:bad` before the default replaces it; the notice shows; the damaged copy holds the text. | Fixed in v2.1 (D1). Was `test.fail()`. |
| S50 | A user opens Practices by a link `?d=&s=`. | The domain and sub open with their rows. A new link while open moves the selection. A missing or bad `s` opens sub 0. An unknown `d` or the old names show "Pick a domain." | New in v2.1 (F3). On a phone the selected pill can be scrolled out of view, and picking a pill does not update the address. |
| S51 | A user uses the skip link and the Settings gear on any screen. | On all 9 routes: the first Tab stop is "Skip to content", visible when focused; Enter focuses main and keeps the route. The gear is a labelled 44px link inside the first screen, `aria-current` on Settings. | New in v2.1 (N1, N2). |
| S52 | A user taps "Make this my focus" in Assess. | The focus row has no button. Another sub plants (`origin: "picked"`), goes to Today, no nudge when it is only 1 point away. "See this week's focus" changes nothing. | New in v2.1 (F4, F6). |
| S53 | Writes fail after load (storage full). | Existing data is shown. The banner stays on every screen. A practice adopted now lives in memory and is in the banner's download; the stored focus is unchanged. | New in v2.1 (D2). |
| S54 | A user reads Sources and wants the practices. | One link, "Browse the practices", at the top, 44px high. It opens Practices with focus on the title. | New in v2.1 (N5). It opens the bare picker, not the sub a source note names. |
| S55 | A user adopts a practice from another domain via a deep link. | No "This week" tag in a sub not in use. Adopting plants it; Today says "Your first check-in opens Saturday."; no nudge; the picker still lists subs only; Journey keeps the old check-ins. | New in v2.1 (F2, F3). |
