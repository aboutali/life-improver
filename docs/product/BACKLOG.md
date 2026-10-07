# Product Backlog: Life Improver v2

Read [VISION.md](./VISION.md) first.

## Legend

| Field | Values |
|---|---|
| Priority | **Now** = v2.0, **Next** = v2.1, **Later** = v3, **Won't** = rejected |
| Effort | S = under 1 day, M = 1–3 days, L = 1–2 weeks |
| Hook phase | Trigger, Action, Reward, Investment, Foundation |
| Status | Done in v2.0, Planned for v2.1, Planned for v3 |

## Epic A: Weekly loop (Now)

| ID | User story | Hook phase | Effort | Status |
|---|---|---|---|---|
| A1 | As a new user, I rate 7 domains in 1 minute, so I see my garden fast. | Action | M | Done in v2.0 |
| A2 | As a user, I pick one focus subcategory for the week. | Investment | S | Done in v2.0 |
| A3 | As a user, I receive 1 suggested practice for my focus. I can swap it. | Reward | M | Done in v2.0 |
| A4 | As a user, I complete a 2-minute weekly check-in. | Action | M | Done in v2.0 |
| A5 | As a user, I see my score trend per subcategory over weeks. | Reward | M | Done in v2.0 |
| A6 | As a user, I add a short note to each check-in. | Investment | S | Done in v2.0 |
| A7 | As a user, I see a home screen with this week's focus and practice. | Action | M | Done in v2.0 |

**Acceptance notes**

- A1: Store quick scores under a new key. Keep the `${domain.id}-${subIndex}` score shape.
- A3: Use rules for v2. Pick the lowest-scored subcategory. Skip practices done in the last 4 weeks.
- A4: Ask 3 questions. Did you practise? How often? Rate the focus subcategory 1–10.
- A4: Store check-ins under `life-improver:checkins:v1`.
- A5: Show a sparkline per subcategory. Show the change since the first check-in.

## Epic B: Triggers (Now)

| ID | User story | Hook phase | Effort | Status |
|---|---|---|---|---|
| B1 | As a user, I add a weekly check-in event to my calendar. | Trigger | S | Done in v2.0 |
| B2 | As a user, I add my chosen practice as a recurring calendar event. | Trigger | S | Done in v2.0 |
| B3 | As a user, I install the app to my home screen. | Trigger | M | Done in v2.0 |
| B4 | As a user, I receive a gentle reminder notification. | Trigger | L | Planned for v2.1 |

**Acceptance notes**

- B1, B2: Generate an `.ics` file in the browser. Use no OAuth and no Google API.
- B1: Put a deep link to the check-in screen into the event description.
- B3: Add a web app manifest and a service worker. Support offline use.
- B4: Priority Next. iOS allows web push only for installed apps.

## Epic C: Sharing (Now and Next)

| ID | User story | Priority | Hook phase | Effort | Status |
|---|---|---|---|---|---|
| C1 | As a user, I export my garden as an image card. | Now | Trigger | M | Done in v2.0 |
| C2 | As a user, I share a read-only link to my snapshot. | Next | Trigger | M | Planned for v2.1 |
| C3 | As a user, I compare my snapshot with a friend's link side by side. | Next | Reward | M | Planned for v2.1 |
| C4 | As a user, I invite a friend to the same practice for 4 weeks. | Later | Investment | L | Planned for v3 |
| C5 | As a user, I see my friend's check-in status for our shared practice. | Later | Reward | L | Planned for v3 |

**Acceptance notes**

- C1: Render the domain chart to a canvas. Offer PNG download and the Web Share API.
- C1: Let the user hide scores on the card. Default to domain shape only.
- C2: Encode the snapshot in the URL fragment. Send no data to a server.
- C3: Show both shapes as an overlay. Show no winner and no rank.
- C4, C5: Require accounts. Build after Epic F.

## Epic D: Smart recommendations (Next and Later)

| ID | User story | Priority | Effort |
|---|---|---|---|
| D1 | As a maintainer, I tag each practice with minutes, frequency, solo or social, and cost. | Next | L |
| D2 | As a user, I filter practices by time available. | Next | S |
| D3 | As a user, I see why the app suggests a practice. | Next | S |
| D4 | As a user, I get practices from a related subcategory after a stall. | Next | M |
| D5 | As a user, I describe my situation and receive tailored practices from Claude. | Later | L |

**Acceptance notes**

- D1: Tag 300 practices in `framework.js`. A cheaper model can draft tags. A human reviews them.
- D3: Show the reason in one line. Example: "Lowest score in Body. Takes 10 minutes."
- D5: Send data only after explicit consent. Restrict answers to the curated catalogue.

## Epic E: Foundation (Now)

| ID | Story | Effort | Status |
|---|---|---|---|
| E1 | Export and import all data as JSON. | S | Done in v2.0 |
| E2 | Add a router for home, check-in, history, explore and share pages. | M | Done in v2.0 |
| E3 | Add Vitest with tests for hooks and the recommendation rules. | M | Done in v2.0 |
| E4 | Add a schema version and a migration helper for all storage keys. | S | Done in v2.0 |
| E5 | Add privacy-friendly analytics with opt-in. Count weekly check-ins only. | M | Planned for v2.1 |
| E6 | Add a health disclaimer and a privacy page. | S | Done in v2.0 |
| E7 | Prune unused CSS classes `.bbg` and `.bf`. Keep `.input` and `.btn-primary` for v2. | S | Done in v2.0 |

## Epic F: Accounts and sync (Later)

| ID | Story | Effort |
|---|---|---|
| F1 | Sign in with email magic link. | L |
| F2 | Sync scores and check-ins across devices with end-to-end encryption. | L |
| F3 | Create a private circle of up to 5 friends. | L |
| F4 | Delete the account and all server data in one step. | M |

## Rejected (Won't)

| ID | Story | Reason |
|---|---|---|
| X1 | Global ranking against all users | Upward comparison lowers well-being. Self-ratings differ between people. |
| X2 | Streaks with loss warnings | Loss framing creates guilt. Use seasons and gentle resumes instead. |
| X3 | Badges and points | Extrinsic rewards crowd out intrinsic motivation. |

## Release plan

| Release | Content | Goal |
|---|---|---|
| v2.0 | A1–A7, B1–B3, C1, E1–E4, E6–E7 | 30% of new users complete a second check-in |
| v2.1 | B4, C2–C3, D1–D4, E5 | 20% of users are weekly practicing users after 4 weeks |
| v3 | C4–C5, D5, F1–F4 | Friends invite each other into shared practices |

## v2.0 notes

Decisions taken during the build:

- Onboarding continues after 4 of 7 domains are rated. The rest can wait for the full assessment.
- Today has a "Choose another focus" action.
- Calendar files use floating local time. A weekly reminder keeps its wall-clock time across daylight saving changes.
- The installed app updates itself. A new version reloads the page.
- Mobile bottom navigation has four items: Today, Journey, Assess, and Practices.
- The footer holds Framework, Sources, and Settings & privacy.

## Open questions for the product owner

1. Should the full 30-item assessment stay, or become an optional deep dive?
2. Should the app stay free and open source, or test a paid tier with Claude recommendations?
3. Which platform matters most: mobile web, desktop or an installed PWA?
4. Should content stay English only, or add German?
