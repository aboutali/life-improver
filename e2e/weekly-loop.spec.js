import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, readStore, trackErrors, friction, RETURNING } from "./helpers.js";
import { isoWeek } from "../src/lib/dates.js";

// ---------- local helpers ----------

const at = (iso) => new Date(iso);

async function shot(page, testInfo, id, step) {
  await page.screenshot({
    path: `e2e/.artifacts/${id}-${testInfo.project.name}-${step}.png`,
    fullPage: true,
  });
}

// Move the browser clock and let the app re-read the date, like a user
// coming back to the tab.
async function moveTo(page, date) {
  await page.clock.setSystemTime(date);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
}

function entry(date, domainId, subIndex, practiceIndex, practised, score, note = "") {
  return {
    id: `${date}T18:00:00.000Z`,
    date,
    week: isoWeek(date),
    domainId,
    subIndex,
    practiceIndex,
    practised,
    score,
    note,
  };
}

const QUICK = { 1: 4, 2: 7, 3: 6, 4: 8, 5: 5, 6: 6, 7: 7 };

// Fill the check-in form. `score` null leaves the pre-filled score alone.
async function fillCheckin(page, { practised, score, note }) {
  await page.getByRole("radio", { name: practised, exact: true }).check({ force: true });
  if (score != null) await page.getByRole("radio", { name: String(score), exact: true }).check({ force: true });
  if (note) await page.getByLabel(/A note, if you like/).fill(note);
}
const saveCheckin = (page) => page.getByRole("button", { name: "Save check-in" }).click();


// ---------- S10 ----------

test("S10: checks in 4 days after planting and keeps the practice", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {
    quick: QUICK,
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-07", skipped: [] },
  });
  await go(page, "/");
  await expect(page.getByText("Your practice this week")).toBeVisible();
  await moveTo(page, at("2026-10-11T10:00:00")); // Sunday, 4 days later
  await shot(page, testInfo, "S10", "1-today-day4");
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page).toHaveURL(/#\/checkin$/);
  await expect(page.getByRole("heading", { name: "Weekly check-in" })).toBeVisible();
  await shot(page, testInfo, "S10", "2-form-empty");
  // Score is not pre-filled for a quick-score-only newcomer: Save is disabled.
  await expect(page.getByRole("button", { name: "Save check-in" })).toBeDisabled();
  await fillCheckin(page, { practised: "Yes", score: 6, note: "Walked every evening." });
  await shot(page, testInfo, "S10", "3-form-filled");
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await expect(page.getByText("A first mark on the page")).toBeVisible();
  await shot(page, testInfo, "S10", "4-reward");
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await expect(page.getByText("You rated it 6/10.")).toBeVisible();
  await shot(page, testInfo, "S10", "5-today-after");
  const list = await readStore(page, "checkins");
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ date: "2026-10-11", week: "2026-W41", practised: "yes", score: 6, practiceIndex: 0 });
  expect((await readStore(page, "focus")).practiceIndex).toBe(0);
  friction(testInfo, "S10: the first reward screen shows a single dot and 'out of 10' with no comparison; the reward for a first check-in is only 'A first mark on the page', so the user is not told when the next check-in is due (Today says 'The next check-in will wait for you', no date).");
  expectNoErrors();
});

// ---------- S11 ----------

test("S11: checks in, swaps the practice, returns next week", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, RETURNING);
  await go(page, "/");
  const before = await page.locator(".fc-practice").innerText();
  await go(page, "/checkin");
  await fillCheckin(page, { practised: "Yes", score: 5 });
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await expect(page.getByText("Higher than where you began")).toBeVisible();
  await shot(page, testInfo, "S11", "1-reward");
  await page.getByRole("button", { name: "Swap practice" }).click();
  await expect(page).toHaveURL(/#\/$/);
  const after = await page.locator(".fc-practice").innerText();
  expect(after).not.toBe(before);
  const focus = await readStore(page, "focus");
  expect(focus.practiceIndex).toBe(1);
  expect(focus.skipped).toEqual([0]);
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await shot(page, testInfo, "S11", "2-today-swapped");
  // One week later the check-in is due again, on the new practice.
  await moveTo(page, at("2026-10-14T10:00:00"));
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await expect(page.locator(".fc-practice")).toHaveText(after);
  await shot(page, testInfo, "S11", "3-next-week");
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText(after, { exact: true })).toBeVisible(); // the form shows the swapped practice
  await fillCheckin(page, { practised: "Some", score: 6 });
  await saveCheckin(page);
  const list = await readStore(page, "checkins");
  expect(list).toHaveLength(4);
  expect(list[2]).toMatchObject({ practiceIndex: 0, week: "2026-W41" });
  expect(list[3]).toMatchObject({ practiceIndex: 1, week: "2026-W42" });
  friction(testInfo, "S11: right after the check-in the practice is swapped but Today still says 'Checked in this week' above a card titled 'Your practice this week' that now shows NEXT week's practice. There is no confirmation that the swap happened and no label saying it starts next week. The button 'Swap practice' appears on both the reward and Today with different meaning (Today: replace this week's; reward: choose the one for next week).");
  expectNoErrors();
});

// ---------- S12 ----------

test("S12: checks in twice in one week", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, RETURNING);
  await go(page, "/checkin");
  await expect(page.getByText("You already checked in this week")).toHaveCount(0);
  await fillCheckin(page, { practised: "Yes", score: 5 });
  await saveCheckin(page);
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await moveTo(page, at("2026-10-07T20:00:00"));
  await go(page, "/checkin");
  await expect(page.getByText("You already checked in this week. A new entry adds to it.")).toBeVisible();
  await shot(page, testInfo, "S12", "1-second-form");
  await fillCheckin(page, { practised: "Some", score: 7, note: "Second thoughts after a good evening." });
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await shot(page, testInfo, "S12", "2-second-reward");
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await go(page, "/journey");
  await shot(page, testInfo, "S12", "3-journey");
  // 4 entries, but only 3 distinct weeks: weeks are not double-counted.
  await expect(page.getByText("3 weeks active · 4 check-ins")).toBeVisible();
  await expect(page.locator(".jr-log")).toHaveCount(4);
  await expect(page.getByText("Second thoughts after a good evening.")).toBeVisible();
  const rows = page.locator(".jr-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.locator("svg[role=img]")).toHaveAttribute("aria-label", /moved from 3 on Sep 20 to 7 on Oct 7/);
  const dates = await page.locator(".jr-log .jr-log-head span:first-child").allInnerTexts();
  expect(dates.filter((d) => d === "Oct 7, 2026")).toHaveLength(2);
  friction(testInfo, "S12: two entries from the same day appear as two identical-looking log rows ('Oct 7, 2026 / Sleep & Recovery') with no time of day and no marker that the second is an addition. The sparkline treats them as separate points on the same x-slot spacing, so a same-day correction looks like a second 'week' of progress, while the header says '3 weeks active'. The 'latest' score and the Today line 'You rated it N/10' silently use the latest entry only.");
  expectNoErrors();
});

// ---------- S13 ----------

test("S13: a tab stays open from Sunday 23:50 to Monday 00:10", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-10-11T23:50:00")); // Sunday, ISO week 41
  await seed(page, {
    quick: QUICK,
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-07", skipped: [] },
    checkins: [entry("2026-10-11", 1, 2, 0, "yes", 6)],
  });
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await shot(page, testInfo, "S13", "1-sunday-2350");
  // Clock passes midnight; nothing tells the app until focus or visibility.
  await page.clock.setSystemTime(at("2026-10-12T00:10:00"));
  await page.waitForTimeout(500);
  const staleHeading = await page.getByRole("heading", { level: 3, name: /Checked in this week|Look back on the week/ }).innerText();
  await shot(page, testInfo, "S13", "2-monday-0010-stale");
  expect(staleHeading).toBe("Checked in this week"); // stale until an event fires
  // Hash navigation to check-in remounts and reads the real date: no stale week.
  await go(page, "/checkin");
  await expect(page.getByText("You already checked in this week")).toHaveCount(0);
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  // Reset to the stale state and fire the events a real browser would fire.
  await page.clock.setSystemTime(at("2026-10-11T23:50:00"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await moveTo(page, at("2026-10-12T00:10:00"));
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await shot(page, testInfo, "S13", "3-after-focus");
  friction(testInfo, "S13: with the tab visible and unfocused (e.g. a desktop second monitor, or a phone left on the lock-screen-off page that never fires visibilitychange), Today keeps saying 'Checked in this week' after midnight because useToday has no timer. It corrects itself on focus or visibility, so the cost is cosmetic, and check-in itself re-reads the date on mount.");
  expectNoErrors();
});

// ---------- S14 ----------

test("S14: four weeks on one sub with rising scores", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-10-07T10:00:00"));
  await seed(page, {
    quick: QUICK,
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-09-16", skipped: [] },
    checkins: [
      entry("2026-09-13", 1, 2, 0, "yes", 3),
      entry("2026-09-20", 1, 2, 0, "yes", 5),
      entry("2026-09-27", 1, 2, 0, "yes", 6),
    ],
    scores: { "1-2": 6 },
  });
  await go(page, "/checkin");
  await fillCheckin(page, { practised: "Yes", score: 8 });
  await saveCheckin(page);
  await expect(page.getByText("Higher than where you began")).toBeVisible();
  await expect(page.getByText("+5 since your first check-in")).toBeVisible();
  await shot(page, testInfo, "S14", "1-reward");
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await shot(page, testInfo, "S14", "2-today");
  const body = (await page.locator("main").innerText()).toLowerCase();
  // Today still shows the same focus and says nothing about moving on.
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  expect(body).not.toMatch(/move on|next focus|ready for|new focus|well done|steady/);
  // Open the picker: what could the user move on to?
  await page.getByRole("button", { name: "Choose another focus" }).click();
  await shot(page, testInfo, "S14", "3-picker");
  const options = page.locator(".fp-opt");
  const names = await options.locator(".fp-name").allInnerTexts();
  const count = names.length;
  if (count === 1) {
    friction(testInfo, "S14: after the check-in writes a full score for the focus sub, the picker lists only that sub (it shows 'Your three lowest scores' but only one sub is scored), tagged 'Current'. The user who wants to move on has nowhere to go; the 6 other quick-rated domains disappear from the picker. See screenshot e2e/.artifacts/S14-mobile-3-picker.png.");
  }
  expect(count).toBeGreaterThan(0);
  friction(testInfo, "S14: after 4 weeks and +5 points the app never suggests moving on. Reward says 'Higher than where you began' and Today repeats the same focus and practice card; no 'You have come far here. Stay, or look at another area?' prompt.");
  expectNoErrors();
});

// ---------- S15 ----------

test("S15: returns after five weeks without a check-in", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-11-04T10:00:00")); // last check-in was 2026-09-27
  await seed(page, RETURNING);
  await go(page, "/");
  await shot(page, testInfo, "S15", "1-today");
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  const text = await page.locator("main").innerText();
  // No acknowledgement of the gap.
  expect(text).not.toMatch(/welcome back|been a while|weeks since|since you last|it.s been/i);
  expect(text).toContain("Three questions. About a minute.");
  // The practice is still the one from September.
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  await page.getByRole("button", { name: "Check in" }).click();
  await shot(page, testInfo, "S15", "2-form");
  await fillCheckin(page, { practised: "Not this week", score: 4 });
  await saveCheckin(page);
  await shot(page, testInfo, "S15", "3-reward");
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await go(page, "/journey");
  await shot(page, testInfo, "S15", "4-journey");
  await expect(page.getByText("3 weeks active · 3 check-ins")).toBeVisible();
  const list = await readStore(page, "checkins");
  expect(list[2]).toMatchObject({ date: "2026-11-04", week: "2026-W45" });
  friction(testInfo, "S15: five weeks later Today is identical to a normal week: 'Look back on the week - Three questions' and the September practice under 'Your practice this week'. No 'welcome back', no offer to pick a fresh practice or re-rate, and the form asks 'Did you practise this week?' although the practice has been dormant for weeks. Journey shows the gap only as a line jumping between dates.");
  expectNoErrors();
});

// ---------- S16 ----------

test("S16: answers 'Not this week' with a score of 2", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, RETURNING);
  await go(page, "/checkin");
  // The score is pre-filled from the last rating.
  await expect(page.getByRole("radio", { name: "4", exact: true })).toBeChecked();
  await fillCheckin(page, { practised: "Not this week", score: 2, note: "Bad week. Did nothing." });
  await shot(page, testInfo, "S16", "1-form");
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await shot(page, testInfo, "S16", "2-reward");
  const reward = await page.locator(".ci-reward").innerText();
  expect(reward).toMatch(/Lower than where you began\. That is honest information, not a verdict\./);
  expect(reward).toContain("−1 since your first check-in");
  expect(reward).not.toMatch(/great|well done|congrat|proud/i);
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await go(page, "/journey");
  await expect(page.getByText("Not this week · Score 2")).toBeVisible();
  await shot(page, testInfo, "S16", "3-journey");
  friction(testInfo, "S16: the reward screen is headed 'Check-in saved' and its sentence depends only on the score trend, never on the answer 'Not this week'. The user who did not practise reads 'Lower than where you began. That is honest information, not a verdict.' - kind, but it does not mention the missed practice or offer a smaller practice / swap in plain words. Same screen shows a large '2' in brand blue as if a trophy.");
  friction(testInfo, "S16: the score question is pre-filled with the previous rating (4), so a user who skims only taps 'Not this week' and Save, recording a score they did not choose.");
  expectNoErrors();
});

// ---------- S17 ----------

test("S17: swaps 11 times, then chooses another focus", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {
    quick: QUICK,
    scores: { "1-0": 3, "1-1": 5, "1-2": 6 },
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-07", skipped: [] },
  });
  await go(page, "/");
  const swap = page.getByRole("button", { name: "Swap practice" });
  const seen = [];
  let prev = (await readStore(page, "focus")).practiceIndex;
  for (let i = 0; i < 11; i++) {
    await swap.click();
    const f = await readStore(page, "focus");
    expect(f.practiceIndex).not.toBe(prev);
    prev = f.practiceIndex;
    seen.push(f.practiceIndex);
  }
  await shot(page, testInfo, "S17", "1-after-11-swaps");
  // Ten practices exist, so by the 11th swap the app has cycled round.
  expect(new Set(seen).size).toBe(10);
  // Check in on sub A.
  await go(page, "/checkin");
  await fillCheckin(page, { practised: "Some", score: 6 });
  await saveCheckin(page);
  await page.getByRole("button", { name: "Keep this practice" }).click();
  // Next week: choose another focus.
  await moveTo(page, at("2026-10-14T10:00:00"));
  await page.getByRole("button", { name: "Choose another focus" }).click();
  await shot(page, testInfo, "S17", "2-picker");
  await page.getByRole("button", { name: /Mental Health|Nutrition|Movement/ }).first().click();
  const f2 = await readStore(page, "focus");
  expect(f2).toMatchObject({ domainId: 1, subIndex: 0, skipped: [] });
  await expect(page.locator("#fc-title")).toHaveText("Movement & Fitness");
  await shot(page, testInfo, "S17", "3-new-focus");
  await go(page, "/checkin");
  await fillCheckin(page, { practised: "Yes", score: 5 });
  await saveCheckin(page);
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await go(page, "/journey");
  await shot(page, testInfo, "S17", "4-journey");
  const rows = page.locator(".jr-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Movement & Fitness" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "Sleep & Recovery" })).toHaveCount(1);
  friction(testInfo, "S17: 'Swap practice' on Today gives no feedback beyond the text changing and has no limit or counter; after 10 swaps the app silently starts reusing practices. There is no hint that the user may be looking for a different sub rather than a different practice.");
  expectNoErrors();
});

// ---------- S18 ----------

test("S18: opens the calendar link #/checkin after already checking in", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {
    ...RETURNING,
    checkins: [...RETURNING.checkins, entry("2026-10-05", 1, 2, 0, "yes", 5, "Monday check-in.")],
  });
  await page.goto("#/checkin"); // fresh open, as from a calendar event
  await expect(page.getByText("You already checked in this week. A new entry adds to it.")).toBeVisible();
  await shot(page, testInfo, "S18", "1-checkin-existing");
  // The user is not stopped: a new entry can still be saved.
  await expect(page.getByRole("button", { name: "Save check-in" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "Yes", exact: true })).toBeVisible();
  // There is no direct link back to Today or to the earlier entry in this view.
  const links = await page.locator("main").getByRole("link").count();
  const buttons = await page.locator("main").getByRole("button").allInnerTexts();
  expect(links).toBe(0);
  expect(buttons).toEqual(["Save check-in"]);
  const color = await page.getByText("You already checked in this week").evaluate((el) => getComputedStyle(el).color);
  friction(testInfo, `S18: the notice 'You already checked in this week. A new entry adds to it.' is a small grey line (${color}, 13px) between the practice card and the form. It does not say when or what was rated, and the page has no 'Back to Today' action, only a disabled Save button, so a user who opened the reminder out of habit must leave via the tab bar.`);
  expectNoErrors();
});

// ---------- S19 ----------

test("S19: eight weeks of data across two subs stays readable", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-11-29T10:00:00"));
  const sleep = ["2026-09-06", "2026-09-13", "2026-09-20", "2026-09-27"].map((d, i) =>
    entry(d, 1, 2, i, i % 2 ? "yes" : "some", [3, 4, 4, 5][i], i === 1 ? "Earlier bedtime helped." : ""));
  const move = ["2026-10-11", "2026-10-18", "2026-10-25", "2026-11-01"].map((d, i) =>
    entry(d, 1, 0, i, "yes", [5, 6, 7, 8][i], i === 3 ? "Ran twice." : ""));
  const eight = [...sleep, ...move];
  await seed(page, {
    quick: QUICK,
    scores: { "1-2": 6, "1-0": 6 },
    focus: { domainId: 1, subIndex: 0, practiceIndex: 4, startedAt: "2026-10-11", skipped: [] },
    checkins: eight,
  });
  await go(page, "/journey");
  await expect(page.getByText("8 weeks active · 8 check-ins")).toBeVisible();
  await shot(page, testInfo, "S19", "1-journey-top");
  await expect(page.locator(".jr-row")).toHaveCount(2);
  await expect(page.locator(".jr-log")).toHaveCount(8);
  const logs = await page.locator(".jr-log .jr-log-head span:first-child").allInnerTexts();
  expect(logs[0]).toBe("Nov 1, 2026"); // newest first
  // Not grouped: sub names alternate-free but repeat in a flat list.
  const subs = await page.locator(".jr-log .jr-log-head span:last-child").allInnerTexts();
  expect(new Set(subs).size).toBe(2);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const view = await page.evaluate(() => window.innerHeight);
  const logTop = await page.locator(".jr-log").first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.locator(".jr-log").last().scrollIntoViewIfNeeded();
  await shot(page, testInfo, "S19", "2-journey-bottom");
  // No horizontal scroll.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  friction(testInfo, `S19: with 8 check-ins the page is ${total}px tall (viewport ${view}px); the log starts ${Math.round(logTop)}px down, below the sub summaries. The log is one flat newest-first list mixing both subs, with a full practice sentence under each entry and no filter or grouping by sub; at 50+ check-ins it becomes a long scroll with no 'show more' or per-sub filter. The two sparkline rows above are readable.`);
  expectNoErrors();
});
