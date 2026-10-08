// Group 3 user stories (S20-S29, S50-S55), updated for the v2.1 flows.
// Each test records screenshots in e2e/.artifacts and notes remaining flow
// friction through the shared `friction` helper.
import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, trackErrors, readStore, friction, RETURNING, KEYS, expectJourneyStat } from "./helpers.js";
import { FRAMEWORK } from "../src/data/framework.js";

// ---------- local helpers ----------

async function shot(page, testInfo, id, step) {
  await page.screenshot({
    path: `e2e/.artifacts/${id}-${testInfo.project.name}-${step}.png`,
    fullPage: true,
  });
}

// Click a main-nav link by its label (only the visible nav is in the a11y tree).
async function tab(page, name) {
  await page.getByRole("link", { name, exact: true }).click();
}

// Assess: open a domain pill and move one sub's slider.
async function rateSub(page, domainName, subName, value) {
  await page.getByRole("button", { name: new RegExp("^" + domainName.replace(/[&]/g, "\\$&")) }).click();
  const slider = page.getByRole("slider", { name: `${subName} score`, exact: true });
  await slider.scrollIntoViewIfNeeded();
  await slider.fill(String(value));
  await expect(slider).toHaveValue(String(value));
}

// All 30 sub scores keyed "<domainId>-<subIndex>".
const SUB_COUNTS = { 1: 5, 2: 4, 3: 5, 4: 4, 5: 4, 6: 4, 7: 4 };
function allScores(value, overrides = {}, omit = []) {
  const out = {};
  for (const [d, n] of Object.entries(SUB_COUNTS)) {
    for (let i = 0; i < n; i++) out[`${d}-${i}`] = value;
  }
  Object.assign(out, overrides);
  for (const k of omit) delete out[k];
  return out;
}

const domainOf = (id) => FRAMEWORK.find((d) => d.id === id);
const subOf = (domainId, subIndex) => domainOf(domainId).subs[subIndex];

const pngSize = (buf) => ({
  sig: buf.subarray(0, 8).toString("hex"),
  width: buf.readUInt32BE(16),
  height: buf.readUInt32BE(20),
});

// Practices: open a domain pill and a sub pill by hand.
async function openSub(page, domainName, subName) {
  await page.getByRole("button", { name: domainName, exact: true }).click();
  await page.getByRole("button", { name: subName, exact: true }).click();
}

// Save the file a click downloads and parse it as JSON.
async function downloadJson(page, testInfo, trigger, filename) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  const file = testInfo.outputPath(filename);
  await download.saveAs(file);
  return { name: download.suggestedFilename(), json: JSON.parse(fs.readFileSync(file, "utf8")), file };
}

// ---------- S20 ----------

test("S20: browse Practices and adopt one as this week's practice", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();

  await tab(page, "Practices");
  await openSub(page, "Body & Vitality", "Sleep & Recovery");
  const rows = page.locator(".ir");
  const rowCount = await rows.count();
  expect(rowCount).toBe(10);

  // The practice already in use is marked "This week" and has no button;
  // every other row offers "Practise this week".
  await expect(page.locator(".cat-tag")).toHaveCount(1);
  await expect(rows.nth(0).locator(".cat-tag")).toHaveText("This week");
  await expect(rows.nth(0).getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Practise this week/ })).toHaveCount(rowCount - 1);
  await shot(page, testInfo, "S20", "practices-list");

  const targetIndex = 5;
  const targetText = subOf(1, 2).ideas[targetIndex];
  await expect(rows.nth(targetIndex).locator(".cat-text")).toHaveText(targetText);
  await rows.nth(targetIndex).getByRole("button", { name: "Practise this week" }).click();

  // One tap: plants the practice and goes to Today.
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
  await expect(page.locator(".fc-practice")).toHaveText(targetText);
  // P2: the sub is unchanged, so the clock, the origin and the review stay; only the practice changes.
  await expect(page.getByText("You rated this 4/10.")).toBeVisible();
  const focus = await readStore(page, "focus");
  expect(focus).toMatchObject({ domainId: 1, subIndex: 2, practiceIndex: targetIndex, startedAt: RETURNING.focus.startedAt, skipped: [] });
  expect(focus.origin).toBeUndefined();
  await shot(page, testInfo, "S20", "today-adopted");

  // Back on Practices the new practice carries the tag and the old one a button.
  await tab(page, "Practices");
  await openSub(page, "Body & Vitality", "Sleep & Recovery");
  await expect(page.locator(".cat-tag")).toHaveCount(1);
  await expect(rows.nth(targetIndex).locator(".cat-tag")).toHaveText("This week");
  await expect(rows.nth(0).getByRole("button", { name: "Practise this week" })).toBeVisible();
  await shot(page, testInfo, "S20", "practices-after");

  // P2: adopting inside the sub already in focus keeps the clock, so the
  // check-in stays open for a person with two earlier check-ins.
  await tab(page, "Today");
  await expect(page.getByText("Your first check-in opens")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Check in early" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check in", exact: true })).toBeVisible();
  expectNoErrors();
});

// ---------- S21 ----------

test("S21: complete all 30 subs, share the image, switch focus from Today", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  // 29 subs rated 6, the focus sub (Sleep & Recovery) 4; Humor (7-3) is the one left to do.
  await seed(page, {
    quick: RETURNING.quick,
    focus: RETURNING.focus,
    scores: allScores(6, { "1-2": 4 }, ["7-3"]),
  });
  await go(page, "/assess");
  await expect(page.getByText("Overall · 29/30")).toBeVisible();

  await rateSub(page, "Leisure & Pleasure", "Humor", 2);
  await expect(page.getByText("Overall · 30/30")).toBeVisible();
  await shot(page, testInfo, "S21", "assess-complete");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Share image" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("life-improver-2026-10-07.png");
  const file = testInfo.outputPath("share.png");
  await download.saveAs(file);
  const png = pngSize(fs.readFileSync(file));
  expect(png.sig).toBe("89504e470d0a1a0a");
  expect(png.width).toBeGreaterThan(500);
  expect(png.height).toBeGreaterThan(500);
  await expect(page.getByRole("status").filter({ hasText: "Image saved to your downloads." })).toBeVisible();
  await shot(page, testInfo, "S21", "image-saved");

  // The dashboard now leads back to the week: one primary button to Today,
  // and a "Make this my focus" action on every "Focus here" row but the current focus.
  await expect(page.getByText("Focus here")).toBeVisible();
  await expect(page.getByRole("button", { name: "Make this my focus: Humor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Make this my focus: Sleep & Recovery" })).toHaveCount(0);
  await page.getByRole("button", { name: "See this week's focus" }).click();

  // Today keeps the focus and says Humor is now the lowest, with a Switch button.
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
  await expect(page.getByText("You rated this 4/10.")).toBeVisible();
  await expect(page.getByText("Humor is now your lowest (2/10). Switch your focus?")).toBeVisible();
  await shot(page, testInfo, "S21", "today-nudge");

  await page.getByRole("button", { name: "Switch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Humor" })).toBeVisible();
  await expect(page.getByText("You chose this place to begin.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch", exact: true })).toHaveCount(0);
  expect(await readStore(page, "focus")).toMatchObject({ domainId: 7, subIndex: 3, origin: "picked", startedAt: "2026-10-07" });
  await shot(page, testInfo, "S21", "today-switched");

  expectNoErrors();
});

// ---------- S22 ----------

test("S22: lowering another sub below the focus sub in Assess", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/");
  await expect(page.getByText("You rated this 4/10.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch", exact: true })).toHaveCount(0);
  await shot(page, testInfo, "S22", "today-before");

  // One point lower than the focus sub is not enough to speak up.
  await tab(page, "Assess");
  await rateSub(page, "Leisure & Pleasure", "Humor", 3);
  await tab(page, "Today");
  await expect(page.getByRole("button", { name: "Switch", exact: true })).toHaveCount(0);

  // Two points lower is.
  await tab(page, "Assess");
  await rateSub(page, "Leisure & Pleasure", "Humor", 2);
  await shot(page, testInfo, "S22", "assess-lowered");
  await tab(page, "Today");
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
  const card = page.locator(".nudge");
  await expect(card).toContainText("Humor is now your lowest (2/10). Switch your focus?");
  await expect(card.getByRole("button", { name: "Switch", exact: true })).toBeVisible();
  await shot(page, testInfo, "S22", "today-after");

  // "Not now" hides the card, keeps the focus and survives a reload.
  await card.getByRole("button", { name: "Not now" }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
  expect((await readStore(page, "focus")).dismissedNudge).toEqual({ key: "7-3", score: 2 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await expect(page.locator(".nudge")).toHaveCount(0);

  // It speaks again only when that sub's score changes.
  await tab(page, "Assess");
  await rateSub(page, "Leisure & Pleasure", "Humor", 1);
  await tab(page, "Today");
  await expect(page.locator(".nudge")).toContainText("Humor is now your lowest (1/10).");
  await shot(page, testInfo, "S22", "today-again");

  expectNoErrors();
});

// ---------- S23 ----------

test("S23: download a copy, start over, restore on a new device", async ({ page, browser }, testInfo) => {
  test.setTimeout(60_000);
  const { expectNoErrors } = trackErrors(page);
  page.on("dialog", (d) => d.accept());
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/settings");

  const copy = await downloadJson(page, testInfo, page.getByRole("button", { name: "Download a copy" }), "copy.json");
  expect(copy.name).toBe("life-improver-2026-10-07.json");
  const exported = copy.json;
  expect(exported.app).toBe("life-improver");
  expect(exported.schema).toBe(2);
  expect(exported.data.checkins).toHaveLength(2);
  expect(exported.data.focus.subIndex).toBe(2);
  expect(exported.data.scores).toEqual({ "1-2": 4 });
  expect(exported.data.quick["1"]).toBe(4);
  await shot(page, testInfo, "S23", "downloaded");

  // Start over.
  await page.getByRole("button", { name: "Reset all data" }).click();
  await expect(page).toHaveURL(/#\/welcome$/);
  expect(await readStore(page, "checkins")).toEqual([]);
  expect(await readStore(page, "focus")).toBeNull();
  // The welcome screen now offers the way back.
  await expect(page.getByText("Restore from a saved copy")).toBeVisible();
  await shot(page, testInfo, "S23", "after-reset");

  // New device: a second, empty browser context with the project's options.
  const { browserName, defaultBrowserType, launchOptions, trace, ...ctxOptions } = testInfo.project.use;
  const context = await browser.newContext(ctxOptions);
  try {
    const page2 = await context.newPage();
    const errors2 = trackErrors(page2);
    const dialogs = [];
    let dialogAction = "accept";
    page2.on("dialog", (d) => {
      dialogs.push(d.message());
      return dialogAction === "accept" ? d.accept() : d.dismiss();
    });
    await freezeAt(page2);
    await page2.goto("#/");
    await expect(page2).toHaveURL(/#\/welcome$/);
    await expect(page2.getByText("Restore from a saved copy")).toBeVisible();
    await shot(page2, testInfo, "S23", "new-device-welcome");

    // One step from the welcome screen: pick the file; the page reloads onto Today.
    const reloaded = page2.waitForEvent("load");
    await page2.locator('input[type="file"]').setInputFiles(copy.file);
    await reloaded;
    await expect(page2).toHaveURL(/#\/$/);
    await expect(page2.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
    const notice = page2.getByRole("status").filter({ hasText: "Restored 2 check-ins." });
    await expect(notice).toBeVisible();
    await shot(page2, testInfo, "S23", "after-restore");
    // An empty device has nothing to replace, so no confirm dialog was asked.
    expect(dialogs).toEqual([]);

    expect((await readStore(page2, "checkins")).length).toBe(2);
    expect((await readStore(page2, "focus")).subIndex).toBe(2);
    expect(await readStore(page2, "scores")).toEqual({ "1-2": 4 });

    await notice.getByRole("button", { name: "Dismiss" }).click();
    await expect(notice).toHaveCount(0);
    await tab(page2, "Journey");
    await expectJourneyStat(page2, 2, "check-ins");
    await shot(page2, testInfo, "S23", "new-device-journey");

    // Restoring onto a device that already has data still asks first.
    await page2.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page2.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
    dialogAction = "dismiss";
    const asked = page2.waitForEvent("dialog");
    await page2.locator('input[type="file"]').setInputFiles(copy.file);
    expect((await asked).message()).toMatch(/Replace all data on this device/);
    await expect(page2).toHaveURL(/#\/settings$/);
    errors2.expectNoErrors();
  } finally {
    await context.close();
  }

  expectNoErrors();
});

// ---------- S24 ----------

// Every Storage method throws, as in some private modes.
const blockStorage = (page) =>
  page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    for (const m of ["getItem", "setItem", "removeItem", "clear"]) Storage.prototype[m] = blocked;
  });

test("S24: storage throws (private mode)", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await blockStorage(page);
  await go(page, "/");
  await expect(page).toHaveURL(/#\/welcome$/);

  // The warning is there from the first screen; with nothing to save yet, it offers no download.
  const banner = page.getByRole("alert").filter({ hasText: "Saving is off in this browser. Download a copy before you leave." });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("button", { name: "Download a copy" })).toHaveCount(0);
  await shot(page, testInfo, "S24", "welcome");

  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page).toHaveURL(/#\/welcome\/rate$/);
  for (const label of ["Body & Vitality", "Mind & Learning", "Work & Craft", "Relationships & Love"]) {
    const slider = page.getByRole("slider", { name: label });
    await slider.focus();
    await slider.press("ArrowLeft");
  }
  await page.getByRole("button", { name: "Next" }).click();
  await shot(page, testInfo, "S24", "step3");
  await page.getByRole("button", { name: "Plant this seed" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await expect(page.locator(".fc")).toBeVisible();
  // The banner stays after the first real action, and cannot be dismissed.
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
  // Now there is something to save, so the download is offered.
  await expect(banner.getByRole("button", { name: "Download a copy" })).toBeVisible();
  await shot(page, testInfo, "S24", "today-in-memory");

  // Check-in works in memory too. It is the first day, so it is an early one.
  await page.getByRole("link", { name: "Check in early" }).click();
  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("radio", { name: "5", exact: true }).check();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await shot(page, testInfo, "S24", "checked-in");

  await tab(page, "Journey");
  await expectJourneyStat(page, 1, "check-in");
  await expect(banner).toBeVisible();

  // "Download a copy" in the banner exports what is in memory.
  const fromBanner = await downloadJson(page, testInfo, banner.getByRole("button", { name: "Download a copy" }), "banner-copy.json");
  expect(fromBanner.name).toBe("life-improver-2026-10-07.json");
  expect(fromBanner.json.data.checkins).toHaveLength(1);
  expect(fromBanner.json.data.checkins[0]).toMatchObject({ practised: "yes", score: 5 });
  expect(fromBanner.json.data.focus).not.toBeNull();
  expect(Object.keys(fromBanner.json.data.quick)).toHaveLength(4);
  await shot(page, testInfo, "S24", "journey");

  // Settings has its own button, and it exports the same.
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("button")).toHaveCount(0);
  const fromSettings = await downloadJson(page, testInfo, page.getByRole("button", { name: "Download a copy" }), "settings-copy.json");
  expect(fromSettings.json.data.checkins).toHaveLength(1);
  expect(fromSettings.json.data.focus).not.toBeNull();
  await shot(page, testInfo, "S24", "settings");

  // Reload: everything is gone, back to the newcomer welcome screen.
  await page.goto("#/");
  await page.reload();
  await expect(page).toHaveURL(/#\/welcome$/);
  await shot(page, testInfo, "S24", "after-reload");

  friction(
    testInfo,
    "With storage blocked the banner is honest and the download works, but it appears on the welcome screen before there is anything to save, with a 'Download a copy' button that would export an empty file.  Settings still says 'Your garden stays with you' under the warning."
  );
  expectNoErrors();
});

// ---------- S25 ----------

// What the keyboard focus rests on, and whether a focus ring can be seen.
async function focusInfo(page) {
  await page.waitForTimeout(250); // buttons transition their outline for 100ms
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { name: "(body)", tag: "body", visible: false, inMain: false };
    const style = (e) => getComputedStyle(e);
    const ring = (e) => style(e).outlineStyle !== "none" && parseFloat(style(e).outlineWidth) > 0;
    let visible = ring(el);
    let how = visible ? "outline" : "none";
    if (!visible && el.nextElementSibling && ring(el.nextElementSibling)) {
      visible = true;
      how = "sibling outline";
    }
    if (!visible && el.matches("input[type=radio],input[type=file]")) {
      const lab = el.closest("label");
      if (lab && ring(lab)) { visible = true; how = "label outline"; }
    }
    // The skip link shows itself with a 2px border when focused.
    if (!visible && el.matches(".skip-link") && parseFloat(style(el).borderTopWidth) > 0) {
      visible = true;
      how = "border";
    }
    const label =
      el.getAttribute("aria-label") ||
      (el.labels && el.labels[0] && el.labels[0].innerText) ||
      el.innerText ||
      el.getAttribute("name") ||
      el.tagName;
    return {
      name: label.trim().replace(/\s+/g, " ").slice(0, 50),
      tag: el.tagName.toLowerCase(),
      type: el.type || "",
      visible,
      how,
      inMain: !!el.closest("main"),
    };
  });
}

test("S25: keyboard-only user completes the loop", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {});
  await go(page, "/");
  await expect(page).toHaveURL(/#\/welcome$/);

  const noRing = [];
  const note = async () => {
    const info = await focusInfo(page);
    if (!info.visible && info.tag !== "h2" && info.tag !== "main") noRing.push(`${info.tag}[${info.type}] "${info.name}"`);
    return info;
  };
  // Press Tab until the focused element's text matches; return the number of presses.
  const tabTo = async (pattern, max = 20) => {
    for (let n = 1; n <= max; n++) {
      await page.keyboard.press("Tab");
      const info = await note();
      if (pattern.test(info.name)) return n;
    }
    throw new Error(`never reached ${pattern}`);
  };

  const toBegin = await tabTo(/^Begin$/);
  await shot(page, testInfo, "S25", "welcome-focus");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/welcome\/rate$/);

  // Step 2: rate four domains with the arrow keys.
  await expect(page.getByRole("heading", { name: "How does each ground feel?" })).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    await note();
    await page.keyboard.press("ArrowRight");
  }
  await expect(page.getByText("4 of 7 rated.")).toBeVisible();
  await shot(page, testInfo, "S25", "sliders");
  const toNext = await tabTo(/^Next$/);
  await page.keyboard.press("Enter");

  // Step 3: plant.
  await expect(page.getByRole("heading", { name: "A place to begin" })).toBeFocused();
  const toPlant = await tabTo(/^Plant this seed$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeFocused();
  await shot(page, testInfo, "S25", "today");

  // Today > Check in early (the first check-in opens on day 3).
  const toCheckin = await tabTo(/^Check in early$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Weekly check-in" })).toBeFocused();
  await page.keyboard.press("Tab");
  await note();
  await page.keyboard.press("Space"); // Yes
  await page.keyboard.press("Tab");
  await note();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight"); // score 5
  await page.keyboard.press("Tab");
  await note();
  await page.keyboard.type("Slept better.");
  await shot(page, testInfo, "S25", "checkin-form");
  await page.keyboard.press("Tab");
  const save = await note();
  expect(save.name).toBe("Save check-in");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeFocused();
  await shot(page, testInfo, "S25", "reward");
  await tabTo(/^Keep this practice$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  const saved = await readStore(page, "checkins");
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ practised: "yes", score: 5, note: "Slept better." });

  // A fresh load of Today: the first Tab stop is the skip link, one Enter
  // moves to the content, and the next Tab lands inside it.
  await page.reload();
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = await note();
  expect(skip.name).toBe("Skip to content");
  expect(skip.visible).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(page).toHaveURL(/#\/$/);
  await page.keyboard.press("Tab");
  expect((await focusInfo(page)).inMain).toBe(true);
  await shot(page, testInfo, "S25", "after-skip");

  // Framework: the accordion header is a real button that opens with Enter,
  // and the sub names inside are links into Practices.
  await go(page, "/framework");
  const header = page.getByRole("main").getByRole("button", { name: /^Body & Vitality/ });
  expect(await header.evaluate((el) => el.tagName)).toBe("BUTTON");
  await header.focus();
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  const subLink = await note();
  expect(subLink.tag).toBe("a");
  expect(subLink.name).toBe("Movement & Fitness");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/practices\?d=1&s=0$/);

  const ringless = [...new Set(noRing)];
  friction(
    testInfo,
    `Keyboard loop completes and focus is moved to each new heading. Tab presses: ${toBegin} to Begin, ${toNext} to Next (passes the 3 sliders left unrated and Back), ${toPlant} to Plant, ${toCheckin} to Check in early. The skip link is the first stop on every load. Controls without an outline ring: ${ringless.join("; ") || "none"}.`
  );
  expect(ringless).toEqual([]);
  expectNoErrors();
});

// ---------- S25b ----------

test("S25b: a Tab right after a route change is not undone by the late focus move", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {});
  // A slow frame, as on a loaded phone or CI runner: the app's own move of focus to
  // the new heading arrives well after the person has already pressed Tab.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__lateFrames = 0;
    window.requestAnimationFrame = (cb) =>
      raf(() =>
        setTimeout(() => {
          cb(performance.now());
          window.__lateFrames++;
        }, 400)
      );
  });
  await go(page, "/");
  await expect(page).toHaveURL(/#\/welcome$/);
  await page.getByRole("button", { name: "Begin" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "How does each ground feel?" })).toBeFocused();
  const lateFrames = () => page.evaluate(() => window.__lateFrames);
  const before = await lateFrames();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    // The first Tab lands before the late frame. Let it run, then check focus held.
    if (i === 0) await page.waitForFunction((n) => window.__lateFrames > n, before);
    await expect(page.getByRole("slider").nth(i)).toBeFocused();
    await page.keyboard.press("ArrowRight");
  }
  await expect(page.getByText("4 of 7 rated.")).toBeVisible();
  expectNoErrors();
});

// ---------- S26 ----------

async function audit(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const roots = [document.querySelector("header"), document.querySelector("nav[aria-label=Main]"), document.querySelector("nav[aria-label=Primary]"), main, document.querySelector("footer")].filter(Boolean);
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && (r.width > 0 || r.height > 0 || el.matches(".sr-only,input"));
    };
    const nameOf = (el) => {
      const lb = el.getAttribute("aria-labelledby");
      if (lb) {
        const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
        if (t) return t;
      }
      const al = el.getAttribute("aria-label");
      if (al && al.trim()) return al.trim();
      if (el.labels && el.labels.length) {
        const t = [...el.labels].map((l) => l.textContent).join(" ").trim();
        if (t) return t;
      }
      const clone = el.cloneNode(true);
      clone.querySelectorAll("[aria-hidden=true]").forEach((n) => n.remove());
      const t = (clone.textContent || "").trim();
      if (t) return t;
      return (el.getAttribute("title") || el.getAttribute("alt") || "").trim();
    };
    const unnamed = [];
    const sel = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=slider], [role=radio], [role=tab], [tabindex]:not([tabindex='-1'])";
    for (const root of roots) {
      root.querySelectorAll(sel).forEach((el) => {
        if (!visible(el)) return;
        if (!nameOf(el)) unnamed.push(el.outerHTML.slice(0, 120));
      });
    }
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter(visible)
      .map((h) => [Number(h.tagName[1]), h.textContent.trim().slice(0, 40)]);
    const jumps = [];
    for (let i = 1; i < headings.length; i++) {
      if (headings[i][0] - headings[i - 1][0] > 1) jumps.push(`${headings[i - 1][1]} (h${headings[i - 1][0]}) -> ${headings[i][1]} (h${headings[i][0]})`);
    }
    // Elements that look clickable but are neither links, buttons nor focusable.
    const fake = [];
    const interactive = "a[href], button, input, select, textarea, label, summary, [role=button], [tabindex]";
    main?.querySelectorAll("*").forEach((el) => {
      if (getComputedStyle(el).cursor !== "pointer") return;
      const hit = el.closest(interactive);
      if (!hit || hit === main) fake.push(`${el.tagName.toLowerCase()}.${el.className}`);
    });
    return { unnamed, headings, jumps, fake: [...new Set(fake)], h1: headings.filter((h) => h[0] === 1).length, h2: headings.filter((h) => h[0] === 2).length };
  });
}

test("S26: every route has named controls and a sane heading order", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();

  const routes = ["/", "/journey", "/assess", "/practices", "/framework", "/sources", "/checkin", "/settings", "/welcome"];
  const report = {};
  for (const r of routes) {
    await go(page, r);
    await expect(page.locator("main h2").first()).toBeVisible();
    if (r === "/assess") await page.getByRole("button", { name: /^Body & Vitality/ }).click();
    if (r === "/practices") {
      await page.getByRole("button", { name: "Body & Vitality" }).click();
    }
    if (r === "/framework") await page.getByRole("main").getByRole("button", { name: /^Body & Vitality/ }).click();
    report[r] = await audit(page);
    await shot(page, testInfo, "S26", r === "/" ? "today" : r.slice(1));
  }

  for (const r of routes) {
    const a = report[r];
    expect(a.unnamed, `unnamed controls on ${r}`).toEqual([]);
    expect(a.h1, `h1 count on ${r}`).toBe(1);
    expect(a.h2, `h2 count on ${r}`).toBeGreaterThanOrEqual(1);
    expect(a.jumps, `heading level jumps on ${r}`).toEqual([]);
    expect(a.fake, `clickable non-focusable elements on ${r}`).toEqual([]);
  }
  testInfo.annotations.push({ type: "audit", description: JSON.stringify(report) });

  // Moving to a screen from the nav puts focus on that screen's title.
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  for (const name of ["Journey", "Assess", "Practices", "Today"]) {
    await tab(page, name);
    await expect(page.locator("main h2").first()).toBeFocused();
  }
  expectNoErrors();
});

// ---------- S27 ----------

test("S27: reach Framework, Sources and Settings", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await shot(page, testInfo, "S27", "today-top");

  const isMobile = testInfo.project.name === "mobile";
  const viewport = page.viewportSize();
  const mainNav = page.getByRole("navigation", { name: isMobile ? "Primary" : "Main" });
  const bottomTabs = await mainNav.getByRole("link").allInnerTexts();

  // Settings: the gear in the header is on screen without scrolling, on every size.
  const gear = page.getByRole("banner").getByRole("link", { name: "Settings", exact: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  const gearBox = await gear.boundingBox();
  expect(gearBox.y + gearBox.height).toBeLessThanOrEqual(viewport.height);
  expect(gearBox.width).toBeGreaterThanOrEqual(44);
  expect(gearBox.height).toBeGreaterThanOrEqual(44);
  await gear.click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
  await shot(page, testInfo, "S27", "settings");

  // Framework and Sources: tabs on desktop; rows in Settings on a phone (the
  // footer is hidden there, and Practices links to both as well).
  const targets = { Framework: "/framework", Sources: "/sources" };
  const report = {};
  for (const [label, path] of Object.entries(targets)) {
    await go(page, isMobile ? "/settings" : "/");
    await expect(page.getByRole("heading", { name: isMobile ? "Settings & privacy" : "This week, tend one thing." })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    const inNav = await mainNav.getByRole("link", { name: label, exact: true }).count();
    const link = isMobile
      ? page.getByRole("main").getByRole("link", { name: label, exact: true })
      : mainNav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    report[label] = { inNav };
    await link.click();
    await expect(page).toHaveURL(new RegExp("#" + path + "$"));
    await shot(page, testInfo, "S27", path.slice(1));
    if (isMobile) {
      // Back from a pushed screen goes to its parent, Practices.
      await page.getByRole("banner").getByRole("link", { name: "Back to Practices" }).click();
      await expect(page).toHaveURL(/#\/practices$/);
    }
  }

  if (isMobile) {
    expect(bottomTabs.map((t) => t.trim())).toEqual(["Today", "Journey", "Assess", "Practices"]);
    for (const label of Object.keys(targets)) expect(report[label].inNav).toBe(0);
    // The footer is gone on a phone.
    await expect(page.getByRole("navigation", { name: "More" })).toBeHidden();
    friction(
      testInfo,
      `Settings is one tap from every tab screen (gear in the app bar). Framework and Sources are rows in Settings and links on Practices; the bottom bar has ${bottomTabs.join(", ")}.`
    );
  } else {
    expect(report.Framework.inNav).toBe(1);
    expect(report.Sources.inNav).toBe(1);
  }
  expectNoErrors();
});

// ---------- S28 ----------

test("S28: Framework and Sources link to related practices", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/framework");

  const main = page.getByRole("main");
  const header = page.getByRole("main").getByRole("button", { name: /^Body & Vitality/ });
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await expect(main.getByRole("link")).toHaveCount(0);
  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await expect(main.getByRole("link")).toHaveCount(domainOf(1).subs.length);
  await shot(page, testInfo, "S28", "framework-expanded");

  // Every sub name is a link to that sub's practices.
  for (const [si, sub] of domainOf(1).subs.entries()) {
    await expect(main.getByRole("link", { name: sub.name, exact: true })).toHaveAttribute("href", `#/practices?d=1&s=${si}`);
  }

  // Following the third one lands on Practices with that sub open and its list showing.
  await main.getByRole("link", { name: "Sleep & Recovery", exact: true }).click();
  await expect(page).toHaveURL(/#\/practices\?d=1&s=2$/);
  await expect(page.locator(".dp.a")).toHaveText("Body & Vitality");
  await expect(page.locator(".sp.a")).toHaveText("Sleep & Recovery");
  await expect(page.locator(".ir")).toHaveCount(10);
  await expect(page.locator(".ir").first().locator(".cat-tag")).toHaveText("This week");
  await shot(page, testInfo, "S28", "practices-from-framework");

  // Back returns to Framework.
  await page.goBack();
  await expect(page).toHaveURL(/#\/framework$/);
  const stillOpen = (await header.getAttribute("aria-expanded")) === "true";

  // Sources: a link to Practices at the top; the prose mapping stays prose.
  await go(page, "/sources");
  await expect(page.getByText(/sources ·/)).toBeVisible();
  await shot(page, testInfo, "S28", "sources");
  const mapped = await main.getByText(/Referenced in .* practices/i).count();

  // The old query form is still ignored.
  // It opens on this week's focus (Body & Vitality, Sleep & Recovery) instead.
  await go(page, "/practices?domain=1&sub=2");
  await expect(page.locator(".dp.a")).toHaveText("Body & Vitality");
  await expect(page.locator(".sp.a")).toHaveText(subOf(1, 2).name);

  friction(
    testInfo,
    `Framework sub names now link straight into Practices. Remaining: Back from Practices returns to Framework with the domain ${stillOpen ? "still open" : "collapsed again, so the person has to re-open it to pick the next sub"}. Sources has ${mapped} notes saying 'Referenced in ... practices' that stay plain text; the link to the sub they name is not there.`
  );
  expectNoErrors();
});

// ---------- S29 ----------

// Write raw (already stringified) values into localStorage once per test.
async function seedRaw(page, raw) {
  await page.addInitScript(([entries]) => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
  }, [raw]);
}

test("S29: damaged storage shows a recovery path", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  const goodCheckin = RETURNING.checkins[0];
  const raw = {
    [KEYS.quick]: JSON.stringify(RETURNING.quick),
    [KEYS.focus]: JSON.stringify(RETURNING.focus),
    // One good entry, one malformed, one with an impossible score.
    [KEYS.checkins]: JSON.stringify([goodCheckin, { id: 5 }, { ...RETURNING.checkins[1], score: 99 }]),
    // Valid map with two bad entries.
    [KEYS.scores]: JSON.stringify({ "1-2": 4, "9-9x": 3, "2-1": 55 }),
  };
  await seedRaw(page, raw);
  await go(page, "/journey");
  await expect(page.getByRole("heading", { name: "Journey" })).toBeVisible();

  // Only the valid entry survives, and the person is told.
  await expectJourneyStat(page, 1, "check-in");
  const notice = page.getByRole("status").filter({ hasText: "Some saved data could not be read." });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "Open Settings" })).toBeVisible();
  await shot(page, testInfo, "S29", "journey");
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.checkins + ":bad")).toBe(raw[KEYS.checkins]);
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.scores + ":bad")).toBe(raw[KEYS.scores]);
  expect(await readStore(page, "scores")).toEqual({ "1-2": 4 });

  // Today carries it too.
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await expect(notice).toBeVisible();
  await shot(page, testInfo, "S29", "today");

  // The link leads to Settings, which offers the damaged copy.
  await notice.getByRole("link", { name: "Open Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
  await expect(page.getByText("Some saved data could not be read, and a copy of it was kept.")).toBeVisible();
  await shot(page, testInfo, "S29", "settings");
  const damaged = await downloadJson(page, testInfo, page.getByRole("button", { name: "Download the damaged copy" }), "damaged.json");
  expect(damaged.name).toBe("life-improver-damaged-2026-10-07.json");
  expect(damaged.json).toMatchObject({ app: "life-improver", kind: "damaged-copy" });
  expect(damaged.json.copies[KEYS.checkins + ":bad"]).toBe(raw[KEYS.checkins]);
  expect(damaged.json.copies[KEYS.scores + ":bad"]).toBe(raw[KEYS.scores]);

  // Dismissing hides the notice for the visit.
  await go(page, "/journey");
  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(notice).toHaveCount(0);
  await tab(page, "Today");
  await expect(notice).toHaveCount(0);

  // After a reload the data has been trimmed for good, the notice does not
  // return, but the damaged copy is still on offer in Settings.
  await page.reload();
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await expect(notice).toHaveCount(0);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download the damaged copy" })).toBeVisible();

  friction(
    testInfo,
    "The notice says what happened but not what was lost: the person is not told that one check-in and two scores were dropped, and the damaged file has no way back in (Restore only accepts a normal copy)."
  );
  expectNoErrors();
});

test("S29b: unparsable JSON is backed up before it is overwritten", async ({ page }, testInfo) => {
  // Fixed in v2.1 (D1): the broken text is copied to ":bad" before the default replaces it.
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  const broken = '{"1-2": 4, "1-3": ';
  await seedRaw(page, { [KEYS.scores]: broken, [KEYS.quick]: JSON.stringify(RETURNING.quick) });
  await go(page, "/assess");
  await expect(page.getByRole("button", { name: /^Body & Vitality/ })).toBeVisible();
  await shot(page, testInfo, "S29b", "assess");
  const backup = await page.evaluate((k) => localStorage.getItem(k), KEYS.scores + ":bad");
  expect(backup).toBe(broken);
  // The person is told, and the broken text is on offer in Settings.
  await expect(page.getByRole("status").filter({ hasText: "Some saved data could not be read." })).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const damaged = await downloadJson(page, testInfo, page.getByRole("button", { name: "Download the damaged copy" }), "broken.json");
  expect(damaged.json.copies[KEYS.scores + ":bad"]).toBe(broken);
  expectNoErrors();
});

// ---------- S50 ----------

test("S50: Practices deep link ?d=&s= selects the domain and sub", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });

  // A valid link opens that domain and sub with its rows showing.
  await go(page, "/practices?d=3&s=2");
  await expect(page.locator(".dp.a")).toHaveText("Work & Craft");
  await expect(page.locator(".sp.a")).toHaveText(subOf(3, 2).name);
  await expect(page.locator(".ir")).toHaveCount(subOf(3, 2).ideas.length);
  await expect(page.locator(".ir").first().locator(".cat-text")).toHaveText(subOf(3, 2).ideas[0]);
  await shot(page, testInfo, "S50", "deep-link");

  // Following another link while the screen is open moves the selection.
  await go(page, "/practices?d=5&s=1");
  await expect(page.locator(".dp.a")).toHaveText("Community & Belonging");
  await expect(page.locator(".sp.a")).toHaveText(subOf(5, 1).name);

  // A domain without a sub opens the first sub; a bad sub falls back to the first.
  for (const q of ["d=2", "d=2&s=99", "d=2&s=-1", "d=2&s=abc"]) {
    await go(page, "/practices?" + q);
    await expect(page.locator(".dp.a")).toHaveText("Mind & Learning");
    await expect(page.locator(".sp.a")).toHaveText(subOf(2, 0).name);
  }

  // An unknown domain, the old parameter names, or no query: the screen opens on
  // this week's focus (domain 1, sub 2) and does not write the address.
  for (const q of ["d=99&s=1", "domain=1&sub=2", ""]) {
    await go(page, "/practices" + (q ? "?" + q : ""));
    await page.reload(); // a fresh visit: an open screen keeps its earlier selection
    await expect(page.locator(".dp.a")).toHaveText("Body & Vitality");
    await expect(page.locator(".sp.a")).toHaveText(subOf(1, 2).name);
    await expect(page.locator(".ir")).toHaveCount(subOf(1, 2).ideas.length);
    expect(page.url().endsWith(q ? "#/practices?" + q : "#/practices")).toBe(true);
  }
  await shot(page, testInfo, "S50", "unknown-domain");

  // A manual pick still replaces the address.
  await page.getByRole("button", { name: "Mind & Learning" }).click();
  await expect(page).toHaveURL(/#\/practices\?d=2&s=0$/);

  // The last domain on a phone sits in a horizontal scroller.
  await go(page, "/practices?d=7&s=3");
  await expect(page.locator(".sp.a")).toHaveText("Humor");
  // P5: the active pill is scrolled into view, also on a phone.
  await expect
    .poll(() =>
      page.locator(".dp.a").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth;
      })
    )
    .toBe(true);
  await shot(page, testInfo, "S50", "last-domain");

  // P5: picking another pill by hand updates the address, so a reload keeps it.
  await page.getByRole("button", { name: "Mind & Learning", exact: true }).click();
  await expect(page.locator(".dp.a")).toHaveText("Mind & Learning");
  await expect(page).toHaveURL(/#\/practices\?d=2&s=0$/);
  await page.reload();
  await expect(page.locator(".dp.a")).toHaveText("Mind & Learning");
  await expect(page.locator(".sp.a")).toHaveText(subOf(2, 0).name);
  const sub1 = subOf(2, 1).name;
  await page.getByRole("button", { name: sub1, exact: true }).click();
  await expect(page).toHaveURL(/#\/practices\?d=2&s=1$/);

  // P6: a link row under the intro leads to the framework and the sources.
  await expect(page.getByRole("link", { name: "About the framework" })).toHaveAttribute("href", "#/framework");
  await expect(page.getByRole("link", { name: "Sources" }).first()).toHaveAttribute("href", "#/sources");
  expectNoErrors();
});

// ---------- S51 ----------

test("S51: skip link and the Settings gear on every screen", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  const viewport = page.viewportSize();

  const isMobile = testInfo.project.name === "mobile";
  const routes = ["/", "/journey", "/assess", "/practices", "/framework", "/sources", "/checkin", "/settings", "/welcome"];
  // On a phone the app bar shows the gear on the four tab screens only; pushed
  // screens show a Back button instead and /welcome shows neither.
  const TAB_SCREENS = new Set(["/", "/journey", "/assess", "/practices"]);
  for (const r of routes) {
    await go(page, r);
    await page.reload();
    await expect(page.locator("main h2").first()).toBeVisible();

    // The gear: in the header, a 44px target, labelled.
    const gear = page.getByRole("banner").getByRole("link", { name: "Settings", exact: true });
    if (isMobile && !TAB_SCREENS.has(r)) {
      await expect(gear).toBeHidden();
      if (r !== "/welcome") {
        const back = page.getByRole("banner").getByRole("link", { name: /^Back to / });
        await expect(back).toBeVisible();
        const bb = await back.boundingBox();
        expect(bb.height, `back target on ${r}`).toBeGreaterThanOrEqual(44);
      }
    } else {
      await expect(gear).toBeVisible();
      const box = await gear.boundingBox();
      expect(box.y + box.height, `gear inside first screen on ${r}`).toBeLessThanOrEqual(viewport.height);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      if (r === "/settings") await expect(gear).toHaveAttribute("aria-current", "page");
      else await expect(gear).not.toHaveAttribute("aria-current", "page");
    }

    // The skip link: first stop on the page, on screen once focused.
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    const sb = await skip.boundingBox();
    expect(sb.y).toBeGreaterThanOrEqual(0);
    expect(sb.x).toBeGreaterThanOrEqual(0);
    if (r === "/") await shot(page, testInfo, "S51", "skip-focused");
    // Enter moves focus to the content and leaves the route alone.
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    expect(page.url().split("#")[1]).toBe(r);
  }

  // The gear leads to Settings from a deep screen, with focus on its title.
  await go(page, "/journey");
  await page.getByRole("banner").getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings & privacy" })).toBeFocused();
  // The wordmark leads home on a wide screen; on a phone, Back leads to Today.
  await page
    .getByRole("banner")
    .getByRole("link", { name: isMobile ? "Back to Today" : "Life Improver" })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await shot(page, testInfo, "S51", "home");
  expectNoErrors();
});

// ---------- S52 ----------

test("S52: Assess 'Make this my focus' plants a sub and goes to Today", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  // Sleep & Recovery (focus) 4, Family of Origin 3, Humor 2.
  await seed(page, {
    quick: RETURNING.quick,
    focus: RETURNING.focus,
    checkins: RETURNING.checkins,
    scores: { "1-2": 4, "4-1": 3, "7-3": 2 },
  });
  await go(page, "/assess");
  // Assess opens on the focus domain with its sliders showing.
  await expect(page.locator(".dp.a")).toContainText("Body & Vitality");
  await expect(page.getByRole("slider", { name: "Sleep & Recovery score" })).toBeVisible();
  await expect(page.getByText("Focus here")).toBeVisible();
  await shot(page, testInfo, "S52", "assess");

  // The current focus has no button; the other two do.
  await expect(page.getByRole("button", { name: "Make this my focus: Sleep & Recovery" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Make this my focus: Humor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Make this my focus: Family of Origin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "See this week's focus" })).toBeVisible();

  await page.getByRole("button", { name: "Make this my focus: Family of Origin" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Family of Origin" })).toBeVisible();
  await expect(page.getByText("You chose this place to begin.")).toBeVisible();
  const focus = await readStore(page, "focus");
  expect(focus).toMatchObject({ domainId: 4, subIndex: 1, origin: "picked", startedAt: "2026-10-07", skipped: [] });
  expect(typeof focus.practiceIndex).toBe("number");
  expect(subOf(4, 1).ideas[focus.practiceIndex]).toBeTruthy();
  await expect(page.locator(".fc-practice")).toHaveText(subOf(4, 1).ideas[focus.practiceIndex]);
  // Humor (2) is one lower than the new focus (3): too close to ask about.
  await expect(page.locator(".nudge")).toHaveCount(0);
  await shot(page, testInfo, "S52", "today");

  // Back in Assess the buttons have swapped places.
  await tab(page, "Assess");
  await expect(page.getByRole("button", { name: "Make this my focus: Family of Origin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Make this my focus: Sleep & Recovery" })).toBeVisible();

  // And "See this week's focus" goes to Today without changing anything.
  await page.getByRole("button", { name: "See this week's focus" }).click();
  await expect(page).toHaveURL(/#\/$/);
  expect(await readStore(page, "focus")).toEqual(focus);
  expectNoErrors();
});

// ---------- S53 ----------

test("S53: writes blocked after load: banner stays, download keeps the in-memory state", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  // Existing data is readable, but every write throws (a full or locked store).
  await page.addInitScript(([entries, keys]) => {
    if (!sessionStorage.getItem("__seeded")) {
      sessionStorage.setItem("__seeded", "1");
      localStorage.clear();
      for (const [name, value] of Object.entries(entries)) localStorage.setItem(keys[name], JSON.stringify(value));
    }
    Storage.prototype.setItem = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
  }, [{ quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores }, KEYS]);
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();

  const banner = page.getByRole("alert").filter({ hasText: "Saving is off in this browser. Download a copy before you leave." });
  await expect(banner).toBeVisible();
  await shot(page, testInfo, "S53", "today");

  // The banner follows the person across screens.
  for (const name of ["Journey", "Assess", "Practices"]) {
    await tab(page, name);
    await expect(banner).toBeVisible();
  }

  // A change made now lives in memory only, and the banner's download carries it.
  await openSub(page, "Body & Vitality", "Sleep & Recovery");
  await page.locator(".ir").nth(4).getByRole("button", { name: "Practise this week" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".fc-practice")).toHaveText(subOf(1, 2).ideas[4]);
  await expect(banner).toBeVisible();
  const copy = await downloadJson(page, testInfo, banner.getByRole("button", { name: "Download a copy" }), "memory-copy.json");
  expect(copy.json.data.focus).toMatchObject({ domainId: 1, subIndex: 2, practiceIndex: 4, startedAt: RETURNING.focus.startedAt });
  expect(copy.json.data.checkins).toHaveLength(2);
  expect(copy.json.data.scores).toEqual({ "1-2": 4 });
  // The disk copy was never updated.
  expect(await readStore(page, "focus")).toMatchObject({ practiceIndex: 0 });
  await shot(page, testInfo, "S53", "downloaded");
  expectNoErrors();
});

// ---------- S54 ----------

test("S54: Sources leads on to the practices", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/sources");
  const main = page.getByRole("main");
  await expect(page.getByRole("heading", { name: "The thinking behind it." })).toBeVisible();
  await expect(page.getByText(/sources ·/)).toBeVisible();

  // One link, near the top, before the first discipline.
  const link = main.getByRole("link", { name: "Browse the practices" });
  await expect(main.getByRole("link")).toHaveCount(1);
  const box = await link.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y).toBeLessThan(page.viewportSize().height);
  await shot(page, testInfo, "S54", "sources");

  await link.click();
  await expect(page).toHaveURL(/#\/practices$/);
  await expect(page.locator(".dp.a")).toHaveText("Body & Vitality");
  await expect(page.getByRole("heading", { name: /ways forward/ })).toBeFocused();
  await shot(page, testInfo, "S54", "practices");

  friction(
    testInfo,
    "The link goes to the bare Practices screen (it opens on the current focus), while each source note names the sub it supports ('Referenced in Sleep & Recovery practices'). A person reading about one source cannot jump to that sub's list."
  );
  expectNoErrors();
});

// ---------- S55 ----------

test("S55: adopt a practice from another domain via the Practices deep link", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/practices?d=2&s=1");
  await expect(page.locator(".sp.a")).toHaveText(subOf(2, 1).name);
  // Nothing in this sub is in use: no tag anywhere on the list.
  await expect(page.locator(".cat-tag")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Practise this week/ })).toHaveCount(10);
  await shot(page, testInfo, "S55", "list");

  const idx = 2;
  await page.locator(".ir").nth(idx).getByRole("button", { name: "Practise this week" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: subOf(2, 1).name })).toBeVisible();
  await expect(page.locator(".fc-practice")).toHaveText(subOf(2, 1).ideas[idx]);
  await expect(page.getByText("You chose this place to begin.")).toBeVisible();
  expect(await readStore(page, "focus")).toMatchObject({ domainId: 2, subIndex: 1, practiceIndex: idx, origin: "practice", skipped: [] });
  // A new sub starts a new first week; earlier check-ins stay in the Journey.
  await expect(page.getByText("Your first check-in opens Saturday.")).toBeVisible();
  await expect(page.locator(".nudge")).toHaveCount(0);
  await shot(page, testInfo, "S55", "today");

  await page.getByRole("button", { name: "Choose another focus" }).click();
  await expect(page.locator(".fp")).toBeVisible();
  await expect(page.locator(".fp").getByRole("button", { name: /practice/i })).toHaveCount(0);
  await shot(page, testInfo, "S55", "picker");

  await tab(page, "Journey");
  await expectJourneyStat(page, 2, "check-ins");
  await expect(page.getByRole("main").getByText("Sleep & Recovery").first()).toBeVisible();
  expectNoErrors();
});
