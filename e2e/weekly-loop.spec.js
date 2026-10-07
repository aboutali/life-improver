import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, readStore, trackErrors, friction, RETURNING } from "./helpers.js";
import { isoWeek } from "../src/lib/dates.js";
import { FRAMEWORK } from "../src/data/framework.js";

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

// Fill the check-in form. The score is never pre-filled (R5); `score` null skips it.
async function fillCheckin(page, { practised, score, note }) {
  await page.getByRole("radio", { name: practised, exact: true }).check({ force: true });
  if (score != null) await page.getByRole("radio", { name: String(score), exact: true }).check({ force: true });
  if (note) await page.getByLabel(/A note, if you like/).fill(note);
}
const saveCheckin = (page) => page.getByRole("button", { name: "Save check-in" }).click();


const subName = (domainId, subIndex) => FRAMEWORK.find((d) => d.id === domainId).subs[subIndex].name;


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
  // R5: nothing is pre-filled, and a quick-score-only user sees no "Last time" hint.
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(page.getByText(/Last time:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save check-in" })).toBeDisabled();
  await expect(page.getByText("Answer the first two questions to save.")).toBeVisible();
  await fillCheckin(page, { practised: "Yes", score: 6, note: "Walked every evening." });
  await shot(page, testInfo, "S10", "3-form-filled");
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await expect(page.getByText("A first mark on the page")).toBeVisible();
  // R3: the reward says when the next check-in is.
  await expect(page.getByText("Next check-in: Sunday")).toBeVisible();
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
  friction(testInfo, "S10: the first reward shows one lone dot where the line should be (e2e/.artifacts/S10-mobile-4-reward.png), under 'out of 10'. It looks like a rendering glitch. 'Next check-in: Sunday' has no date. Proposed: for a single point, hide the sparkline and say 'Your line starts here'; show 'Sunday 18 Oct'.");
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
  // R9: the reward's button says what it does; "Swap practice" belongs to Today.
  await expect(page.getByRole("button", { name: "Swap practice" })).toHaveCount(0);
  await page.getByRole("button", { name: "Try a different practice" }).click();
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
  await expect(page.getByText("Last time: 5")).toBeVisible();
  await fillCheckin(page, { practised: "Some", score: 6 });
  await saveCheckin(page);
  const list = await readStore(page, "checkins");
  expect(list).toHaveLength(4);
  expect(list[2]).toMatchObject({ practiceIndex: 0, week: "2026-W41" });
  expect(list[3]).toMatchObject({ practiceIndex: 1, week: "2026-W42" });
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
  await expect(page.getByText("Last time: 5")).toBeVisible();
  await shot(page, testInfo, "S12", "1-second-form");
  await fillCheckin(page, { practised: "Some", score: 7, note: "Second thoughts after a good evening." });
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await shot(page, testInfo, "S12", "2-second-reward");
  await page.getByRole("button", { name: "Keep this practice" }).click();
  // The second entry is the 4th check-in on this sub, so the season card shows
  // although only 3 distinct weeks have passed.
  const seasonLine = await page.locator("#season-line").innerText();
  await shot(page, testInfo, "S12", "3-today-after-two");
  await go(page, "/journey");
  await shot(page, testInfo, "S12", "4-journey");
  // 4 entries, but only 3 distinct weeks: weeks are not double-counted.
  await expect(page.getByText("3 weeks active · 4 check-ins")).toBeVisible();
  await expect(page.locator(".jr-log")).toHaveCount(4);
  await expect(page.getByText("Second thoughts after a good evening.")).toBeVisible();
  // N8: the second entry of the week is marked, and the sparkline counts the week once.
  await expect(page.getByRole("heading", { level: 4, name: "Week of Oct 5" })).toBeVisible();
  await expect(page.locator(".jr-later")).toHaveCount(1);
  await expect(page.locator(".jr-later")).toHaveText("Added later");
  const rows = page.locator(".jr-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.locator("svg[role=img]")).toHaveAttribute("aria-label", /moved from 3 on Sep 20 to 7 on Oct 7/);
  const dates = await page.locator(".jr-log .jr-log-head span:first-child").allInnerTexts();
  expect(dates.filter((d) => d === "Oct 7, 2026")).toHaveLength(2);
  if (/^Four weeks/.test(seasonLine)) {
    friction(testInfo, "S12: after two check-ins in one week the Today season card says 'Four weeks with Sleep & Recovery' although Journey says '3 weeks active'. The season counts check-ins, not weeks (src/lib/rhythm.js seasonCount), so a same-week correction brings the review forward by a week. Proposed: count distinct ISO weeks in seasonCount.");
  }
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
  // R8: no focus or visibility event fires. The clock just runs 20 minutes and
  // the 60-second re-check updates Today by itself.
  await page.clock.runFor(20 * 60 * 1000);
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toHaveCount(0);
  await shot(page, testInfo, "S13", "2-monday-0010-no-event");
  // Check-in re-reads the date on mount: no stale week there either.
  await go(page, "/checkin");
  await expect(page.getByText("You already checked in this week")).toHaveCount(0);
  expectNoErrors();
});

// ---------- S14 ----------

test("S14: four weeks on one sub with rising scores", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-10-07T10:00:00"));
  await seed(page, {
    quick: QUICK,
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-09-06", skipped: [] },
    checkins: [
      entry("2026-09-13", 1, 2, 0, "yes", 3),
      entry("2026-09-20", 1, 2, 0, "yes", 5),
      entry("2026-09-27", 1, 2, 0, "yes", 6),
    ],
    scores: { "1-2": 6 },
  });
  await go(page, "/");
  await expect(page.getByText(/^Four weeks with/)).toHaveCount(0); // only 3 so far
  await go(page, "/checkin");
  await expect(page.getByText("Last time: 6")).toBeVisible();
  await fillCheckin(page, { practised: "Yes", score: 8 });
  await saveCheckin(page);
  await expect(page.getByText("Higher than where you began")).toBeVisible();
  await expect(page.getByText("+5 since your first check-in")).toBeVisible();
  await shot(page, testInfo, "S14", "1-reward");
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await shot(page, testInfo, "S14", "2-today-season");
  // R6: the app now asks whether to stay or move on.
  const card = page.getByRole("region", { name: /Four weeks with/ });
  await expect(card).toContainText("Four weeks with Sleep & Recovery. Stay for another season, or choose a new focus?");
  await expect(card.getByRole("button", { name: "Stay" })).toBeVisible();
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  // "Choose" opens the two-part picker: what could the user move on to?
  await card.getByRole("button", { name: "Choose", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose where to begin" })).toBeVisible();
  await shot(page, testInfo, "S14", "3-picker");
  const suggested = page.getByRole("region", { name: "Suggested" });
  expect(await suggested.locator(".fp-opt").count()).toBeGreaterThan(1);
  await expect(suggested.locator(".fp-opt[aria-current=true]")).toContainText("Sleep & Recovery");
  await expect(page.getByRole("region", { name: "All areas" }).locator(".fp-group")).toHaveCount(7);
  friction(testInfo, "S14: the season card buttons read 'Stay' and 'Choose'. 'Choose' has no object, and the card sits above the focus card right after a check-in, so a first-time reader may not know what they stay on or choose. Proposed: 'Stay with Sleep & Recovery' and 'Choose a new focus'.");
  expectNoErrors();
});

// ---------- S15 ----------

test("S15: returns after five weeks without a check-in", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-11-04T10:00:00")); // last check-in was 2026-09-27
  await seed(page, RETURNING);
  await go(page, "/");
  await shot(page, testInfo, "S15", "1-today");
  // R7: a calm acknowledgement of the gap, with two ways forward.
  const card = page.getByRole("region", { name: /Welcome back/ });
  await expect(card).toContainText("Welcome back. It has been 5 weeks.");
  await expect(card).toContainText("Nothing is lost. Begin again wherever you are.");
  await expect(card.getByRole("button", { name: "Start fresh" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Three questions. About a minute.");
  // The practice is still the one from September.
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  await card.getByRole("button", { name: "Pick up this practice" }).click();
  await expect(card).toHaveCount(0);
  await shot(page, testInfo, "S15", "2-picked-up");
  // Hidden for this visit: a reload keeps it hidden.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await expect(page.getByText(/Welcome back/)).toHaveCount(0);
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("Last time: 4")).toBeVisible();
  await shot(page, testInfo, "S15", "3-form");
  await fillCheckin(page, { practised: "Not this week", score: 4 });
  await saveCheckin(page);
  await expect(page.getByText("A week without it happens. Smaller is fine.")).toBeVisible();
  await shot(page, testInfo, "S15", "4-reward");
  await page.getByRole("button", { name: "Try a smaller practice" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await go(page, "/journey");
  await shot(page, testInfo, "S15", "5-journey");
  await expect(page.getByText("3 weeks active · 3 check-ins")).toBeVisible();
  const list = await readStore(page, "checkins");
  expect(list[2]).toMatchObject({ date: "2026-11-04", week: "2026-W45", practised: "no" });
  friction(testInfo, "S15: after 'Pick up this practice' the form still asks 'Did you practise this week?' about a practice that has been dormant for five weeks, and the practice is the September one. A returning user who picks up gets no hint that a smaller practice is allowed until after they save. Proposed: on the welcome-back card, add a 'Start smaller' line, or show 'Try a smaller practice' on Today for lapsed users.");
  expectNoErrors();
});

// ---------- S16 ----------

test("S16: answers 'Not this week' with a score of 2", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, RETURNING);
  await go(page, "/checkin");
  // R5: the score is not pre-filled; the last rating is only a hint.
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(page.getByText("Last time: 4")).toBeVisible();
  await fillCheckin(page, { practised: "Not this week", score: 2, note: "Bad week. Did nothing." });
  await shot(page, testInfo, "S16", "1-form");
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await shot(page, testInfo, "S16", "2-reward");
  const reward = await page.locator(".ci-reward").innerText();
  // R4: the sentence answers what the user said, not only the score trend.
  expect(reward).toContain("A week without it happens. Smaller is fine.");
  expect(reward).not.toMatch(/Lower than where you began/);
  expect(reward).toContain("−1 since your first check-in");
  expect(reward).not.toMatch(/great|well done|congrat|proud/i);
  await expect(page.getByRole("button", { name: "Try a smaller practice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep this practice" })).toBeVisible();
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await go(page, "/journey");
  await expect(page.getByText("Not this week · Score 2")).toBeVisible();
  await shot(page, testInfo, "S16", "3-journey");
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
  // Next week: choose another focus from the "Suggested" part of the picker.
  await moveTo(page, at("2026-10-14T10:00:00"));
  await page.getByRole("button", { name: "Choose another focus" }).click();
  await shot(page, testInfo, "S17", "2-picker");
  await page.getByRole("region", { name: "Suggested" }).getByRole("button", { name: /Movement & Fitness/ }).click();
  const f2 = await readStore(page, "focus");
  expect(f2).toMatchObject({ domainId: 1, subIndex: 0, skipped: [], origin: "picked", startedAt: "2026-10-14" });
  await expect(page.locator("#fc-title")).toHaveText("Movement & Fitness");
  await expect(page.getByText("You chose this place to begin.")).toBeVisible();
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
  friction(testInfo, "S17: 'Swap practice' on Today gives no feedback beyond the text changing and has no limit or counter; after 10 swaps the app silently starts reusing practices. There is no hint that the user may be looking for a different sub rather than a different practice. (Left as is by FLOW_CHANGES 'Not changed'.)");
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
  // N8: grouped by week, newest first, six weeks shown.
  const headings = page.getByRole("heading", { level: 4 });
  await expect(headings).toHaveCount(6);
  await expect(headings.first()).toHaveText("Week of Oct 26");
  await expect(page.locator(".jr-log")).toHaveCount(6);
  const logs = await page.locator(".jr-log .jr-log-head span:first-child").allInnerTexts();
  expect(logs[0]).toBe("Nov 1, 2026"); // newest first
  const more = page.getByRole("button", { name: "Show earlier weeks" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.scrollIntoViewIfNeeded();
  await shot(page, testInfo, "S19", "2-journey-collapsed");
  await more.click();
  await expect(page.locator(".jr-log")).toHaveCount(8);
  await expect(headings).toHaveCount(8);
  await expect(more).toHaveAttribute("aria-expanded", "true");
  const subs = await page.locator(".jr-log .jr-log-head span:nth-child(2)").allInnerTexts();
  expect(new Set(subs).size).toBe(2);
  await page.locator(".jr-log").last().scrollIntoViewIfNeeded();
  await shot(page, testInfo, "S19", "3-journey-expanded");
  // No horizontal scroll.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // The same button collapses the list again.
  await more.click();
  await expect(page.locator(".jr-log")).toHaveCount(6);
  expectNoErrors();
});

// ---------- S40 ----------

// A sub with four check-ins since it began: the season is due.
const SEASON = {
  quick: QUICK,
  scores: { "1-2": 6 },
  focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-09-06", skipped: [] },
  checkins: [
    entry("2026-09-13", 1, 2, 0, "yes", 3),
    entry("2026-09-20", 1, 2, 0, "yes", 5),
    entry("2026-09-27", 1, 2, 0, "yes", 6),
    entry("2026-10-04", 1, 2, 0, "yes", 6),
  ],
};

test("S40: season review, the user chooses Stay", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, SEASON);
  await go(page, "/");
  const card = page.getByRole("region", { name: /Four weeks with/ });
  await expect(card).toContainText("Four weeks with Sleep & Recovery. Stay for another season, or choose a new focus?");
  await shot(page, testInfo, "S40", "1-season-card");
  expect((await readStore(page, "focus")).reviewedAt).toBeUndefined();
  await card.getByRole("button", { name: "Stay" }).click();
  await expect(card).toHaveCount(0);
  const focus = await readStore(page, "focus");
  expect(focus).toMatchObject({ reviewedAt: "2026-10-07", startedAt: "2026-09-06", domainId: 1, subIndex: 2, practiceIndex: 0 });
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery"); // same focus
  await shot(page, testInfo, "S40", "2-after-stay");
  // The choice survives a reload.
  await page.reload();
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  await expect(page.getByText(/weeks with Sleep/)).toHaveCount(0);
  // A new season starts counting from the review: one check-in is not four.
  await go(page, "/checkin");
  await fillCheckin(page, { practised: "Yes", score: 7 });
  await saveCheckin(page);
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await expect(page.getByText(/weeks with Sleep/)).toHaveCount(0);
  await shot(page, testInfo, "S40", "3-new-season");
  expectNoErrors();
});

// ---------- S41 ----------

test("S41: season review, the user chooses a new focus", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, SEASON);
  await go(page, "/");
  const card = page.getByRole("region", { name: /Four weeks with/ });
  await card.getByRole("button", { name: "Choose", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose where to begin" })).toBeVisible();
  await shot(page, testInfo, "S41", "1-picker");
  // Choosing opens the picker but decides nothing yet.
  expect((await readStore(page, "focus")).reviewedAt).toBeUndefined();
  await page.getByRole("button", { name: "Keep this focus" }).click();
  await expect(page.getByRole("heading", { name: "Choose where to begin" })).toHaveCount(0);
  await expect(card).toBeVisible(); // still asked next time
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  // Now actually move on, to the lowest quick-rated domain in Suggested.
  await card.getByRole("button", { name: "Choose", exact: true }).click();
  const target = subName(5, 0);
  await page.getByRole("region", { name: "Suggested" }).getByRole("button", { name: new RegExp(target) }).click();
  const focus = await readStore(page, "focus");
  expect(focus).toMatchObject({ domainId: 5, subIndex: 0, origin: "picked", startedAt: "2026-10-07", skipped: [] });
  await expect(page.locator("#fc-title")).toHaveText(target);
  await expect(card).toHaveCount(0);
  await shot(page, testInfo, "S41", "2-new-focus");
  expectNoErrors();
});

// ---------- S42 ----------

test("S42: welcome-back card, the user starts fresh", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-11-04T10:00:00")); // a Wednesday, 38 days after the last check-in
  await seed(page, RETURNING);
  await go(page, "/");
  const card = page.getByRole("region", { name: /Welcome back/ });
  await card.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("heading", { name: "Choose where to begin" })).toBeVisible();
  await expect(card).toHaveCount(0);
  await shot(page, testInfo, "S42", "1-picker");
  const target = subName(5, 0);
  await page.getByRole("region", { name: "Suggested" }).getByRole("button", { name: new RegExp(target) }).click();
  const focus = await readStore(page, "focus");
  expect(focus).toMatchObject({ domainId: 5, subIndex: 0, startedAt: "2026-11-04", origin: "picked" });
  await expect(page.locator("#fc-title")).toHaveText(target);
  // The new focus is days old, so the check-in is not open yet (R1).
  await expect(page.getByText("Your first check-in opens Saturday.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Check in early" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await shot(page, testInfo, "S42", "2-fresh-focus");
  // Old history stays.
  await go(page, "/journey");
  await expect(page.getByText("2 weeks active · 2 check-ins")).toBeVisible();
  expectNoErrors();
});

// ---------- S43 ----------

test("S43: the welcome-back card needs more than 14 days away", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-10-11T10:00:00")); // exactly 14 days after 2026-09-27
  await seed(page, RETURNING);
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
  await expect(page.getByText(/Welcome back/)).toHaveCount(0);
  await shot(page, testInfo, "S43", "1-day14");
  await moveTo(page, at("2026-10-12T10:00:00")); // 15 days
  await expect(page.getByText("Welcome back. It has been 2 weeks.")).toBeVisible();
  await shot(page, testInfo, "S43", "2-day15");
  expectNoErrors();
});

// ---------- S44 ----------

// Focus on Sleep & Recovery (7/10) while another sub is rated 4/10.
const LOWER = {
  quick: QUICK,
  scores: { "1-2": 7, "2-0": 4 },
  focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-07", skipped: [], origin: "suggested" },
};

test("S44: another sub is far lower than the focus, the user taps Switch", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, LOWER);
  await go(page, "/");
  const lower = subName(2, 0);
  const card = page.getByRole("region", { name: new RegExp(`${lower} is now your lowest`) });
  await expect(card).toContainText(`${lower} is now your lowest (4/10). Switch your focus?`);
  await shot(page, testInfo, "S44", "1-nudge");
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  await card.getByRole("button", { name: "Switch" }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator("#fc-title")).toHaveText(lower);
  const focus = await readStore(page, "focus");
  expect(focus).toMatchObject({ domainId: 2, subIndex: 0, origin: "picked", startedAt: "2026-10-07", skipped: [] });
  await expect(page.getByText("You chose this place to begin.")).toBeVisible();
  await shot(page, testInfo, "S44", "2-switched");
  expectNoErrors();
});

// ---------- S45 ----------

test("S45: the user taps Not now and the nudge stays away until the score changes", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, LOWER);
  await go(page, "/");
  const lower = subName(2, 0);
  const card = page.getByRole("region", { name: new RegExp(`${lower} is now your lowest`) });
  await card.getByRole("button", { name: "Not now" }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery"); // focus unchanged
  expect((await readStore(page, "focus")).dismissedNudge).toEqual({ key: "2-0", score: 4 });
  await shot(page, testInfo, "S45", "1-dismissed");
  // Gone for good as long as the score is the same.
  await page.reload();
  await expect(page.locator("#fc-title")).toHaveText("Sleep & Recovery");
  await expect(page.getByText(/is now your lowest/)).toHaveCount(0);
  // The score of that sub changes (here to 5, still 2 below): the card returns.
  await page.evaluate(() => {
    const k = "life-improver:scores:v1";
    const s = JSON.parse(localStorage.getItem(k));
    s["2-0"] = 5;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByText(`${lower} is now your lowest (5/10). Switch your focus?`)).toBeVisible();
  await shot(page, testInfo, "S45", "2-returns");
  expectNoErrors();
});

// ---------- S46 ----------

test("S46: checks in on a Saturday and is told when the next one is", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page, at("2026-10-10T10:00:00")); // Saturday
  await seed(page, {
    quick: QUICK,
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-07", skipped: [] },
  });
  await go(page, "/checkin");
  await fillCheckin(page, { practised: "Yes", score: 6 });
  await saveCheckin(page);
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await expect(page.getByText("Next check-in: Sunday")).toBeVisible();
  await shot(page, testInfo, "S46", "1-reward");
  friction(testInfo, "S46: checking in on a Saturday, the reward says 'Next check-in: Sunday', which is tomorrow. A weekly rhythm reads as a daily one, and 'Sunday' with no date is ambiguous. Proposed: show the weekday plus date ('Sunday 18 Oct') and skip to the following Sunday when the next one is less than 3 days away (the same rule R1 and R2 already use).");
  expectNoErrors();
});

// ---------- S47 ----------

test("S47: the score question shows 'Last time' as a hint and starts empty", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, RETURNING);
  await go(page, "/checkin");
  await expect(page.getByText("Last time: 4")).toBeVisible();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  // The group is described by the hint, so a screen reader hears it with the question.
  await expect(page.getByRole("radiogroup", { name: /How is Sleep & Recovery now\?/ })).toHaveAccessibleDescription("Last time: 4");
  const save = page.getByRole("button", { name: "Save check-in" });
  await expect(save).toBeDisabled();
  await shot(page, testInfo, "S47", "1-empty");
  // Answering only one of the two questions is not enough.
  await page.getByRole("radio", { name: "Yes", exact: true }).check({ force: true });
  await expect(save).toBeDisabled();
  await expect(page.getByText("Answer the first two questions to save.")).toBeVisible();
  await page.getByRole("radio", { name: "5", exact: true }).check({ force: true });
  await expect(save).toBeEnabled();
  await expect(page.getByText("Answer the first two questions to save.")).toHaveCount(0);
  await shot(page, testInfo, "S47", "2-ready");
  expectNoErrors();
});

// ---------- S48 ----------

test("S48: Journey groups the log by week and plots one point per week", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {
    quick: QUICK,
    scores: { "1-2": 6 },
    focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-09-20", skipped: [] },
    checkins: [
      entry("2026-09-22", 1, 2, 0, "some", 3, "Slow start."),
      entry("2026-09-24", 1, 2, 0, "yes", 5, "Better by Thursday."),
      entry("2026-09-28", 1, 2, 0, "yes", 6),
    ],
  });
  await go(page, "/journey");
  await expect(page.getByText("2 weeks active · 3 check-ins")).toBeVisible();
  await shot(page, testInfo, "S48", "1-journey");
  // Week headings, newest first.
  const headings = page.getByRole("heading", { level: 4 });
  await expect(headings).toHaveText(["Week of Sep 28", "Week of Sep 21"]);
  // Inside a week the newest entry is first and only the later one is marked.
  const older = page.getByRole("region", { name: "Week of Sep 21" }).locator(".jr-log");
  await expect(older).toHaveCount(2);
  await expect(older.first()).toContainText("Better by Thursday.");
  await expect(older.first().locator(".jr-later")).toHaveText("Added later");
  await expect(older.last().locator(".jr-later")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Week of Sep 28" }).locator(".jr-later")).toHaveCount(0);
  // The sparkline has one point per week: it uses the latest score of Sep 21 (5), not the first (3).
  await expect(page.locator(".jr-row svg[role=img]")).toHaveAttribute("aria-label", /moved from 5 on Sep 24 to 6 on Sep 28/);
  // Few weeks: no "Show earlier weeks".
  await expect(page.getByRole("button", { name: "Show earlier weeks" })).toHaveCount(0);
  expectNoErrors();
});
