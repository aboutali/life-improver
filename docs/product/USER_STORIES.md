# User Stories for End-to-End Tests

Each story becomes a Playwright test in `e2e/`. Tests run on a phone (Pixel 7) and a desktop project.
Clock start: Wednesday 2026-10-07 10:00 local. Use `freezeAt` and `page.clock` to move time.

Hypotheses mark places where the flow may not make sense. Tests record friction for them.

## Group 1: First time and first week (`e2e/onboarding.spec.js`)

| ID | Story | Expected today | Hypothesis |
|---|---|---|---|
| S01 | A newcomer rates all 7 domains and plants the suggested seed. | Lands on Today with a focus. | None. |
| S02 | A newcomer rates only 4 domains and continues. | Suggestion uses rated domains only. | Unrated domains may look rated in the garden. |
| S03 | A newcomer picks another focus on step 3. | Today shows the picked sub. | Picker lists subs of one domain only. |
| S04 | A newcomer skips to the full assessment and rates one domain. | Today offers a suggestion. | No clear path from Assess back to Today. |
| S05 | A newcomer presses Back or reloads during step 2 or step 3. | Draft survives or the loss is gentle. | Back leaves the app. Reload loses the draft. |
| S06 | A user plants a seed and looks at Today on the same day. | Today invites practice first. | Today asks for a check-in on day 0. |
| S07 | A user adds the practice and the weekly check-in to the calendar. | Two valid `.ics` files with sensible times. | Check-in time may land before the first practice week ends. |
| S08 | A newcomer opens `#/checkin`, `#/journey` or `#/assess` directly. | Each screen explains the next step. | Empty states may dead-end. |

## Group 2: The weekly loop over time (`e2e/weekly-loop.spec.js`)

| ID | Story | Expected today | Hypothesis |
|---|---|---|---|
| S10 | A user checks in 4 days after planting and keeps the practice. | Reward view, then Today shows "checked in". | None. |
| S11 | A user checks in, swaps the practice, and returns next week. | New practice shown, check-in due again. | None. |
| S12 | A user checks in twice in one week. | Second entry allowed with a note. | Journey may double-count weeks. |
| S13 | A tab stays open from Sunday 23:50 to Monday 00:10. | Today shows check-in due again. | Stale date until focus or visibility change. |
| S14 | A user checks in 4 weeks on one sub with rising scores. | The app suggests a next focus. | The app never suggests moving on. |
| S15 | A user returns after 5 weeks without a check-in. | A calm welcome back. | No acknowledgement of the gap. |
| S16 | A user answers "Not this week" with a score of 2. | Reward copy stays kind. | Copy may sound like a reward for nothing. |
| S17 | A user swaps 11 times, then chooses another focus. | Journey shows both subs after check-ins. | None. |
| S18 | A user opens the calendar link `#/checkin` after checking in. | Note about the existing check-in. | None. |
| S19 | A user has 8 weeks of data across 2 subs. | Journey stays readable. | Log grows long without grouping. |

## Group 3: Other stories (`e2e/other.spec.js`)

| ID | Story | Expected today | Hypothesis |
|---|---|---|---|
| S20 | A user browses Practices and wants one as this week's practice. | One action adopts it. | No way to adopt a practice. |
| S21 | A user completes all 30 subs, shares the image, returns to Today. | Image downloads, Today matches the lowest sub. | Today keeps an old focus without comment. |
| S22 | A user lowers another sub below the focus sub in Assess. | Today offers to switch. | Nothing changes. |
| S23 | A user downloads a copy, starts over, restores in a new browser. | Data returns. | None. |
| S24 | Storage throws (private mode). | App works in memory and says so. | Silent data loss. |
| S25 | A keyboard-only user completes the loop on desktop. | Visible focus, logical order. | Missing skip link. |
| S26 | Every route has named controls and a sane heading order. | No unnamed controls. | None. |
| S27 | A phone user reaches Framework, Sources and Settings. | Reachable in 2 taps. | Footer links are hard to find. |
| S28 | Framework and Sources link to related practices. | A path back to action. | Dead ends. |
| S29 | Damaged storage shows a recovery path. | Message plus Settings link. | None. |
