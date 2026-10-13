import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, trackErrors, readStore, expectJourneyStat, RETURNING } from "./helpers.js";

// Group 6: swipe actions and long-press context menus on Journey and Practices rows.
const phoneOnly = (testInfo) => test.skip(testInfo.project.name !== "mobile", "touch story");
const desktopOnly = (testInfo) => test.skip(testInfo.project.name !== "desktop", "mouse story");

async function start(page, path = "/journey", data = RETURNING) {
  await freezeAt(page);
  await seed(page, data);
  await go(page, path);
  await expect(page.getByRole("main")).toBeVisible();
}

// Journey lists newest first: row 0 is the 27 Sep entry (no note), row 1 the 20 Sep one ("Hard week.").
const rows = (page) => page.locator("li.sw");
const MORE = /^More actions for/;

// Real touches through the browser's input pipeline.
async function touches(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
  return {
    down: (x, y) => send("touchStart", x, y),
    move: (x, y) => send("touchMove", x, y),
    up: () => send("touchEnd"),
    // Drag horizontally from the row's right side by `dx` px (negative is left), in small steps.
    async swipe(row, dx, { release = true } = {}) {
      await row.scrollIntoViewIfNeeded();
      const b = await row.boundingBox();
      const y = b.y + b.height / 2;
      const x0 = dx < 0 ? b.x + b.width - 40 : b.x + 60;
      await send("touchStart", x0, y);
      const steps = Math.max(4, Math.round(Math.abs(dx) / 12));
      for (let i = 1; i <= steps; i++) {
        await send("touchMove", x0 + (dx * i) / steps, y);
        await page.waitForTimeout(16);
      }
      if (release) {
        await page.waitForTimeout(60);
        await send("touchEnd");
      }
    },
  };
}

const offsetOf = (row) =>
  row.locator(".sw-body").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);

test("S80: swiping a Journey row left reveals a red Delete; swiping back or tapping elsewhere closes it; one row is open at a time", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  const t = await touches(page);

  // Closed: no Delete button for assistive tech or the tab order.
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);

  // A short pull reveals it and it stays.
  await t.swipe(rows(page).nth(0), -70);
  const del = rows(page).nth(0).getByRole("button", { name: "Delete", exact: true });
  await expect(del).toBeVisible();
  await expect.poll(() => offsetOf(rows(page).nth(0))).toBeLessThan(-80);
  expect(await del.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/^rgb\(19\d, 6\d, 4\d\)$|^rgb/);

  // Opening another row closes the first.
  await t.swipe(rows(page).nth(1), -70);
  await expect(rows(page).nth(1).getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  await expect.poll(() => offsetOf(rows(page).nth(0))).toBe(0);
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(1);

  // Swiping back to the right closes it.
  await t.swipe(rows(page).nth(1), 90);
  await expect.poll(() => offsetOf(rows(page).nth(1))).toBe(0);
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);

  // A tap elsewhere closes an open row.
  await t.swipe(rows(page).nth(0), -70);
  await expect.poll(() => offsetOf(rows(page).nth(0))).toBeLessThan(-80);
  await page.getByRole("heading", { name: "Journey", level: 2 }).tap();
  await expect.poll(() => offsetOf(rows(page).nth(0))).toBe(0);

  // A short, slow pull springs back.
  await t.swipe(rows(page).nth(0), -25);
  await expect.poll(() => offsetOf(rows(page).nth(0))).toBe(0);

  expect(await readStore(page, "checkins")).toHaveLength(2);
  expectNoErrors();
});

test("S80b: a vertical drag over a row scrolls the page and never opens it", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  const many = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(2026, 6, 6 + i * 7);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { id: `${date}T18:00:00.000Z`, date, week: `2026-W${String(28 + i).padStart(2, "0")}`, domainId: 1, subIndex: 2, practiceIndex: 0, practised: "yes", score: 4, note: "" };
  });
  await start(page, "/journey", { ...RETURNING, checkins: many });
  const t = await touches(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const before = await page.evaluate(() => window.scrollY);
  const row = rows(page).first();
  await row.scrollIntoViewIfNeeded();
  const b = await row.boundingBox();
  const x = b.x + b.width / 2;
  await t.down(x, b.y + b.height / 2);
  for (let i = 1; i <= 10; i++) {
    await t.move(x + 4, b.y + b.height / 2 - i * 14);
    await page.waitForTimeout(16);
  }
  await t.up();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await expect.poll(() => offsetOf(row)).toBe(0);
});

test("S81: a full swipe asks before deleting; Cancel brings the row back, Delete removes it, stats update and a HUD confirms", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  const t = await touches(page);
  await expectJourneyStat(page, 2, "check-ins");

  // Past 60% of the row: the first action runs, which asks.
  await t.swipe(rows(page).nth(0), -260);
  const sheet = page.getByRole("dialog", { name: "Delete this check-in?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => offsetOf(rows(page).nth(0))).toBe(0);
  expect(await readStore(page, "checkins")).toHaveLength(2);

  // Again, and this time confirm.
  await t.swipe(rows(page).nth(0), -260);
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Delete check-in" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Check-in deleted" })).toBeVisible();
  await expect(rows(page)).toHaveCount(1);
  const left = await readStore(page, "checkins");
  expect(left.map((c) => c.date)).toEqual(["2026-09-20"]);
  await expectJourneyStat(page, 1, "check-in");
  await expectJourneyStat(page, 1, "week active");
  expectNoErrors();
});

test("S81b: tapping the revealed Delete asks and then deletes; deleting the last entry shows the empty state", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  await start(page, "/journey", { ...RETURNING, checkins: [RETURNING.checkins[0]] });
  const t = await touches(page);
  await t.swipe(rows(page).first(), -70);
  await rows(page).first().getByRole("button", { name: "Delete", exact: true }).tap();
  await page.getByRole("dialog", { name: "Delete this check-in?" }).getByRole("button", { name: "Delete check-in" }).click();
  await expect(page.getByText("Your line is waiting")).toBeVisible();
  expect(await readStore(page, "checkins")).toEqual([]);
});

test("S82: a long press (500ms, still) lifts the row over a blurred backdrop with a menu; moving or a short press does not", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  const t = await touches(page);
  const row = rows(page).nth(1);
  await row.scrollIntoViewIfNeeded();
  const b = await row.boundingBox();
  const x = b.x + 60;
  const y = b.y + b.height / 2;

  // Short press: nothing.
  await t.down(x, y);
  await page.waitForTimeout(250);
  await t.up();
  await page.waitForTimeout(500);
  await expect(page.getByRole("menu")).toHaveCount(0);

  // A move of more than 10px cancels it (vertical, so the page just scrolls).
  await t.down(x, y);
  await page.waitForTimeout(100);
  await t.move(x, y - 14);
  await page.waitForTimeout(700);
  await t.up();
  await expect(page.getByRole("menu")).toHaveCount(0);

  // A still press of 500ms opens the menu, and letting go does not close it.
  await row.scrollIntoViewIfNeeded();
  const b2 = await row.boundingBox();
  await t.down(x, b2.y + b2.height / 2);
  const menu = page.getByRole("menu", { name: /^Actions for / });
  await expect(menu).toBeVisible({ timeout: 2000 });
  await t.up();
  await page.waitForTimeout(500);
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText(["Copy note", "Delete check-in"]);
  await expect(menu.getByRole("menuitem", { name: "Delete check-in" })).toHaveCSS("color", /rgb/);

  // The row is lifted (scale 1.02) over a blurred, dimmed backdrop; the page behind is inert.
  const lift = page.locator(".cm-lift");
  await expect.poll(() => lift.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)).toBeCloseTo(1.02, 2);
  expect(await page.locator(".cm-backdrop").evaluate((el) => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter)).toContain("blur");
  await expect(page.locator("#root")).toHaveAttribute("inert", "");
  await page.screenshot({ path: "/tmp/claude-0/-home-user-life-improver/b5b79337-447f-5c28-8559-480853f6fff2/scratchpad/shots-swipe/S82-menu.png" });

  // A tap on the backdrop closes it; focus goes back to the row's More button.
  await page.mouse.click(5, 5);
  await expect(menu).toHaveCount(0);
  await expect(row.getByRole("button", { name: MORE })).toBeFocused();
  expectNoErrors();
});

test("S82b: long-pressing a practice offers Practise this week, Copy practice and See sources", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  await start(page, "/practices?d=1&s=0");
  const t = await touches(page);
  const row = page.locator(".cat-row").nth(2);
  await row.scrollIntoViewIfNeeded();
  const b = await row.boundingBox();
  await t.down(b.x + 80, b.y + 24);
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible({ timeout: 2000 });
  await t.up();
  await expect(menu.getByRole("menuitem")).toHaveText(["Practise this week", "Copy practice", "See sources"]);
  await menu.getByRole("menuitem", { name: "See sources" }).tap();
  await expect(page).toHaveURL(/#\/sources$/);
});

test("S83: on desktop, right-click opens the menu; Copy note copies; Delete check-in asks, removes and confirms", async ({ page, context }, testInfo) => {
  desktopOnly(testInfo);
  const { expectNoErrors } = trackErrors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page);
  const row = rows(page).nth(1);
  await row.locator(".jr-note").click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "Copy note" }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Note copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Hard week.");

  // A row without a note has no Copy note.
  await rows(page).nth(0).getByText("Practised", { exact: false }).first().click({ button: "right" });
  await expect(menu.getByRole("menuitem")).toHaveText(["Delete check-in"]);
  await menu.getByRole("menuitem", { name: "Delete check-in" }).click();
  const sheet = page.getByRole("dialog", { name: "Delete this check-in?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Delete check-in" }).click();
  await expect(rows(page)).toHaveCount(1);
  expect((await readStore(page, "checkins")).map((c) => c.date)).toEqual(["2026-09-20"]);
  await expectJourneyStat(page, 1, "check-in");
  expectNoErrors();
});

test("S83b: on desktop, right-click on a practice, then Practise this week plants it", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await start(page, "/practices?d=1&s=0");
  const idea = page.locator(".cat-row").nth(3);
  const text = (await idea.locator(".cat-text").innerText()).trim();
  await idea.locator(".cat-text").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Practise this week" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("main").getByText(text)).toBeVisible();
  expect((await readStore(page, "focus")).practiceIndex).toBe(3);
});

test("S84: keyboard and screen-reader users reach every action through More actions, Shift+F10 or the menu key; swipe actions are not in the tab order", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page);
  const row = rows(page).nth(1);
  const more = row.getByRole("button", { name: MORE });
  const moreEl = row.locator("button.cm-more"); // by class: while the menu is open the page is aria-hidden
  await more.scrollIntoViewIfNeeded();
  await expect(more).toHaveAttribute("aria-haspopup", "menu");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  // The 44px target.
  const box = await more.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  // The swipe's Delete is not a stop for Tab or for a screen reader while closed.
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);

  await more.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(moreEl).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("menuitem", { name: "Copy note" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Delete check-in" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Copy note" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem", { name: "Delete check-in" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(moreEl).toBeFocused();

  // Shift+F10 and the menu key from the row's button.
  await page.keyboard.press("Shift+F10");
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ContextMenu");
  await expect(menu).toBeVisible();

  // Delete by keyboard: Enter on the item opens the action sheet; Escape there keeps the entry.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Delete this check-in?" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  expect(await readStore(page, "checkins")).toHaveLength(2);
  await expect(moreEl).toBeFocused();

  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await sheet.getByRole("button", { name: "Delete check-in" }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByRole("status").filter({ hasText: "Check-in deleted" })).toBeVisible();
  expectNoErrors();
});

test("S84b: every practice row has a More actions button; the menu is named for the row and Tab leaves it", async ({ page }) => {
  await start(page, "/practices?d=1&s=0");
  const count = await page.locator(".cat-row").count();
  await expect(page.getByRole("button", { name: MORE })).toHaveCount(count);
  const more = page.locator(".cat-row").nth(1).locator("button.cm-more");
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: /^Actions for / })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(more).toBeFocused();
});

test("S85: with Reduce Motion the row snaps without a transition", async ({ page }, testInfo) => {
  phoneOnly(testInfo);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  const t = await touches(page);
  await t.swipe(rows(page).nth(0), -70);
  const row = rows(page).nth(0);
  await expect.poll(() => offsetOf(row)).toBe(-88);
  expect(await row.locator(".sw-body").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await rows(page).nth(1).getByRole("button", { name: MORE }).click();
  expect(await page.locator(".cm-menu").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});
