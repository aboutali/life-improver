// Group 1: first time and first week (S01-S08).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { FRAMEWORK } from "../src/data/framework.js";
import { freezeAt, seed, go, readStore, trackErrors, friction } from "./helpers.js";

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
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    for (const [name, v] of Object.entries(ALL_SEVEN)) await rate(page, name, v);
    await expect(page.getByRole("status").filter({ hasText: "of 7 rated" })).toHaveText("7 of 7 rated.");
    await shot(page, testInfo, "S01", "2-rated");
    await page.getByRole("button", { name: "Next" }).click();

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
      domainId: 4, subIndex: 0, practiceIndex: 0, startedAt: "2026-10-07", skipped: [],
    });
    expect(await readStore(page, "quick")).toEqual({ 1: 6, 2: 7, 3: 5, 4: 2, 5: 4, 6: 8, 7: 6 });
    // Garden shows all seven domains as rated.
    await expect(page.getByText("From your quick scores.")).toBeVisible();
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
    // Nothing on Today explains that the three empty rows can be filled later
    // other than the small "Refine" link under the garden.
    const gardenText = await page.locator(".garden").innerText();
    if (!/rate|add|fill|later/i.test(gardenText)) {
      friction(testInfo, "Garden shows three empty rows (dash, no bar) with no invitation to rate them; the only hint is the 'Refine with the full assessment' link below the card.");
    }
    expectNoErrors();
  });

  test("S03: a newcomer picks another focus on step 3", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await rateAndContinue(page, ALL_SEVEN);

    await page.getByRole("button", { name: "Choose another" }).click();
    const picker = page.getByRole("group", { name: "Choose where to begin" });
    await expect(picker).toBeVisible();
    await expect(picker).toContainText("The subjects within your lowest domain.");
    const opts = picker.locator("button.fp-opt");
    const lowest = byId(4);
    await expect(opts).toHaveCount(lowest.subs.length);
    // All options belong to one domain.
    await expect(picker.locator(".fp-eyebrow")).toHaveText(Array(lowest.subs.length).fill(lowest.domain));
    await expect(opts.first()).toHaveAttribute("aria-current", "true");
    await expect(opts.first()).toContainText("Suggested");
    await shot(page, testInfo, "S03", "1-picker");
    friction(testInfo, `Picker on step 3 lists only the ${lowest.subs.length} subs of the lowest domain (${lowest.domain}); there is no way to start in Leisure or Body even though all seven were rated.`);

    const pick = lowest.subs[2];
    await opts.nth(2).click();
    await expect(page.getByRole("group", { name: "Choose where to begin" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: pick.name })).toBeVisible();
    await expect(page.getByText("A place you chose to begin.")).toBeVisible();
    await shot(page, testInfo, "S03", "2-picked");

    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page.getByRole("heading", { level: 3, name: pick.name })).toBeVisible();
    await expect(page.getByText(pick.ideas[0])).toBeVisible();
    expect(await readStore(page, "focus")).toMatchObject({ domainId: 4, subIndex: 2, practiceIndex: 0 });
    await shot(page, testInfo, "S03", "3-today");
    // The reason line on Today changes wording from what the user just saw.
    const reason = await page.locator(".fc .today-muted").innerText();
    if (reason !== "A place you chose to begin.") {
      friction(testInfo, `After choosing a sub by hand, Today's reason line reads "${reason}" (about the domain), which says nothing about the sub the user picked.`);
    }
    expectNoErrors();
  });

  test("S04: a newcomer skips to the full assessment and rates one domain", async ({ page }, testInfo) => {
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

    // Look for any path from Assess back to Today inside the page body.
    const mainLinks = await page.locator("main").getByRole("link").allInnerTexts();
    const mainButtons = await page.locator("main").getByRole("button").allInnerTexts();
    const cta = [...mainLinks, ...mainButtons].filter((t) => /today|plant|focus|begin|practice|next/i.test(t));
    if (cta.length === 0) {
      friction(testInfo, "After rating a whole domain on Assess, nothing in the page body points back to Today (no 'See your suggestion' action); the user must notice the Today tab or bottom-nav item. The dashboard labels a 'Focus' but is not actionable.");
    }

    await page.getByRole("link", { name: "Today", exact: true }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
    await expect(page.getByText(`Your lowest score: ${body.subs[1].name} (3/10).`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: body.subs[1].name })).toBeVisible();
    await expect(page.getByText("Averages from your full assessment.")).toBeVisible();
    await shot(page, testInfo, "S04", "3-today");

    await page.getByRole("button", { name: "Plant this seed" }).click();
    await expect(page.getByText(/Your practice this week/)).toBeVisible();
    await expect(page.getByText("You rated this 3/10.")).toBeVisible();
    expect(await readStore(page, "focus")).toMatchObject({ domainId: 1, subIndex: 1, startedAt: "2026-10-07" });
    await shot(page, testInfo, "S04", "4-planted");
    expectNoErrors();
  });

  test("S05: Back or reload during step 2 and step 3", async ({ page }, testInfo) => {
    const { errors, expectNoErrors } = trackErrors(page);
    await newcomer(page);
    const appUrl = page.url();

    // Step 2 with ratings, then browser Back.
    await page.getByRole("button", { name: "Begin" }).click();
    await rate(page, "Body & Vitality", 4);
    await rate(page, "Mind & Learning", 6);
    await shot(page, testInfo, "S05", "1-step2-draft");
    await page.goBack();
    // Steps are not history entries: Back leaves the app (to the page before it).
    const leftApp = !page.url().includes("/life-improver/");
    expect(leftApp).toBe(true);
    friction(testInfo, "Browser Back (and the Android back gesture) on step 2 or 3 leaves the app entirely: wizard steps are React state, not history entries. The in-page Back button is the only way to step back.");
    // Coming back to the app, the draft is gone.
    await page.goto(appUrl);
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();

    // Step 2 reload.
    await page.getByRole("button", { name: "Begin" }).click();
    await rate(page, "Body & Vitality", 4);
    await rate(page, "Mind & Learning", 6);
    await rate(page, "Work & Craft", 5);
    await expect(page.getByText("3 of 7 rated.")).toBeVisible();
    await page.reload();
    // Draft is gone: back at step 1 and nothing was stored.
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
    await page.getByRole("button", { name: "Begin" }).click();
    await expect(page.getByText("0 of 7 rated.")).toBeVisible();
    expect((await readStore(page, "quick")) ?? {}).toEqual({});
    await shot(page, testInfo, "S05", "2-after-reload-step2");
    friction(testInfo, "Reloading on step 2 returns to the welcome screen and discards every rating entered (draft lives only in React state; nothing is written until 'Plant this seed'). No warning, no 'continue where you left off'.");

    // Step 3 reload.
    for (const [n, v] of Object.entries(ONLY_FOUR)) await rate(page, n, v);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "A place to begin" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
    expect((await readStore(page, "quick")) ?? {}).toEqual({});
    await shot(page, testInfo, "S05", "3-after-reload-step3");

    // Navigating away mid-flow and back also resets.
    await page.getByRole("button", { name: "Begin" }).click();
    await rate(page, "Body & Vitality", 4);
    await page.getByRole("button", { name: "Skip to the full assessment" }).click();
    await expect(page).toHaveURL(/#\/assess$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/welcome$/);
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
    await shot(page, testInfo, "S05", "4-back-from-assess");
    // Going back to about:blank runs the seed init script there, which throws
    // on sessionStorage. That is a test artefact, not an app error.
    errors.splice(0, errors.length, ...errors.filter((e) => !/sessionStorage/.test(e)));
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
    // But so is the check-in prompt, on day 0.
    await expect(page.getByRole("heading", { name: "Look back on the week" })).toBeVisible();
    const checkinBtn = page.getByRole("button", { name: "Check in", exact: true });
    await expect(checkinBtn).toBeVisible();
    friction(testInfo, "On the day the seed is planted Today already shows a primary 'Check in' button under 'Look back on the week' (three questions, a minute). There has been no week to look back on; the plant action and the first check-in compete for attention.");

    await checkinBtn.click();
    await expect(page).toHaveURL(/#\/checkin$/);
    await expect(page.getByText("Did you practise this week?")).toBeVisible();
    await shot(page, testInfo, "S06", "2-checkin-day0");
    friction(testInfo, "Opening the check-in on day 0 asks 'Did you practise this week?' with no acknowledgement that the seed was planted today; answering 'Not this week' would record a first mark of nothing.");
    expectNoErrors();
  });

  test("S07: add the practice and the weekly check-in to the calendar", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await newcomer(page);
    await rateAndContinue(page, ALL_SEVEN);
    await page.getByRole("button", { name: "Plant this seed" }).click();
    const sub = byId(4).subs[0];
    const practice = sub.ideas[0];

    // Practice event.
    await page.getByRole("button", { name: "Add to calendar" }).click();
    const panel = page.getByRole("group", { name: "Add to calendar" });
    await expect(panel.getByLabel("Day")).toHaveValue("0");
    await expect(panel.getByLabel("Time")).toHaveValue("18:00");
    await shot(page, testInfo, "S07", "1-practice-panel");
    const [dl1] = await Promise.all([
      page.waitForEvent("download"),
      panel.getByRole("button", { name: "Download calendar file" }).click(),
    ]);
    expect(dl1.suggestedFilename()).toBe("life-improver-practice.ics");
    const ics1 = fs.readFileSync(await dl1.path(), "utf8");
    await expect(panel.getByRole("status")).toContainText("Downloaded");
    await shot(page, testInfo, "S07", "2-practice-downloaded");

    // Check-in event.
    await page.getByRole("button", { name: "Remind me weekly" }).click();
    const panel2 = page.getByRole("group", { name: "Add a weekly check-in to my calendar" });
    await expect(panel2.getByLabel("Day")).toHaveValue("0");
    await expect(panel2.getByLabel("Time")).toHaveValue("18:00");
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
    // Wednesday 2026-10-07 10:00 -> first Sunday 2026-10-11 at 18:00.
    expect(a.map.DTSTART).toBe("20261011T180000");
    expect(a.map.DTEND).toBe("20261011T182000");
    expect(a.map.RRULE).toBe("FREQ=WEEKLY");
    expect(a.map.SUMMARY.replace(/\\,/g, ",").replace(/\\;/g, ";")).toContain(practice.slice(0, 20));
    expect(a.map.DESCRIPTION).toContain(sub.name);
    expect(b.map.DTSTART).toBe("20261011T180000");
    expect(b.map.DTEND).toBe("20261011T181500");
    expect(b.map.RRULE).toBe("FREQ=WEEKLY");
    expect(b.map.SUMMARY).toContain("Weekly check-in");
    expect(b.map.URL).toMatch(/#\/checkin$/);

    if (a.map.DTSTART === b.map.DTSTART) {
      friction(testInfo, "Practice and check-in calendar events default to the same slot (Sunday 18:00, 20 and 15 minutes), so a user who accepts both defaults gets two overlapping events.");
    }
    friction(testInfo, "Planted Wednesday 2026-10-07: the first check-in reminder lands Sunday 2026-10-11, only 4 days into the first practice week, and the first practice slot is also Sunday (the day the check-in asks how the week went). Neither picker explains what the day means or offers 'in a few days'.");
    expectNoErrors();
  });

  test("S08: a newcomer opens #/checkin, #/journey or #/assess directly", async ({ page }, testInfo) => {
    const { expectNoErrors } = trackErrors(page);
    await freezeAt(page);
    await seed(page, {});

    // Check-in.
    await go(page, "/checkin");
    await expect(page.getByRole("heading", { name: "Weekly check-in" })).toBeVisible();
    await expect(page.getByText(/A check-in looks back at one practice/)).toBeVisible();
    await shot(page, testInfo, "S08", "1-checkin");
    const choose = page.getByRole("button", { name: "Choose a focus first" });
    await expect(choose).toBeVisible();

    // Journey.
    await go(page, "/journey");
    await expect(page.getByRole("heading", { name: "Journey" })).toBeVisible();
    await expect(page.getByText(/Nothing here yet/)).toBeVisible();
    await shot(page, testInfo, "S08", "2-journey");

    // Journey -> check-in -> "Choose a focus first" -> welcome.
    await page.getByRole("link", { name: "Make a first check-in" }).click();
    await expect(page).toHaveURL(/#\/checkin$/);
    await page.getByRole("button", { name: "Choose a focus first" }).click();
    await expect(page).toHaveURL(/#\/welcome$/);
    await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
    await shot(page, testInfo, "S08", "3-chain-ends-welcome");
    friction(testInfo, "Journey empty state offers 'Make a first check-in', which opens a check-in screen saying 'Choose a focus first', whose button lands on the welcome screen: three taps to learn that the first step is the onboarding. The first CTA should go straight to the welcome ('Begin with a short welcome'), and the check-in empty state should say there is nothing to check in on yet.");

    // Assess.
    await go(page, "/assess");
    await expect(page.getByText("How are you, really?")).toBeVisible();
    await expect(page.getByText("Pick a domain to start.")).toBeVisible();
    await shot(page, testInfo, "S08", "4-assess");
    // Tabs on empty states still show Today, which bounces to welcome.
    await page.getByRole("link", { name: "Today", exact: true }).click();
    await expect(page).toHaveURL(/#\/welcome$/);
    friction(testInfo, "A newcomer's tab bar shows Today, Journey, Assess and Practices as if the app were ready; Today silently redirects to the welcome screen and the tab bar vanishes, so the user cannot get back to Assess or Journey except via 'Skip to the full assessment'.");

    expectNoErrors();
  });
});
