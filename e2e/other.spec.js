// Group 3 user stories (S20-S29). Each test records screenshots in e2e/.artifacts
// and notes flow friction through the shared `friction` helper.
import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, trackErrors, readStore, friction, RETURNING, KEYS } from "./helpers.js";

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

const pngSize = (buf) => ({
  sig: buf.subarray(0, 8).toString("hex"),
  width: buf.readUInt32BE(16),
  height: buf.readUInt32BE(20),
});

// ---------- S20 ----------

test("S20: browse Practices and adopt one as this week's practice", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/");
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();

  await tab(page, "Practices");
  await page.getByRole("button", { name: "Body & Vitality" }).click();
  await page.getByRole("button", { name: "Sleep & Recovery" }).click();
  const rows = page.locator(".ir");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(5);
  const targetIndex = 5;
  const targetText = (await rows.nth(targetIndex).locator("span").nth(1).innerText()).trim();
  await shot(page, testInfo, "S20", "practices-list");

  // There is no action on a practice row, and nothing on the page to adopt one.
  await expect(page.locator(".ir button, .ir a")).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("button", { name: /adopt|use this|make this|set as|start this|this week/i })
  ).toHaveCount(0);
  // The row does not even say whether it is the practice already in use.
  await rows.nth(0).click();
  await expect(page).toHaveURL(/#\/practices$/);

  // Only workaround: Today > Swap practice steps through the sub's list one by one.
  await tab(page, "Today");
  const practice = page.locator(".fc-practice");
  let swaps = 0;
  while ((await practice.innerText()).trim() !== targetText && swaps < 15) {
    await page.getByRole("button", { name: "Swap practice" }).click();
    swaps++;
  }
  expect((await practice.innerText()).trim()).toBe(targetText);
  expect(swaps).toBeGreaterThan(2);
  await shot(page, testInfo, "S20", "today-after-swaps");

  // And the picker on Today only offers subs, never a specific practice.
  await page.getByRole("button", { name: "Choose another focus" }).click();
  await expect(page.locator(".fp").getByRole("button", { name: /practice/i })).toHaveCount(0);
  await shot(page, testInfo, "S20", "picker");

  friction(
    testInfo,
    `Practices rows (${rowCount} in Sleep & Recovery) have no action, no marker for the current practice, and no link back to Today. The only route to a chosen practice is Today > Swap practice repeatedly (${swaps} swaps to reach practice 6), and only inside the current focus sub. Choosing another sub always assigns its first fresh practice.`
  );
  expectNoErrors();
});

// ---------- S21 ----------

test("S21: complete all 30 subs, share the image, return to Today", async ({ page }, testInfo) => {
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

  // The dashboard "Focus" label names a domain; there is no way to act on it here.
  await expect(page.getByText("Focus here")).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: /make this my focus|set as focus|plant/i })).toHaveCount(0);

  await tab(page, "Today");
  // Today still shows the old focus: Sleep & Recovery at 4/10, while Humor is now the lowest at 2/10.
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
  await expect(page.getByText("You rated this 4/10.")).toBeVisible();
  await expect(page.locator(".fc")).not.toContainText("Humor");
  await shot(page, testInfo, "S21", "today");

  // Humor is only reachable through the picker.
  await page.getByRole("button", { name: "Choose another focus" }).click();
  await expect(page.locator(".fp").getByRole("button", { name: /Humor/ })).toBeVisible();
  await shot(page, testInfo, "S21", "today-picker");

  friction(
    testInfo,
    "After rating all 30 subs the lowest is Humor (2/10) but Today keeps Sleep & Recovery (4/10) with 'You rated this 4/10.' and no comment. Assess dashboard shows 'Focus' (weakest domain) and 'Focus here' (lowest subs) which disagree with Today's focus and offer no button to adopt them."
  );
  expectNoErrors();
});

// ---------- S22 ----------

test("S22: lowering another sub below the focus sub in Assess", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/");
  await expect(page.getByText("You rated this 4/10.")).toBeVisible();
  await shot(page, testInfo, "S22", "today-before");

  await tab(page, "Assess");
  await rateSub(page, "Leisure & Pleasure", "Humor", 2);
  await shot(page, testInfo, "S22", "assess-lowered");

  await tab(page, "Today");
  await expect(page.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
  await expect(page.getByText("You rated this 4/10.")).toBeVisible();
  // Nothing on Today mentions the new lowest sub or offers a switch.
  await expect(page.getByRole("main")).not.toContainText("Humor");
  await expect(page.getByRole("main").getByRole("button", { name: /switch|change focus|move to/i })).toHaveCount(0);
  await shot(page, testInfo, "S22", "today-after");

  friction(
    testInfo,
    "Humor now scores 2/10, below the focus sub (4/10), yet Today is unchanged: no banner, no 'Switch to Humor?'. The user must open 'Choose another focus' to find it. The explanatory line 'You rated this 4/10.' stays as is."
  );
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

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download a copy" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("life-improver-2026-10-07.json");
  const file = testInfo.outputPath("copy.json");
  await download.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
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
  await shot(page, testInfo, "S23", "after-reset");
  // The welcome screen offers no "I already have a copy" route.
  await expect(page.getByRole("main").getByText(/restore|already have|saved copy/i)).toHaveCount(0);

  // New device: a second, empty browser context with the project's options.
  const { browserName, defaultBrowserType, launchOptions, trace, ...ctxOptions } = testInfo.project.use;
  const context = await browser.newContext(ctxOptions);
  try {
    const page2 = await context.newPage();
    const errors2 = trackErrors(page2);
    page2.on("dialog", (d) => d.accept());
    await freezeAt(page2);
    await page2.goto("#/");
    await expect(page2).toHaveURL(/#\/welcome$/);
    await shot(page2, testInfo, "S23", "new-device-welcome");

    // The only way to Settings from the welcome screen is the footer link.
    await page2.getByRole("link", { name: "Settings & privacy" }).click();
    await expect(page2.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
    await shot(page2, testInfo, "S23", "new-device-settings");

    const reloaded = page2.waitForEvent("load");
    await page2.locator('input[type="file"]').setInputFiles(file);
    await reloaded;
    await expect(page2.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
    await shot(page2, testInfo, "S23", "after-restore");
    // No confirmation that anything was restored.
    await expect(page2.getByRole("main").getByText(/restored|welcome back|imported/i)).toHaveCount(0);

    expect((await readStore(page2, "checkins")).length).toBe(2);
    expect((await readStore(page2, "focus")).subIndex).toBe(2);
    expect(await readStore(page2, "scores")).toEqual({ "1-2": 4 });

    await tab(page2, "Today");
    await expect(page2.getByRole("heading", { name: "Sleep & Recovery" })).toBeVisible();
    await shot(page2, testInfo, "S23", "new-device-today");
    await tab(page2, "Journey");
    await expect(page2.getByText("2 check-ins")).toBeVisible();
    await shot(page2, testInfo, "S23", "new-device-journey");
    errors2.expectNoErrors();
  } finally {
    await context.close();
  }

  friction(
    testInfo,
    "On a new device the welcome screen has no 'restore a copy' route: the user must notice the small grey footer link 'Settings & privacy'. After picking the file the page reloads in place on Settings with no 'Restored' message and no move to Today; the confirm dialog says 'Replace all data on this device' even though the device is empty."
  );
  expectNoErrors();
});

// ---------- S24 ----------

test("S24: storage throws (private mode)", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    for (const m of ["getItem", "setItem", "removeItem", "clear"]) Storage.prototype[m] = blocked;
  });
  await go(page, "/");
  await expect(page).toHaveURL(/#\/welcome$/);
  await page.getByRole("button", { name: "Begin" }).click();
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
  await shot(page, testInfo, "S24", "today-in-memory");

  // The app works but never says the data is not being saved.
  await expect(page.getByText(/private|not (being )?saved|won.t be saved|only in memory|storage is (blocked|unavailable)|will be lost/i)).toHaveCount(0);

  // Check-in works in memory too.
  await page.getByRole("button", { name: "Check in" }).click();
  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("radio", { name: "5", exact: true }).check();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByRole("heading", { name: "Check-in saved" })).toBeVisible();
  await page.getByRole("button", { name: "Keep this practice" }).click();
  await expect(page.getByRole("heading", { name: "Checked in this week" })).toBeVisible();
  await shot(page, testInfo, "S24", "checked-in");

  // Settings: "Download a copy" silently produces an empty file.
  await tab(page, "Journey");
  await expect(page.getByText("1 check-in")).toBeVisible();
  await page.getByRole("link", { name: "Settings & privacy" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download a copy" }).click(),
  ]);
  const file = testInfo.outputPath("blocked-copy.json");
  await download.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(exported.data.checkins).toEqual([]);
  expect(exported.data.focus).toBeNull();
  await shot(page, testInfo, "S24", "settings");

  // Reload: everything is gone, back to the newcomer welcome screen.
  await page.goto("#/");
  await page.reload();
  await expect(page).toHaveURL(/#\/welcome$/);
  await shot(page, testInfo, "S24", "after-reload");

  friction(
    testInfo,
    "With storage blocked the whole loop works but nothing tells the user it will vanish: no banner on Today or Settings, and 'Download a copy' saves an EMPTY export (no check-in, no focus) without warning. After reload the user lands on Welcome as a newcomer. Settings still says 'Your garden stays with you'."
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

  const stops = [];
  const noRing = [];
  const note = async () => {
    const info = await focusInfo(page);
    stops.push(info);
    if (!info.visible && info.tag !== "h2" && info.tag !== "main") noRing.push(`${info.tag}[${info.type}] "${info.name}"`);
    return info;
  };
  // Press Tab until the focused element's text matches; return the number of presses.
  const tabTo = async (pattern, max = 15) => {
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

  // Today > Check in.
  const toCheckin = await tabTo(/^Check in$/);
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
  expect((await readStore(page, "checkins")).length).toBe(1);

  // Tab stops before the content on a fresh load of Today (no skip link).
  await page.reload();
  await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
  await expect(page.getByRole("link", { name: /skip/i })).toHaveCount(0);
  let beforeMain = 0;
  for (; beforeMain < 20; beforeMain++) {
    await page.keyboard.press("Tab");
    if ((await focusInfo(page)).inMain) break;
  }
  await shot(page, testInfo, "S25", "tab-to-content");

  // Framework accordion headers are clickable divs.
  await go(page, "/framework");
  const headerFocusable = await page.locator(".oh").first().evaluate((el) =>
    el.tabIndex >= 0 || ["BUTTON", "A", "SUMMARY"].includes(el.tagName) || el.hasAttribute("role")
  );

  const ringless = [...new Set(noRing)];
  friction(
    testInfo,
    `Keyboard loop completes and focus is moved to each new heading. Tab presses: ${toBegin} to Begin, ${toNext} to Next (passes 3 unrated sliders and Back), ${toPlant} to Plant, ${toCheckin} to Check in, ${beforeMain} stops before the first content on Today (no skip link). Controls without an outline ring: ${ringless.join("; ") || "none"}. Framework accordion headers focusable by keyboard: ${headerFocusable}.`
  );
  expect(beforeMain).toBeGreaterThan(3);
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
    await page.waitForTimeout(150);
    if (r === "/assess") await page.getByRole("button", { name: /^Body & Vitality/ }).click();
    if (r === "/practices") {
      await page.getByRole("button", { name: "Body & Vitality" }).click();
    }
    if (r === "/framework") await page.locator(".oh").first().click();
    report[r] = await audit(page);
    await shot(page, testInfo, "S26", r === "/" ? "today" : r.slice(1));
  }

  for (const r of routes) {
    const a = report[r];
    expect(a.unnamed, `unnamed controls on ${r}`).toEqual([]);
    expect(a.h1, `h1 count on ${r}`).toBe(1);
    expect(a.jumps, `heading level jumps on ${r}`).toEqual([]);
  }

  const noH2 = routes.filter((r) => report[r].h2 === 0);
  const fake = routes.filter((r) => report[r].fake.length).map((r) => `${r}: ${report[r].fake.join(", ")}`);
  testInfo.annotations.push({ type: "audit", description: JSON.stringify(report) });
  if (noH2.length) {
    friction(testInfo, `Routes with no h2 (the page title is a styled <p>, so focus after navigation lands on <main> and the screen reader hears no screen name): ${noH2.join(", ")}.`);
  }
  if (fake.length) {
    friction(testInfo, `Clickable non-focusable elements (mouse only): ${fake.join("; ")}.`);
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
  const targets = { Framework: "/framework", Sources: "/sources", "Settings & privacy": "/settings" };
  const report = {};

  for (const [label, path] of Object.entries(targets)) {
    await go(page, "/");
    await expect(page.getByRole("heading", { name: "This week, tend one thing." })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    const inNav = await mainNav.getByRole("link", { name: label, exact: true }).count();
    const link = page.getByRole("navigation", { name: "More" }).getByRole("link", { name: label });
    const box = await link.boundingBox();
    const belowFold = box.y + box.height > viewport.height;
    const scrollNeeded = Math.round(Math.max(0, box.y + box.height - viewport.height));
    report[label] = { inNav, belowFold, scrollNeeded, fontSize: await link.evaluate((e) => getComputedStyle(e).fontSize) };
    // One tap on the footer link (Playwright scrolls and checks nothing covers it).
    await link.click();
    await expect(page).toHaveURL(new RegExp("#" + path + "$"));
    await shot(page, testInfo, "S27", path.slice(1));
  }

  if (isMobile) {
    expect(bottomTabs.map((t) => t.trim())).toEqual(["Today", "Journey", "Assess", "Practices"]);
    for (const label of Object.keys(targets)) expect(report[label].inNav).toBe(0);
    // Footer links sit below the fold on Today.
    expect(report.Framework.belowFold).toBe(true);
    friction(
      testInfo,
      `On a phone the bottom bar has only ${bottomTabs.join(", ")}. Framework, Sources and Settings are reachable only by scrolling Today to the footer (${report.Framework.scrollNeeded}px below the first screen) and tapping a ${report.Framework.fontSize} grey link: one tap after a long scroll, nothing hints they exist. On the welcome screen the same footer is the only way out.`
    );
  } else {
    expect(report.Framework.inNav).toBe(1);
    expect(report.Sources.inNav).toBe(1);
    expect(report["Settings & privacy"].inNav).toBe(0);
    friction(testInfo, "Desktop: Framework and Sources are tabs; Settings & privacy exists only as a footer link (no tab, no header icon).");
  }
  expectNoErrors();
});

// ---------- S28 ----------

test("S28: Framework and Sources link to related practices", async ({ page }, testInfo) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, { quick: RETURNING.quick, focus: RETURNING.focus, checkins: RETURNING.checkins, scores: RETURNING.scores });
  await go(page, "/framework");
  await page.locator(".oh").first().click();
  await expect(page.getByText("Movement & Fitness").first()).toBeVisible();
  await shot(page, testInfo, "S28", "framework-expanded");

  const main = page.getByRole("main");
  // No links or buttons inside the expanded domain to practices or to Today.
  await expect(main.locator(".ob a, .ob button")).toHaveCount(0);
  await expect(main.locator("a[href*='practices'], a[href='#/']")).toHaveCount(0);
  // Clicking a sub name does nothing.
  await page.locator(".os").first().click();
  await expect(page).toHaveURL(/#\/framework$/);

  await go(page, "/sources");
  await expect(page.getByText(/sources ·/)).toBeVisible();
  await shot(page, testInfo, "S28", "sources");
  await expect(main.getByRole("link")).toHaveCount(0);
  await expect(main.getByRole("button")).toHaveCount(0);
  // The mapping lives in prose ("Referenced in ... practices") only.
  const mapped = await main.getByText(/Referenced in .* practices/i).count();

  // A hash query does not deep-link into Practices.
  await go(page, "/practices?domain=1&sub=2");
  await expect(page.getByText("Pick a domain.")).toBeVisible();
  await shot(page, testInfo, "S28", "practices-no-deeplink");

  friction(
    testInfo,
    `Framework (expanded domain, sub descriptions) and Sources (${mapped} notes say 'Referenced in ... practices') contain zero links or buttons; a sub name is plain text. To reach that sub's practices the user must leave, open Practices, then re-pick the domain pill and the sub pill; #/practices?domain=1&sub=2 is ignored. Nothing offers 'Practise this' or 'See practices'.`
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
  await shot(page, testInfo, "S29", "journey");

  // Only the valid entry survives; the user is told nothing.
  await expect(page.getByText("1 check-in")).toBeVisible();
  await expect(page.getByText(/damaged|corrupt|could not be read|recover(?!y)|went wrong/i)).toHaveCount(0);
  const bad = await page.evaluate((k) => localStorage.getItem(k), KEYS.checkins + ":bad");
  expect(bad).toBe(raw[KEYS.checkins]); // the raw text is kept for later
  expect(await readStore(page, "scores")).toEqual({ "1-2": 4 });

  await go(page, "/");
  await shot(page, testInfo, "S29", "today");
  await expect(page.getByText(/damaged|corrupt|could not be read|recover(?!y)/i)).toHaveCount(0);

  await page.getByRole("link", { name: "Settings & privacy" }).click();
  await expect(page.getByRole("heading", { name: "Settings & privacy" })).toBeVisible();
  await shot(page, testInfo, "S29", "settings");
  // Settings mentions neither the backup copy nor a way to use it.
  await expect(page.getByRole("main").getByText(/damaged|corrupt|backup|recover(?!y)|:bad/i)).toHaveCount(0);

  friction(
    testInfo,
    "Damaged data is trimmed silently: a malformed check-in and two bad scores vanish, Journey says '1 check-in' with no warning, and the raw text saved under life-improver:checkins:v1:bad is invisible and unreachable from Settings. There is no message and no link to Settings or a 'download the damaged copy' action."
  );
  expectNoErrors();
});

test("S29b: unparsable JSON is backed up before it is overwritten", async ({ page }, testInfo) => {
  // BUG (unfixed): usePersistentState.load() returns early from its catch block when
  // JSON.parse throws, so the ":bad" backup is never written and the effect then
  // overwrites the broken text with the empty default. The user's data is gone.
  test.fail();
  await freezeAt(page);
  const broken = '{"1-2": 4, "1-3": ';
  await seedRaw(page, { [KEYS.scores]: broken, [KEYS.quick]: JSON.stringify(RETURNING.quick) });
  await go(page, "/assess");
  await expect(page.getByRole("button", { name: /^Body & Vitality/ })).toBeVisible();
  await shot(page, testInfo, "S29b", "assess");
  const backup = await page.evaluate((k) => localStorage.getItem(k), KEYS.scores + ":bad");
  expect(backup).toBe(broken);
});
