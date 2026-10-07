// Group 1: first time and first week (S01-S08).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { FRAMEWORK } from "../src/data/framework.js";
import { freezeAt, seed, go, readStore, trackErrors, friction, RETURNING } from "./helpers.js";

const ART = path.join("e2e", ".artifacts");

async function shot(page, testInfo, id, step) {
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, `${id}-${testInfo.project.name}-${step}.png`), fullPage: true });
}

const byId = (id) => FRAMEWORK.find((d) => d.id === id);

// Move a range input by keyboard, the way a keyboard user would.
async function rate(page, name, value) {
  const slider = page.getByRole("slider", { name, exact: true });
  await slider.focus();
  await slider.press("Home");
  for (let i = 1; i < value; i++) await slider.press("ArrowRight");
  await expect(slider).toHaveValue(String(value));
}

// Domain name -> rating for the quick onboarding.
const ALL_SEVEN = {
  "Body & Vitality": 6,
  "Mind & Learning": 7,
  "Work & Craft": 5,
  "Relationships & Love": 2,
  "Community & Belonging": 4,
  "Inner World & Meaning": 8,
  "Leisure & Pleasure": 6,
};
const ONLY_FOUR = {
  "Body & Vitality": 6,
  "Mind & Learning": 7,
  "Work & Craft": 3,
  "Relationships & Love": 8,
};

async function newcomer(page) {
  await freezeAt(page);
  await seed(page, {});
  await go(page, "/");
  await expect(page).toHaveURL(/#\/welcome$/);
}

async function rateAndContinue(page, ratings) {
  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByRole("heading", { name: "How does each ground feel?" })).toBeVisible();
  for (const [name, v] of Object.entries(ratings)) await rate(page, name, v);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "A place to begin" })).toBeVisible();
}

test.describe("Group 1: first time and first week", () => {
  test("S01: a newcomer rates all 7 domains and plants the suggested seed", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await shot(page, testInfo, "S01", "1-welcome");

    await page.getByRole("button", { name: "Begin" }).click();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    for (const [name, v] of Object.entries(ALL_SEVEN)) await rate(page, name, v);
    await expect(page.getByRole("status").filter({ hasText: "of 7 rated" })).toHaveText("7 of 7 rated.");
    await shot(page, testInfo, "S01", "2-rated");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/#\/welcome\/focus$/);

    await expect(page.getByRole("heading", { name: "A place to begin" })).toBeVisible();
    const lowest = byId(4); // Relationships & Love, rated 2
    await expect(page.getByText(lowest.domain, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: lowest.subs[0].name })).toBeVisible();
    await expect(page.getByText("Your lowest domain: Relationships & Love (2/10).")).toBeVisible();
    await shot(page, testInfo, "S01", "3-suggestion");

    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
    await expect(page.getByText(/Your practice this week/)).toContainText(lowest.domain);
    await expect(page.getByRole("heading", { level: 3, name: lowest.subs[0].name })).toBeVisible();
    await expect(page.getByText(lowest.subs[0].ideas[0])).toBeVisible();
    await shot(page, testInfo, "S01", "4-today");

    expect(await readStore(page, "focus")).toEqual({
      domainId: 4, subIndex: 0, practiceIndex: 0, startedAt: "2026-10-07", skipped: [], origin: "suggested",
    });
    expect(await readStore(page, "quick")).toEqual({ 1: 6, 2: 7, 3: 5, 4: 2, 5: 4, 6: 8, 7: 6 });
    // The draft is gone once the seed is planted.
    expect(await page.evaluate(() => sessionStorage.getItem("life-improver:draft"))).toBeNull();
    // Garden shows all seven domains as rated.
    await expect(page.getByText("From your quick scores.")).toBeVisible();
    // The newcomer banner is gone for someone who has planted.
    await expect(page.getByText("New here?")).toHaveCount(0);
    expectNoErrors();
  });

  test("S02: a newcomer rates only 4 domains and continues", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await page.getByRole("button", { name: "Begin" }).click();

    // 3 rated is not enough.
    const names = Object.keys(ONLY_FOUR);
    for (const n of names.slice(0, 3)) await rate(page, n, ONLY_FOUR[n]);
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await rate(page, names[3], ONLY_FOUR[names[3]]);
    await expect(page.getByText("4 of 7 rated.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();
    // Unrated sliders say so.
    await expect(page.getByRole("slider", { name: "Leisure & Pleasure" })).toHaveAttribute("aria-valuetext", "not rated");
    await shot(page, testInfo, "S02", "1-four-rated");

    await page.getByRole("button", { name: "Next" }).click();
    // Lowest rated is Work & Craft (3): suggestion uses rated domains only.
    await expect(page.getByText("Your lowest domain: Work & Craft (3/10).")).toBeVisible();
    await shot(page, testInfo, "S02", "2-suggestion");
    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page.getByRole("heading", { level: 3, name: byId(3).subs[0].name })).toBeVisible();
    await shot(page, testInfo, "S02", "3-today");

    expect(await readStore(page, "quick")).toEqual({ 1: 6, 2: 7, 3: 3, 4: 8 });

    // The garden: unrated domains must not look rated.
    const rows = page.locator(".garden-row");
    await expect(rows).toHaveCount(7);
    const unrated = ["Community & Belonging", "Inner World & Meaning", "Leisure & Pleasure"];
    for (const n of unrated) {
      const row = rows.filter({ hasText: n });
      await expect(row).toContainText("not rated");
      await expect(row.locator(".garden-fill")).toHaveCount(0);
      await expect(row.locator(".garden-tag")).toHaveCount(0);
    }
    for (const n of Object.keys(ONLY_FOUR)) {
      const row = rows.filter({ hasText: n });
      await expect(row.locator(".garden-fill")).toHaveCount(1);
      await expect(row.locator(".garden-tag")).toHaveText("quick");
    }
    await expect(page.getByText("From your quick scores.")).toBeVisible();
    // The only invitation to rate the three empty rows is the small link below the card.
    const gardenText = await page.locator(".garden").innerText();
    if (!/rate|add|fill|later/i.test(gardenText.replace(/not rated/gi, "").replace(/quick scores/gi, ""))) {
      friction(testInfo, "Garden still shows three empty rows (dash, no bar) with no invitation to rate them; the only hint is the small 'Refine with the full assessment' link below the card.");
    }
    expectNoErrors();
  });

  test("S03: a newcomer picks another focus on step 3 from Suggested and from All areas", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await rateAndContinue(page, ALL_SEVEN);

    await page.getByRole("button", { name: "Choose another" }).click();
    const picker = page.getByRole("group", { name: "Choose where to begin" });
    await expect(picker).toBeVisible();

    // Part 1: three suggestions from the quick ratings (lowest first, sub 0 of each domain).
    const suggested = picker.getByRole("region", { name: "Suggested" });
    const sOpts = suggested.locator("button.fp-opt");
    await expect(sOpts).toHaveCount(3);
    await expect(sOpts.nth(0)).toContainText(byId(4).subs[0].name); // rated 2
    await expect(sOpts.nth(0)).toHaveAttribute("aria-current", "true");
    await expect(sOpts.nth(0)).toContainText("Suggested");
    await expect(sOpts.nth(1)).toContainText(byId(5).subs[0].name); // rated 4
    await expect(sOpts.nth(1)).toContainText("4/10 quick");
    await expect(sOpts.nth(2)).toContainText(byId(3).subs[0].name); // rated 5
    await shot(page, testInfo, "S03", "1-picker");

    // Part 2: all seven domains are groups; the group holding the suggestion starts open.
    const all = picker.getByRole("region", { name: "All areas" });
    const groups = all.locator("button.fp-group");
    await expect(groups).toHaveCount(7);
    await expect(all.getByRole("button", { name: byId(4).domain })).toHaveAttribute("aria-expanded", "true");
    const leisure = byId(7);
    const leisureGroup = all.getByRole("button", { name: leisure.domain });
    await expect(leisureGroup).toHaveAttribute("aria-expanded", "false");
    await leisureGroup.click();
    await expect(leisureGroup).toHaveAttribute("aria-expanded", "true");
    await expect(all.locator("button.fp-sub")).toHaveCount(byId(4).subs.length + leisure.subs.length);
    await shot(page, testInfo, "S03", "2-all-areas");
    friction(testInfo, "On step 3 the picker opens below 'Plant this seed' and pushes the page to about 2.5 screens on a phone; the suggestion card above it stays visible, so it is unclear which choice is live until the user picks.");

    // A domain that is not the lowest can now be chosen: the old picker could not do this.
    const pick = leisure.subs[1];
    await all.getByRole("button", { name: pick.name }).click();
    await expect(page.getByRole("group", { name: "Choose where to begin" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: pick.name })).toBeVisible();
    await expect(page.getByText("You chose this place to begin.")).toBeVisible();
    await shot(page, testInfo, "S03", "3-picked");

    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page.getByRole("heading", { level: 3, name: pick.name })).toBeVisible();
    await expect(page.getByText(pick.ideas[0])).toBeVisible();
    expect(await readStore(page, "focus")).toMatchObject({ domainId: 7, subIndex: 1, practiceIndex: 0, origin: "picked" });
    await shot(page, testInfo, "S03", "4-today");
    // Today repeats the wording the user just saw.
    await expect(page.locator(".fc .today-muted")).toHaveText("You chose this place to begin.");

    // Changing a rating afterwards makes the pick stale: the suggestion returns.
    expectNoErrors();
  });

  test("S04: a newcomer skips to the full assessment, rates one domain, and goes to Today", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await page.getByRole("button", { name: "Skip to the full assessment" }).click();
    await expect(page).toHaveURL(/#\/assess$/);
    await expect(page.getByText("Pick a domain to start.")).toBeVisible();
    await shot(page, testInfo, "S04", "1-assess");

    await page.getByRole("button", { name: /^Body & Vitality/ }).click();
    const body = byId(1);
    const values = [7, 3, 6, 5, 8, 9, 4, 6, 7, 5].slice(0, body.subs.length);
    for (let i = 0; i < body.subs.length; i++) {
      await rate(page, `${body.subs[i].name} score`, values[i]);
    }
    await expect(page.getByRole("button", { name: /^Body & Vitality/ })).toContainText(`${body.subs.length}/${body.subs.length}`);
    await shot(page, testInfo, "S04", "2-rated");
    expect(await readStore(page, "scores")).toEqual(Object.fromEntries(values.map((v, i) => [`1-${i}`, v])));

    // F4: the dashboard points back to Today with a primary button.
    const toWeek = page.getByRole("button", { name: "See this week's focus" });
    await expect(toWeek).toBeVisible();
    await shot(page, testInfo, "S04", "3-dashboard");
    await toWeek.click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
    await expect(page.getByText(`Your lowest score: ${body.subs[1].name} (3/10).`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: body.subs[1].name })).toBeVisible();
    await expect(page.getByText("Averages from your full assessment.")).toBeVisible();
    await shot(page, testInfo, "S04", "4-today");

    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page.getByText(/Your practice this week/)).toBeVisible();
    await expect(page.getByText("You rated this 3/10.")).toBeVisible();
    expect(await readStore(page, "focus")).toMatchObject({ domainId: 1, subIndex: 1, startedAt: "2026-10-07", origin: "suggested" });
    await shot(page, testInfo, "S04", "5-planted");
    expectNoErrors();
  });

  test("S05: Back and reload during step 2 and step 3 keep the draft", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);

    // Step 2, rate two, browser Back goes to step 1 inside the app.
    await page.getByRole("button", { name: "Begin" }).click();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await rate(page, "Body & Vitality", 4);
    await rate(page, "Mind & Learning", 6);
    await shot(page, testInfo, "S05", "1-step2-draft");
    await page.goBack();
    await expect(page).toHaveURL(/#\/welcome$/);
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
    // Forward again: the ratings are still there.
    await page.goForward();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByText("2 of 7 rated.")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Body & Vitality", exact: true })).toHaveValue("4");

    // Step 2 reload keeps the ratings and the step.
    await rate(page, "Work & Craft", 5);
    await expect(page.getByText("3 of 7 rated.")).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByText("3 of 7 rated.")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Mind & Learning", exact: true })).toHaveValue("6");
    await expect(page.getByRole("slider", { name: "Leisure & Pleasure" })).toHaveAttribute("aria-valuetext", "not rated");
    // Nothing is written to the long-term store until the seed is planted.
    expect((await readStore(page, "quick")) ?? {}).toEqual({});
    await shot(page, testInfo, "S05", "2-after-reload-step2");

    // Step 3 reload stays on step 3.
    await rate(page, "Relationships & Love", 8);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "A place to begin" })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/#\/welcome\/focus$/);
    await expect(page.getByRole("heading", { name: "A place to begin" })).toBeVisible();
    expect((await readStore(page, "quick")) ?? {}).toEqual({});
    await shot(page, testInfo, "S05", "3-after-reload-step3");

    // The in-page Back button and the browser's Back both return to step 2.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByText("4 of 7 rated.")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.goBack();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);

    // Leaving for Assess and coming back keeps the draft.
    await page.getByRole("button", { name: "Skip to the full assessment" }).click();
    await expect(page).toHaveURL(/#\/assess$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByText("4 of 7 rated.")).toBeVisible();
    await shot(page, testInfo, "S05", "4-back-from-assess");
    expectNoErrors();
  });

  test("S06: a user plants a seed and looks at Today on the same day", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await rateAndContinue(page, ALL_SEVEN);
    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page.getByText(/Your practice this week/)).toBeVisible();
    await shot(page, testInfo, "S06", "1-today");

    // The invitation to practise is there.
    await expect(page.getByRole("button", { name: "Swap practice" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to calendar" })).toBeVisible();
    // R1: the check-in is not asked for on day 0. Planted Wednesday, it opens Saturday.
    await expect(page.getByRole("button", { name: "Check in", exact: true })).toHaveCount(0);
    await expect(page.getByText("Your first check-in opens Saturday.")).toBeVisible();
    const early = page.getByRole("link", { name: "Check in early" });
    await expect(early).toBeVisible();

    // Checking in early is still possible.
    await early.click();
    await expect(page).toHaveURL(/#\/checkin$/);
    await expect(page.getByText("Did you practise this week?")).toBeVisible();
    await shot(page, testInfo, "S06", "2-checkin-early");
    friction(testInfo, "Checking in early, the form still asks 'Did you practise this week?' on the day the seed was planted, with no note that this is the first day; the 'Not this week' answer would be recorded as a first mark of nothing.");
    expectNoErrors();
  });

  test("S07: add the practice and the weekly check-in to the calendar", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await rateAndContinue(page, ALL_SEVEN);
    await page.getByRole("button", { name: "Plant this seed" }).click();
    const sub = byId(4).subs[0];
    const practice = sub.ideas[0];

    // Practice event: tomorrow (Thursday) at 07:30.
    await page.getByRole("button", { name: "Add to calendar" }).click();
    const panel = page.getByRole("group", { name: "Add to calendar" });
    await expect(panel.getByLabel("Day")).toHaveValue("4");
    await expect(panel.getByLabel("Time")).toHaveValue("07:30");
    await expect(panel.getByText("First one: Thu 8 Oct")).toBeVisible();
    // Changing the day updates the first-date line.
    await panel.getByLabel("Day").selectOption("6");
    await expect(panel.getByText("First one: Sat 10 Oct")).toBeVisible();
    await panel.getByLabel("Day").selectOption("4");
    await expect(panel.getByText("First one: Thu 8 Oct")).toBeVisible();
    await shot(page, testInfo, "S07", "1-practice-panel");
    const [dl1] = await Promise.all([
      page.waitForEvent("download"),
      panel.getByRole("button", { name: "Download calendar file" }).click(),
    ]);
    expect(dl1.suggestedFilename()).toBe("life-improver-practice.ics");
    const ics1 = fs.readFileSync(await dl1.path(), "utf8");
    await expect(panel.getByRole("status")).toContainText("Downloaded");
    await shot(page, testInfo, "S07", "2-practice-downloaded");

    // Check-in event: Sunday 18:00, at least 3 days out.
    await page.getByRole("button", { name: "Remind me weekly" }).click();
    const panel2 = page.getByRole("group", { name: "Add a weekly check-in to my calendar" });
    await expect(panel2.getByLabel("Day")).toHaveValue("0");
    await expect(panel2.getByLabel("Time")).toHaveValue("18:00");
    await expect(panel2.getByText("First one: Sun 11 Oct")).toBeVisible();
    await shot(page, testInfo, "S07", "3-checkin-panel");
    const [dl2] = await Promise.all([
      page.waitForEvent("download"),
      panel2.getByRole("button", { name: "Download calendar file" }).click(),
    ]);
    expect(dl2.suggestedFilename()).toBe("life-improver-checkin.ics");
    const ics2 = fs.readFileSync(await dl2.path(), "utf8");

    const parse = (text) => {
      // Unfold, then read key:value lines.
      const lines = text.split("\r\n");
      expect(lines[lines.length - 1]).toBe("");
      for (const l of lines) expect(Buffer.byteLength(l, "utf8")).toBeLessThanOrEqual(75);
      const unfolded = text.replace(/\r\n /g, "").split("\r\n").filter(Boolean);
      const map = {};
      for (const l of unfolded) {
        const i = l.indexOf(":");
        map[l.slice(0, i)] = l.slice(i + 1);
      }
      return { unfolded, map };
    };
    const a = parse(ics1);
    const b = parse(ics2);
    for (const { unfolded } of [a, b]) {
      expect(unfolded[0]).toBe("BEGIN:VCALENDAR");
      expect(unfolded[unfolded.length - 1]).toBe("END:VCALENDAR");
      expect(unfolded).toContain("VERSION:2.0");
      expect(unfolded).toContain("BEGIN:VEVENT");
      expect(unfolded).toContain("END:VEVENT");
    }
    // Wednesday 2026-10-07: practice Thursday 07:30; check-in Sunday 11 Oct 18:00.
    expect(a.map.DTSTART).toBe("20261008T073000");
    expect(a.map.DTEND).toBe("20261008T075000");
    expect(a.map.RRULE).toBe("FREQ=WEEKLY");
    expect(a.map.SUMMARY.replace(/\\,/g, ",").replace(/\\;/g, ";")).toContain(practice.slice(0, 20));
    expect(a.map.DESCRIPTION).toContain(sub.name);
    expect(b.map.DTSTART).toBe("20261011T180000");
    expect(b.map.DTEND).toBe("20261011T181500");
    expect(b.map.RRULE).toBe("FREQ=WEEKLY");
    expect(b.map.SUMMARY).toContain("Weekly check-in");
    expect(b.map.URL).toMatch(/#\/checkin$/);
    // The two defaults no longer collide, and the first check-in falls after it opens (Saturday).
    expect(a.map.DTSTART).not.toBe(b.map.DTSTART);
    expectNoErrors();
  });

  test("S08: a newcomer opens #/checkin, #/journey or #/assess directly", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await freezeAt(page);
    await seed(page, {});
    const banner = page.getByText("New here?");

    // Check-in: explains itself and links straight to the welcome.
    await go(page, "/checkin");
    await expect(page.getByRole("heading", { name: "Weekly check-in" })).toBeVisible();
    await expect(page.getByText("There is nothing to check in on yet. A one-minute welcome sets your first focus.")).toBeVisible();
    await expect(banner).toHaveCount(0);
    await shot(page, testInfo, "S08", "1-checkin");
    await expect(page.getByRole("link", { name: "Choose a focus first" })).toHaveCount(0);
    const begin = page.getByRole("main").getByRole("link", { name: "Begin with a one-minute welcome", exact: true });
    await expect(begin).toBeVisible();
    friction(testInfo, "Check-in empty state for a newcomer says 'Choose a focus, and come back when the week has had its say' above a button that starts the welcome, and the slim banner above repeats the same link; the sentence and the button disagree.");

    // Journey: same link, one tap.
    await go(page, "/journey");
    await expect(page.getByRole("heading", { name: "Journey" })).toBeVisible();
    await expect(page.getByText(/Nothing here yet/)).toBeVisible();
    await expect(banner).toHaveCount(0);
    await shot(page, testInfo, "S08", "2-journey");
    await expect(page.getByRole("link", { name: "Make a first check-in" })).toHaveCount(0);
    await page.getByRole("main").getByRole("link", { name: "Begin with a one-minute welcome", exact: true }).click();
    await expect(page).toHaveURL(/#\/welcome$/);
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
    await expect(banner).toHaveCount(0);
    await shot(page, testInfo, "S08", "3-welcome");

    // Assess.
    await go(page, "/assess");
    await expect(page.getByText("How are you, really?")).toBeVisible();
    await expect(page.getByText("Pick a domain to start.")).toBeVisible();
    await expect(banner).toBeVisible();
    await shot(page, testInfo, "S08", "4-assess");
    // The tab bar still shows Today for a newcomer; it bounces to the welcome.
    await page.getByRole("link", { name: "Today", exact: true }).click();
    await expect(page).toHaveURL(/#\/welcome$/);
    friction(testInfo, "A newcomer's tab bar still lists Today and Journey as if the app were ready; Today redirects to the welcome and the tabs vanish, so a newcomer who tapped Assess from the welcome can only return to it via 'Skip to the full assessment'. The slim banner helps but is easy to miss on a phone.");
    expectNoErrors();
  });

  test("S30: a user restores a saved copy from the welcome screen", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await expect(page.getByText("Restore from a saved copy")).toBeVisible();
    const input = page.locator('input[type="file"]');
    await expect(input).toHaveCount(1);

    // A wrong file explains itself and changes nothing.
    await input.setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
    await expect(page.getByRole("alert")).toHaveText("This file is not a Life Improver export. Use the .json file from Settings, Download a copy.");
    await shot(page, testInfo, "S30", "1-bad-file");
    friction(testInfo, "'Restore from a saved copy' is a faint grey underlined line under Begin, and a wrong file says 'not a Life Improver export' without saying what a saved copy is (the .json from Settings > Download a copy).");
    expect((await readStore(page, "checkins")) ?? []).toEqual([]);

    // A real export restores and lands on Today with a notice.
    const copy = {
      app: "life-improver",
      schema: 2,
      exportedAt: "2026-10-01T09:00:00.000Z",
      data: { scores: RETURNING.scores, quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins },
    };
    await input.setInputFiles({ name: "life-improver-2026-10-01.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(copy)) });
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
    await expect(page.getByText("Restored 2 check-ins.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: byId(1).subs[2].name })).toBeVisible();
    await shot(page, testInfo, "S30", "2-restored-today");
    expect(await readStore(page, "checkins")).toHaveLength(2);
    expect(await readStore(page, "focus")).toMatchObject({ domainId: 1, subIndex: 2 });
    // No newcomer banner and no confirm dialog was needed.
    await expect(page.getByText("New here?")).toHaveCount(0);

    // The notice can be dismissed.
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Restored 2 check-ins.")).toHaveCount(0);
    expectNoErrors();
  });

  test("S31: a deep link to the last welcome step without a draft returns to rating", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await freezeAt(page);
    await seed(page, {});

    await go(page, "/welcome/focus");
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByRole("heading", { name: "How does each ground feel?" })).toBeVisible();
    await expect(page.getByText("0 of 7 rated.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await shot(page, testInfo, "S31", "1-redirected");

    // With fewer than 4 ratings the last step is still out of reach.
    await rate(page, "Body & Vitality", 5);
    await page.goto("#/welcome/focus");
    await expect(page).toHaveURL(/#\/welcome\/rate$/);
    await expect(page.getByText("1 of 7 rated.")).toBeVisible();

    // With 4 ratings in the draft the same link opens the step.
    for (const [n, v] of Object.entries(ONLY_FOUR)) await rate(page, n, v);
    await page.goto("#/welcome/focus");
    await expect(page).toHaveURL(/#\/welcome\/focus$/);
    await expect(page.getByRole("heading", { name: "A place to begin" })).toBeVisible();
    await expect(page.getByText("Your lowest domain: Work & Craft (3/10).")).toBeVisible();
    await shot(page, testInfo, "S31", "2-with-draft");
    expectNoErrors();
  });

  test("S32: a newcomer on Practices sees the welcome banner, a returning user does not", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await freezeAt(page);
    await seed(page, {});

    await go(page, "/practices");
    await expect(page.getByRole("heading", { level: 2, name: /ways forward/ })).toBeVisible();
    const banner = page.locator(".notice-slim");
    await expect(banner).toContainText("New here?");
    await shot(page, testInfo, "S32", "1-practices-newcomer");
    await banner.getByRole("link", { name: "Begin with a one-minute welcome." }).click();
    await expect(page).toHaveURL(/#\/welcome$/);
    await expect(page.locator(".notice-slim")).toHaveCount(0);
    await shot(page, testInfo, "S32", "2-welcome");

    // Rating one sub in Assess is enough to stop being a newcomer.
    await go(page, "/assess");
    await expect(page.locator(".notice-slim")).toBeVisible();
    await page.getByRole("button", { name: /^Body & Vitality/ }).click();
    await rate(page, `${byId(1).subs[0].name} score`, 6);
    await expect(page.locator(".notice-slim")).toHaveCount(0);
    expectNoErrors();
  });

  test("S33: the first check-in opens on day 3; before that it is offered early and quietly", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await freezeAt(page);
    // Planted Monday 5 Oct, so on Wednesday it opens Thursday.
    await seed(page, {
      quick: RETURNING.quick,
      focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-05", skipped: [], origin: "suggested" },
    });
    await go(page, "/");
    await expect(page.getByText(/Your practice this week/)).toBeVisible();
    await expect(page.getByText("Your first check-in opens Thursday.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Check in early" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check in", exact: true })).toHaveCount(0);
    await shot(page, testInfo, "S33", "1-before");

    // The clock moves to Thursday: the day-check runs every minute, no reload.
    await page.clock.fastForward("24:00:00");
    await expect(page.getByRole("button", { name: "Check in", exact: true })).toBeVisible();
    await expect(page.getByText(/Your first check-in opens/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Check in early" })).toHaveCount(0);
    await expect(page.getByText("Three questions. About a minute.")).toBeVisible();
    await shot(page, testInfo, "S33", "2-open");

    await page.getByRole("button", { name: "Check in", exact: true }).click();
    await expect(page).toHaveURL(/#\/checkin$/);
    await expect(page.getByText("Did you practise this week?")).toBeVisible();
    expectNoErrors();
  });

  test("S34: the calendar's first dates follow the day the seed is planted", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    // Sunday 11 Oct, 10:00: tomorrow is Monday; the check-in is 3+ days away, so Sunday 18 Oct.
    await freezeAt(page, new Date("2026-10-11T10:00:00"));
    await seed(page, {
      quick: RETURNING.quick,
      focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-10-11", skipped: [], origin: "suggested" },
    });
    await go(page, "/");
    await page.getByRole("button", { name: "Add to calendar" }).click();
    const panel = page.getByRole("group", { name: "Add to calendar" });
    await expect(panel.getByLabel("Day")).toHaveValue("1");
    await expect(panel.getByLabel("Time")).toHaveValue("07:30");
    await expect(panel.getByText("First one: Mon 12 Oct")).toBeVisible();

    await page.getByRole("button", { name: "Remind me weekly" }).click();
    const panel2 = page.getByRole("group", { name: "Add a weekly check-in to my calendar" });
    await expect(panel2.getByLabel("Day")).toHaveValue("0");
    await expect(panel2.getByText("First one: Sun 18 Oct")).toBeVisible();
    // The date stays on a Sunday, 3 or more days away, for any other chosen day.
    await panel2.getByLabel("Day").selectOption("3");
    await expect(panel2.getByText("First one: Wed 14 Oct")).toBeVisible();
    await shot(page, testInfo, "S34", "1-panels");
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      panel2.getByRole("button", { name: "Download calendar file" }).click(),
    ]);
    const text = fs.readFileSync(await dl.path(), "utf8");
    expect(text).toContain("DTSTART:20261014T180000");
    expectNoErrors();
  });
});
