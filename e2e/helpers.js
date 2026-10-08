// Shared helpers for user-story tests.
import { expect } from "@playwright/test";

export const KEYS = {
  scores: "life-improver:scores:v1",
  quick: "life-improver:quick:v1",
  focus: "life-improver:focus:v1",
  checkins: "life-improver:checkins:v1",
  meta: "life-improver:meta:v1",
};

// A Wednesday at 10:00 local time. Tests move the clock from here.
export const START = new Date("2026-10-07T10:00:00");

// Pin the browser clock before the app loads. Use page.clock.fastForward or
// setSystemTime later to simulate days and weeks.
export async function freezeAt(page, date = START) {
  await page.clock.install({ time: date });
}

// Seed localStorage once per test (before the first app script runs).
// `data` maps KEYS names (scores, quick, focus, checkins) to values.
export async function seed(page, data = {}) {
  await page.addInitScript(([entries, keys]) => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    for (const [name, value] of Object.entries(entries)) {
      localStorage.setItem(keys[name], JSON.stringify(value));
    }
  }, [data, KEYS]);
}

export async function readStore(page, name) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEYS[name]);
}

// Navigate inside the app by hash.
export async function go(page, path = "/") {
  await page.goto("#" + path);
}

// Collect uncaught errors; call expectNoErrors at the end of a test.
export function trackErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Service Worker/i.test(m.text())) errors.push(m.text());
  });
  return { errors, expectNoErrors: () => expect(errors).toEqual([]) };
}

// Sample data: a user who onboarded 3 weeks ago and checked in twice.
export const RETURNING = {
  quick: { 1: 4, 2: 7, 3: 6, 4: 8, 5: 5, 6: 6, 7: 7 },
  focus: { domainId: 1, subIndex: 2, practiceIndex: 0, startedAt: "2026-09-16", skipped: [] },
  checkins: [
    { id: "2026-09-20T18:00:00.000Z", date: "2026-09-20", week: "2026-W38", domainId: 1, subIndex: 2, practiceIndex: 0, practised: "some", score: 3, note: "Hard week." },
    { id: "2026-09-27T18:00:00.000Z", date: "2026-09-27", week: "2026-W39", domainId: 1, subIndex: 2, practiceIndex: 0, practised: "yes", score: 4, note: "" },
  ],
  scores: { "1-2": 4 },
};

// Write a friction note into the story report (picked up by the report agent).
export function friction(testInfo, note) {
  testInfo.annotations.push({ type: "friction", description: note });
}

// Journey shows its totals as tiles: a number above a label. Read the tile by
// its label so the check does not depend on class names or on how the number
// and label are laid out. `label` is the exact visible label, e.g. "weeks active".
export async function expectJourneyStat(page, count, label) {
  const tile = page.getByRole("main").getByText(label, { exact: true }).locator("..");
  await expect(tile).toHaveText(`${count} ${label}`, { useInnerText: true });
}
