import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, trackErrors, RETURNING } from "./helpers.js";

// Phone-only stories: motion, scroll memory and the swipe back.
test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(testInfo.project.name !== "mobile", "phone stories");
});

const primary = (page) => page.getByRole("navigation", { name: "Primary" });

async function start(page, path, init) {
  await freezeAt(page);
  if (init) await page.addInitScript(init);
  await seed(page, RETURNING);
  await go(page, path);
  await expect(page.getByRole("main")).toBeVisible();
}

test("S60: the current tab has a filled icon, the others an outline", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page, "/journey");
  const fills = await primary(page).getByRole("link").evaluateAll((links) =>
    links.map((a) => [a.textContent, a.querySelector("svg").getAttribute("fill")])
  );
  expect(fills).toEqual([
    ["Today", "none"],
    ["Journey", "currentColor"],
    ["Assess", "none"],
    ["Practices", "none"],
  ]);
  await primary(page).getByRole("link", { name: "Assess" }).click();
  await expect(primary(page).getByRole("link", { name: "Assess" }).locator("svg")).toHaveAttribute("fill", "currentColor");
  await expect(primary(page).getByRole("link", { name: "Journey" }).locator("svg")).toHaveAttribute("fill", "none");
  expectNoErrors();
});

test("S61: tapping the current tab scrolls to the top; each tab keeps its scroll", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page, "/practices");
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const kept = await page.evaluate(() => window.scrollY);

  await primary(page).getByRole("link", { name: "Journey" }).click();
  await expect(page).toHaveURL(/#\/journey$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await primary(page).getByRole("link", { name: "Practices" }).click();
  await expect(page).toHaveURL(/#\/practices$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(kept);

  // Tapping the active tab: top, same address, no new history entry.
  const entries = await page.evaluate(() => history.length);
  await primary(page).getByRole("link", { name: "Practices" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page).toHaveURL(/#\/practices$/);
  expect(await page.evaluate(() => history.length)).toBe(entries);

  // A pushed screen always starts at the top.
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expectNoErrors();
});

test("S62: navigation runs as a view transition: push, pop, tab", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await start(page, "/", () => {
    window.__navKinds = [];
    const original = document.startViewTransition?.bind(document);
    if (original) {
      document.startViewTransition = (cb) => {
        window.__navKinds.push(document.documentElement.dataset.nav);
        return original(cb);
      };
    }
  });
  test.skip(!(await page.evaluate(() => typeof document.startViewTransition === "function")), "no View Transitions");

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await primary(page).getByRole("link", { name: "Journey" }).click();
  await expect(page).toHaveURL(/#\/journey$/);
  await expect.poll(() => page.evaluate(() => window.__navKinds)).toEqual(["push", "pop", "tab"]);
  // The transition marker is cleared once it has finished.
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.nav ?? "")).toBe("");
  // Focus still lands on the new screen's heading.
  await expect(page.locator("main h2").first()).toBeFocused();
  expectNoErrors();
});

test("S63: reduced motion runs no transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page, "/", () => {
    window.__vt = 0;
    const original = document.startViewTransition?.bind(document);
    if (original) document.startViewTransition = (cb) => (window.__vt++, original(cb));
  });
  await primary(page).getByRole("link", { name: "Journey" }).click();
  await expect(page).toHaveURL(/#\/journey$/);
  await expect(page.locator("main h2").first()).toBeVisible();
  expect(await page.evaluate(() => window.__vt)).toBe(0);
});

test.describe("installed app", () => {
  const standalone = () => Object.defineProperty(navigator, "standalone", { value: true });

  async function drag(page, xs) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type, x) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y: 420 }] });
    await send("touchStart", xs[0]);
    for (const x of xs.slice(1)) {
      await send("touchMove", x);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(300);
    await send("touchEnd");
  }

  test("S64: swiping from the left edge goes back on a pushed screen", async ({ page }) => {
    const { expectNoErrors } = trackErrors(page);
    await start(page, "/checkin", standalone);
    await drag(page, [4, 40, 120, 220]);
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("main")).toBeVisible();
    expectNoErrors();
  });

  test("S64b: a short swipe springs back and stays", async ({ page }) => {
    await start(page, "/checkin", standalone);
    await drag(page, [4, 20, 50, 70]);
    await expect(page).toHaveURL(/#\/checkin$/);
    await expect.poll(() => page.evaluate(() => document.querySelector("main").style.transform)).toBe("");
  });
});
