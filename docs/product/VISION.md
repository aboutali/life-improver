# Product Vision: Life Improver v2

> A garden is planted one seed at a time.

## 1. Where we stand

Life Improver is a reference work today.
It holds 7 domains, 30 subcategories and 300 practices.
A user rates 30 subcategories once and reads a dashboard.
After that visit, the app gives the user no reason to return.
All data stays in the browser. No account exists. No backend exists.

## 2. Challenges to the proposed direction

### 2.1 The app lacks a loop

Nir Eyal's Hook Model has four phases: trigger, action, variable reward, investment.
The current app covers one action and one reward.
The app has no trigger. The app has no investment.
Features like screenshots and rankings sit at the edge of a loop.
Build the weekly loop first. Add social features on top of the loop.

### 2.2 Ranking against other users harms the product

Upward social comparison lowers well-being. Research on social media shows this effect repeatedly.
Self-ratings on a 1–10 scale differ in meaning between people. One person's 6 equals another person's 8.
A leaderboard therefore ranks optimism. Life quality stays invisible.
A global ranking also clashes with the contemplative voice of the content.
Eyal's Manipulation Matrix asks two questions. Would the maker use the feature? Does the feature improve the user's life?
A global ranking fails the second question.
Recommendation: drop global ranking. Compare a user with the user's own past.

### 2.3 Comparing with friends needs a narrower form

A friend comparison of raw scores carries the same risks as a ranking.
A friend comparison of shared practices carries fewer risks.
Two friends can pick the same practice and check in together.
Recommendation: share a snapshot by link first. Add shared practices later.

### 2.4 300 practices overwhelm a new user

Choice overload stops action.
A user needs one next step.
Recommendation: suggest 1 practice per week. Let the user swap the practice.

### 2.5 Social features need a backend

Friends, check-in reminders and rankings need accounts and servers.
A backend raises cost, privacy duty and GDPR work.
A small product can delay the backend.
Recommendation: stay local-first for v2. Use share links, calendar files and image export.

### 2.6 The target user is undefined

"Everyone who wants a better life" defines no market.
Recommendation: target reflective adults aged 25–45.
These users read books on habits and philosophy.
These users distrust gamified wellness apps.
These users value privacy and evidence.

### 2.7 Success needs a metric

Time in app is the wrong metric for this product.
Recommendation: track **weekly practicing users**.
A weekly practicing user completes at least one check-in per week.

## 3. Vision statement

Life Improver helps reflective adults tend one area of life per week.
The app sees the whole life. The user plants one seed.
The app reminds the user gently. The app shows growth over seasons.

## 4. The Hook Model applied

| Phase | v1 today | v2 target |
|---|---|---|
| External trigger | none | calendar event, share link from a friend |
| Internal trigger | vague unease about life | "I feel stuck in one area" |
| Action | rate 30 subcategories | 2-minute weekly check-in |
| Variable reward | static dashboard | new insight, trend change, fresh practice |
| Investment | scores in localStorage | history, notes, chosen practices |

## 5. Product principles

1. **One seed at a time.** Show one practice per focus area.
2. **Compare with your past self.** Show trends. Hide global ranks.
3. **Privacy first.** Keep data on the device until the user opts in.
4. **Calm design.** Avoid streak pressure, red badges and loss framing.
5. **Evidence visible.** Link every practice to its source.
6. **Leave easily.** Export all data at any time.

## 6. Scope of v2

v2 ships the weekly loop without a backend:

1. Quick onboarding assessment.
2. One focus area and one practice per week.
3. Calendar event for the weekly check-in.
4. Check-in with history and trend.
5. Share card as image and share link.

v3 adds accounts, sync and friend circles after v2 shows retention.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Users ignore calendar reminders | Test PWA notifications in v2.1 |
| localStorage loss erases history | Offer JSON export and import |
| Sub reorder strands stored scores | Keep append-only rule, version storage keys |
| Content tone drifts in new practices | Review practices against CLAUDE.md voice rules |
| Health claims trigger liability | Add disclaimer, avoid clinical language |
