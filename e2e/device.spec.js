import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { freezeAt, seed, go, trackErrors, transitionDone, RETURNING } from "./helpers.js";

// Installed-iPhone checks (I5, I7, L7 and the touch paths). Phone project only.
// Chromium emulates the viewport, touch input and the user agent. It cannot
// emulate the notch, the Safari engine or a real home-screen install, so the
// parts that depend on those are checked at the source (CSS text, files).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Chromium has its own swipe-back for touch (overscroll history navigation) that
// real iOS standalone apps do not share. Turn it off so a drag that the app
// ignores really leaves the page where it is.
test.use({
  launchOptions: {
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ["--disable-features=OverscrollHistoryNavigation,TouchpadOverscrollHistoryNavigation"],
  },
});

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile" || browserName !== "chromium", "iPhone emulation runs in the mobile project");
});

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

// Make the page believe it was launched from the home screen.
const standaloneStub = () => {
  Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
  const original = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const mql = original(query);
    if (!/display-mode:\s*standalone/.test(String(query))) return mql;
    return new Proxy(mql, {
      get(target, prop) {
        if (prop === "matches") return true;
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
};

async function iphone(browser, testInfo, { standalone = true } = {}) {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    serviceWorkers: "block",
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: IPHONE_UA,
  });
  if (standalone) await context.addInitScript(standaloneStub);
  const page = await context.newPage();
  return { context, page };
}

async function open(page, route = "/") {
  await freezeAt(page);
  await seed(page, RETURNING);
  await go(page, route);
  await expect(page.getByRole("main")).toBeVisible();
}

// A real touch sequence through the browser's input pipeline.
async function touchDrag(page, { fromX, toX, y = 420, steps = 8, ms = 200, fromY, toY }) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x, yy) => [{ x, y: yy }];
  const y0 = fromY ?? y;
  const y1 = toY ?? y;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(fromX, y0) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: pt(fromX + ((toX - fromX) * i) / steps, y0 + ((y1 - y0) * i) / steps),
    });
    await page.waitForTimeout(ms / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function openSettings(page) {
  await page.getByRole("link", { name: "Settings" }).tap();
  await expect(page).toHaveURL(/#\/settings$/);
  await transitionDone(page);
}

const settled = (page) => page.waitForTimeout(900); // longer than the 600 ms fallback in useSwipeBack

test("I5: the edge swipe goes back in the installed app, and only then", async ({ browser }, testInfo) => {
  const { context, page } = await iphone(browser, testInfo);
  const { expectNoErrors } = trackErrors(page);
  expect(await page.evaluate(() => navigator.userAgent)).toContain("iPhone OS 18");
  expect(await page.evaluate(() => navigator.standalone)).toBe(true);
  expect(await page.evaluate(() => matchMedia("(display-mode: standalone)").matches)).toBe(true);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(3);

  await open(page);
  await openSettings(page);

  // A swipe from the edge to x=250 over about 200 ms goes back to Today.
  await touchDrag(page, { fromX: 8, toX: 250, steps: 8, ms: 200 });
  await expect(page).toHaveURL(/#\/$/);
  await transitionDone(page);
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.querySelector("main").style.transform)).toBe("");

  // A short, slow swipe (to x=60) springs back and stays.
  await openSettings(page);
  await touchDrag(page, { fromX: 8, toX: 60, steps: 6, ms: 600 });
  await settled(page);
  await expect(page).toHaveURL(/#\/settings$/);
  await expect.poll(() => page.evaluate(() => document.querySelector("main").style.transform)).toBe("");

  // A swipe that starts away from the edge (x=120) does nothing.
  await touchDrag(page, { fromX: 120, toX: 340, steps: 8, ms: 200 });
  await settled(page);
  await expect(page).toHaveURL(/#\/settings$/);

  // A vertical drag from the edge is a scroll, not a back.
  await touchDrag(page, { fromX: 8, toX: 14, fromY: 600, toY: 200, steps: 8, ms: 200 });
  await settled(page);
  await expect(page).toHaveURL(/#\/settings$/);

  // Tab screens are not pushed screens: no edge swipe there.
  await go(page, "/journey");
  await touchDrag(page, { fromX: 8, toX: 250, steps: 8, ms: 200 });
  await settled(page);
  await expect(page).toHaveURL(/#\/journey$/);
  expectNoErrors();
  await context.close();
});

test("I5: without the installed-app signal the edge swipe does nothing", async ({ browser }, testInfo) => {
  const { context, page } = await iphone(browser, testInfo, { standalone: false });
  expect(await page.evaluate(() => navigator.standalone)).not.toBe(true);
  expect(await page.evaluate(() => matchMedia("(display-mode: standalone)").matches)).toBe(false);

  await open(page);
  await openSettings(page);
  await touchDrag(page, { fromX: 8, toX: 250, steps: 8, ms: 200 });
  await settled(page);
  await expect(page).toHaveURL(/#\/settings$/);
  await context.close();
});

test("touch: tab bar, sheet drag-down and check-in scores all work with a finger", async ({ browser }, testInfo) => {
  const { context, page } = await iphone(browser, testInfo);
  const { expectNoErrors } = trackErrors(page);
  await open(page);

  // Tab bar.
  const primary = page.getByRole("navigation", { name: "Primary" });
  await primary.getByRole("link", { name: "Journey" }).tap();
  await expect(page).toHaveURL(/#\/journey$/);
  await transitionDone(page);
  await primary.getByRole("link", { name: "Practices" }).tap();
  await expect(page).toHaveURL(/#\/practices$/);
  await transitionDone(page);
  await primary.getByRole("link", { name: "Today" }).tap();
  await expect(page).toHaveURL(/#\/$/);
  await transitionDone(page);

  // Sheet: open by tap, close by dragging the grabber down with a finger.
  const trigger = page.getByRole("button", { name: "Choose another focus" });
  await trigger.tap();
  const sheet = page.getByRole("dialog", { name: "Choose where to begin" });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(500); // let it slide up
  const grab = await sheet.locator(".sheet-grab").boundingBox();
  const x = grab.x + grab.width / 2;
  const y = grab.y + grab.height / 2;
  await touchDrag(page, { fromX: x, toX: x, fromY: y, toY: y + 420, steps: 10, ms: 200 });
  await expect(sheet).toHaveCount(0);
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");

  // Reopen it and close it with the close button.
  // A fast flick can leave the page coasting for a moment, and a tap on a coasting
  // page only stops it. Wait for it to come to rest, as a person would.
  await page.waitForTimeout(1200);
  await trigger.tap();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).tap();
  await expect(sheet).toHaveCount(0);

  // Check-in: the practised choice and the 1 to 10 score buttons.
  await go(page, "/checkin");
  await page.locator("label.ci-opt", { hasText: /^Yes$/ }).tap();
  await expect(page.getByRole("radio", { name: "Yes" }).first()).toBeChecked();
  const score7 = page.locator("label.ci-opt", { hasText: /^7$/ });
  const box = await score7.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(30);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await score7.tap();
  await expect(page.locator('input[name="score"][value="7"]')).toBeChecked();
  await page.locator("label.ci-opt", { hasText: /^3$/ }).tap();
  await expect(page.locator('input[name="score"][value="3"]')).toBeChecked();
  await expect(page.locator('input[name="score"][value="7"]')).not.toBeChecked();
  expectNoErrors();
  await context.close();
});

// ---- Launch screens (L7) ----

const REQUIRED_SCREENS = [
  "393x852@3", "430x932@3", "390x844@3", "428x926@3", "375x812@3",
  "414x896@2", "414x896@3", "375x667@2", "402x874@3", "440x956@3",
];

function startupImages() {
  const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
  const links = html.match(/<link\b[^>]*rel="apple-touch-startup-image"[^>]*>/g) ?? [];
  return links.map((tag) => {
    const href = tag.match(/href="([^"]+)"/)[1];
    const media = tag.match(/media="([^"]+)"/)[1];
    const num = (re) => Number(media.match(re)[1]);
    return {
      href,
      media,
      w: num(/device-width:\s*(\d+)px/),
      h: num(/device-height:\s*(\d+)px/),
      ratio: num(/-webkit-device-pixel-ratio:\s*(\d+)/),
      portrait: /orientation:\s*portrait/.test(media),
      scheme: media.match(/prefers-color-scheme:\s*(light|dark)/)?.[1],
    };
  });
}

test("L7: every launch image exists, has the exact pixel size, and covers light and dark", async () => {
  const images = startupImages();
  expect(images.length).toBeGreaterThanOrEqual(REQUIRED_SCREENS.length * 2);

  for (const img of images) {
    expect(img.portrait, img.href).toBe(true);
    expect(["light", "dark"], img.href).toContain(img.scheme);
    expect(img.href.startsWith("/life-improver/splash/"), img.href).toBe(true);
    const file = path.join(ROOT, "public", img.href.replace("/life-improver/", ""));
    expect(existsSync(file), `${file} exists`).toBe(true);
    const bytes = readFileSync(file);
    // PNG signature, then IHDR: width at bytes 16-19, height at 20-23 (big endian).
    expect(bytes.subarray(0, 8).toString("hex"), img.href).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16), `${img.href} width`).toBe(img.w * img.ratio);
    expect(bytes.readUInt32BE(20), `${img.href} height`).toBe(img.h * img.ratio);
  }

  const schemes = new Map();
  for (const img of images) {
    const key = `${img.w}x${img.h}@${img.ratio}`;
    schemes.set(key, new Set([...(schemes.get(key) ?? []), img.scheme]));
  }
  for (const screen of REQUIRED_SCREENS) {
    expect([...(schemes.get(screen) ?? [])].sort(), screen).toEqual(["dark", "light"]);
  }
  // Every size listed has both variants, none is half-covered.
  for (const [key, set] of schemes) expect([...set].sort(), key).toEqual(["dark", "light"]);
});

// ---- Manifest (I7) ----

test("I7: the built manifest is a standalone app with a Check in shortcut and full icons", async ({ request }) => {
  const res = await request.get("manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/life-improver/");
  const checkin = manifest.shortcuts.find((s) => s.name === "Check in");
  expect(checkin).toBeTruthy();
  expect(checkin.url).toBe("/life-improver/#/checkin");
  const sizes = manifest.icons.map((i) => `${i.sizes}${i.purpose ? ":" + i.purpose : ""}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512", "512x512:maskable"]));
  // The icons the manifest names are really served.
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.ok(), icon.src).toBe(true);
  }
});

// ---- Safe areas ----

test("safe areas: the app bar and the tab bar pad by the device insets", async ({ page }) => {
  await page.goto(".");
  await expect(page.getByRole("main")).toBeVisible();

  const found = await page.evaluate(() => {
    const out = { tokens: {}, appBar: [], tabBar: [], viewport: "" };
    out.viewport = document.querySelector('meta[name="viewport"]')?.content ?? "";
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.cssRules && !rule.selectorText) walk(rule.cssRules);
        if (!rule.selectorText) continue;
        const sel = rule.selectorText;
        if (sel === ":root") {
          for (const name of ["--safe-top", "--safe-bottom"]) {
            const v = rule.style.getPropertyValue(name);
            if (v) out.tokens[name] = v.trim();
          }
        }
        if (/(^|,\s*)\.app-header$/.test(sel) && rule.style.getPropertyValue("padding-top")) {
          out.appBar.push(rule.style.getPropertyValue("padding-top"));
        }
        if (/(^|,\s*)\.bnav$/.test(sel) && rule.style.getPropertyValue("padding-bottom")) {
          out.tabBar.push(rule.style.getPropertyValue("padding-bottom"));
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        // A cross-origin sheet cannot be read; the app's own is same-origin.
      }
    }
    return out;
  });

  expect(found.viewport).toContain("viewport-fit=cover");
  expect(found.tokens["--safe-top"]).toContain("env(safe-area-inset-top");
  expect(found.tokens["--safe-bottom"]).toContain("env(safe-area-inset-bottom");
  expect(found.appBar.join(" ")).toContain("--safe-top");
  expect(found.tabBar.join(" ")).toContain("--safe-bottom");
});

test("S86: on iPhone a check-in tap toggles one hidden switch (the iOS 18 haptic), and Settings can turn it off", async ({ browser }, testInfo) => {
  const { context, page } = await iphone(browser, testInfo);
  // Safari has no navigator.vibrate; Chromium does, so take it away.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "vibrate", { value: undefined, configurable: true });
  });
  const { expectNoErrors } = trackErrors(page);
  await open(page, "/checkin");

  const hidden = page.locator("label[data-haptic] input[type=checkbox][switch]");
  await expect(hidden).toHaveCount(0);
  await page.locator("label.ci-opt", { hasText: /^7$/ }).tap();
  await expect(hidden).toHaveCount(1);
  await expect(hidden).toHaveAttribute("tabindex", "-1");
  const first = await hidden.evaluate((el) => el.checked);
  await page.locator("label.ci-opt", { hasText: /^8$/ }).tap();
  await expect(hidden).toHaveCount(1);
  expect(await hidden.evaluate((el) => el.checked)).toBe(!first);
  await expect(page.getByRole("radio", { name: "8" })).toBeChecked(); // focus and choice are untouched

  // Settings: Haptics is a native switch; off means a tap no longer toggles it.
  await go(page, "/settings");
  const toggle = page.getByRole("checkbox", { name: "Haptics" });
  await expect(toggle).toBeChecked();
  await toggle.evaluate((el) => el.click());
  await expect(toggle).not.toBeChecked();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("life-improver:prefs:v1")))).toEqual({ haptics: false });
  const before = await hidden.evaluate((el) => el.checked);
  await go(page, "/checkin");
  await page.locator("label.ci-opt", { hasText: /^9$/ }).tap();
  expect(await hidden.evaluate((el) => el.checked)).toBe(before);

  expectNoErrors();
  await context.close();
});
