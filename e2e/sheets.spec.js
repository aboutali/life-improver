import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, trackErrors, readStore, RETURNING } from "./helpers.js";

// Group 5: sheets, action sheets and the HUD. Phone and desktop unless noted.
const phoneOnly = (testInfo) => test.skip(testInfo.project.name !== "mobile", "phone story");

async function start(page, path = "/", data = RETURNING) {
  await freezeAt(page);
  await seed(page, data);
  await go(page, path);
  await expect(page.getByRole("main")).toBeVisible();
}

const nativeDialogs = (page) => {
  const seen = [];
  page.on("dialog", (d) => {
    seen.push(d.message());
    return d.dismiss();
  });
  return seen;
};

test("S70: the focus picker is a sheet: labelled, modal, closes three ways, returns focus", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  const trigger = page.getByRole("button", { name: "Choose another focus" });
  await trigger.click();

  const sheet = page.getByRole("dialog", { name: "Choose where to begin" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute("aria-modal", "true");
  // Focus moved to the title; the page behind is inert and hidden from assistive tech.
  await expect(sheet.getByRole("heading", { name: "Choose where to begin" })).toBeFocused();
  await expect(page.locator("#root")).toHaveAttribute("inert", "");
  await expect(page.locator("#root")).toHaveAttribute("aria-hidden", "true");

  // Tab stays inside: after enough presses focus is still within the sheet.
  for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);

  // 1. Escape.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(trigger).toBeFocused();

  // 2. A tap on the dimmed backdrop (top-left corner is always backdrop).
  await trigger.click();
  await expect(sheet).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // 3. The close button.
  await trigger.click();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Nothing was decided by looking.
  expect(await readStore(page, "focus")).toMatchObject({ domainId: 1, subIndex: 2 });
  expectNoErrors();
});

test("S71: dragging the header down dismisses a sheet; a short drag springs back", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  await page.getByRole("button", { name: "Choose another focus" }).click();
  const sheet = page.getByRole("dialog", { name: "Choose where to begin" });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(500); // let it finish sliding up

  const drag = async (dy, steps) => {
    const box = await sheet.locator(".sheet-head").boundingBox();
    const x = box.x + box.width / 3;
    await page.mouse.move(x, box.y + 12);
    await page.mouse.down();
    await page.mouse.move(x, box.y + 12 + dy, { steps });
    return () => page.mouse.up();
  };

  // A short, slow drag: the sheet follows, then springs back.
  const release = await drag(50, 5);
  await page.waitForTimeout(250);
  const during = await sheet.evaluate((el) => el.getBoundingClientRect().top);
  await release();
  await page.waitForTimeout(500);
  const after = await sheet.evaluate((el) => el.getBoundingClientRect().top);
  expect(during).toBeGreaterThan(after + 30);
  await expect(sheet).toBeVisible();

  // Past a third of its height: it leaves.
  const release2 = await drag(400, 8);
  await page.waitForTimeout(150);
  await release2();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choose another focus" })).toBeFocused();
  expectNoErrors();
});

test("S72: calendar panels are sheets with a full-width action, a HUD, and they close when done", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to calendar" });
  await expect(sheet.getByLabel("Day")).toBeVisible();
  const action = sheet.getByRole("button", { name: "Download calendar file" });
  const box = await action.boundingBox();
  const sheetBox = await sheet.boundingBox();
  expect(box.width).toBeGreaterThan(sheetBox.width * 0.8);
  const [download] = await Promise.all([page.waitForEvent("download"), action.click()]);
  expect(download.suggestedFilename()).toBe("life-improver-practice.ics");
  const hud = page.getByRole("status").filter({ hasText: "Added to calendar" });
  await expect(hud).toBeVisible();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add to calendar" })).toBeFocused();
  // The HUD leaves by itself.
  await expect(hud).toHaveCount(0, { timeout: 4000 });

  // The weekly reminder is a sheet too.
  await page.getByRole("button", { name: "Remind me weekly" }).click();
  const reminder = page.getByRole("dialog", { name: "Add a weekly check-in to my calendar" });
  await expect(reminder).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reminder).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remind me weekly" })).toBeFocused();
  expectNoErrors();
});

test("S73: a HUD confirms a new practice, a planted focus and a saved copy", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  const hud = (text) => page.getByRole("status").filter({ hasText: text });

  await page.getByRole("button", { name: "Swap practice" }).click();
  await expect(hud("New practice")).toBeVisible();
  await expect(page.locator(".hud-host")).toHaveAttribute("aria-live", "polite");

  await page.getByRole("button", { name: "Choose another focus" }).click();
  await page.getByRole("region", { name: "Suggested" }).locator(".fp-opt").nth(1).click();
  await expect(hud("Focus set")).toBeVisible();

  await go(page, "/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download a copy" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^life-improver-.*\.json$/);
  await expect(hud("Copy saved")).toBeVisible();
  expectNoErrors();
});

test("S74: destructive actions confirm in an action sheet, never a browser dialog", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  const native = nativeDialogs(page);
  await start(page, "/settings");
  const reset = page.getByRole("button", { name: "Reset all data" });
  await reset.click();

  const sheet = page.getByRole("dialog", { name: "Erase all data?" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAccessibleDescription(/cannot be undone/);
  // The destructive option is red; Cancel is a separate button and has focus.
  const erase = sheet.getByRole("button", { name: "Erase everything" });
  await expect(erase).toHaveClass(/is-destructive/);
  await expect(sheet.getByRole("button", { name: "Cancel" })).toBeFocused();
  const color = await erase.evaluate((el) => getComputedStyle(el).color);
  const danger = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--danger)";
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(color).toBe(danger);

  // Cancel, Escape and the backdrop all leave the data alone.
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(reset).toBeFocused();
  await reset.click();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await reset.click();
  await page.mouse.click(4, 4);
  await expect(sheet).toHaveCount(0);
  expect((await readStore(page, "checkins")).length).toBe(2);

  await reset.click();
  await sheet.getByRole("button", { name: "Erase everything" }).click();
  await expect(page).toHaveURL(/#\/welcome$/);
  expect(await readStore(page, "checkins")).toEqual([]);

  expect(native).toEqual([]);
  expectNoErrors();
});

test("S74b: clearing every score asks in an action sheet too", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  const native = nativeDialogs(page);
  const scores = {};
  for (const [d, n] of Object.entries({ 1: 5, 2: 4, 3: 5, 4: 4, 5: 4, 6: 4, 7: 4 })) {
    for (let i = 0; i < n; i++) scores[`${d}-${i}`] = 6;
  }
  await start(page, "/assess", { ...RETURNING, scores });
  const clear = page.getByRole("button", { name: "Reset all scores" });
  await clear.click();
  const sheet = page.getByRole("dialog", { name: "Clear every score?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await expect(sheet).toHaveCount(0);
  expect(Object.keys(await readStore(page, "scores"))).toHaveLength(30);
  await clear.click();
  await sheet.getByRole("button", { name: "Clear scores" }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(async () => Object.keys((await readStore(page, "scores")) || {}).length).toBe(0);
  expect(native).toEqual([]);
  expectNoErrors();
});

test("S75: Settings rows carry coloured icon tiles", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page, "/settings");
  const tiles = page.locator(".set-tile");
  expect(await tiles.count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator(".set-tile[aria-hidden='true']")).toHaveCount(await tiles.count());
  // Each tone paints a different background; none is transparent.
  const colours = await tiles.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
  expect(colours.every((c) => c !== "rgba(0, 0, 0, 0)")).toBe(true);
  expect(new Set(colours).size).toBeGreaterThanOrEqual(4);
  // The tile does not change what a row is called.
  await expect(page.getByRole("button", { name: "Download a copy" })).toBeVisible();
  await expect(page.getByLabel("Explore").getByRole("link", { name: "Framework" })).toBeVisible();
  expectNoErrors();
});
