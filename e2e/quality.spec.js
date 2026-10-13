// Quality suite: iOS-quality rubric checks (docs/product/IOS_QUALITY.md).
//   A1  axe: no serious or critical violations, every route, light and dark
//   A2  text scales with the root font size up to 200 %
//   A3  every control is at least 44 x 44 px (or has an ancestor/hit area that is)
//   L1  UI text uses the system font
//   M4  all motion stops under prefers-reduced-motion
//
// Every route runs in both colour schemes, seeded with RETURNING data. The
// onboarding routes run "fresh" (empty storage), as a newcomer sees them.
// A3, L1, M4 and A2 run in the mobile project only; A1 runs in both projects.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { RETURNING, freezeAt, seed } from "./helpers.js";

const ROUTES = [
  { path: "/", name: "today" },
  { path: "/journey", name: "journey" },
  { path: "/assess", name: "assess" },
  { path: "/practices", name: "practices" },
  { path: "/framework", name: "framework" },
  { path: "/sources", name: "sources" },
  { path: "/settings", name: "settings" },
  { path: "/checkin", name: "checkin" },
  { path: "/welcome", name: "welcome", fresh: true },
  { path: "/welcome/rate", name: "welcome-rate", fresh: true },
  // Empty states (L6): a newcomer's Journey and Check-in.
  { path: "/journey", name: "journey-empty", fresh: true },
  { path: "/checkin", name: "checkin-empty", fresh: true },
];
const SCHEMES = ["light", "dark"];

async function open(page, route) {
  await freezeAt(page);
  await seed(page, route.fresh ? {} : RETURNING);
  await page.goto("#" + route.path);
  await page.locator("main, [role=main]").first().waitFor();
  // Let enter transitions finish so colours are measured at rest.
  await page.waitForTimeout(800);
}

function describeNode(n) {
  const data = n.any?.[0]?.data;
  let extra = "";
  if (data && data.fgColor) {
    extra = ` fg ${data.fgColor} on bg ${data.bgColor}, ratio ${data.contrastRatio} (needs ${data.expectedContrastRatio})`;
  }
  return `${n.target.join(" ")}${extra}`;
}

for (const scheme of SCHEMES) {
  test.describe(`quality (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      const label = `${route.name} ${scheme}`;

      // ---------- A1 ----------
      test(`A1 axe: ${label}`, async ({ page }) => {
        await open(page, route);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        const report = bad.map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.help}\n` +
            v.nodes.map((n) => `    - ${describeNode(n)}`).join("\n"),
        );
        expect(report, `axe violations on ${route.path} (${scheme}):\n${report.join("\n")}`).toEqual([]);
      });

      // ---------- A3 ----------
      test(`A3 target size: ${label}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "touch targets are checked on the phone project");
        await open(page, route);
        const offenders = await page.evaluate(() => {
          const MIN = 44;
          const SEL = [
            "button",
            "a[href]",
            "input[type=radio]",
            "input[type=checkbox]",
            "input[type=range]",
            "[role=tab]",
            "[role=button]",
            "[role=link]",
            "summary",
          ].join(",");
          const big = (r) => r.width >= MIN - 0.5 && r.height >= MIN - 0.5;
          const describe = (el) => {
            const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
            const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
            return `${el.tagName.toLowerCase()}${cls} "${text}"`;
          };
          const out = [];
          for (const el of document.querySelectorAll(SEL)) {
            if (el.closest("[inert],[aria-hidden=true],[hidden]")) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none") continue;
            let r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            // Heuristic exclusions: inline links inside running text.
            if (el.tagName === "A" && cs.display === "inline" && el.closest("p, li, dd, blockquote, figcaption, small")) continue;
            // Skip-to-content links are only visible on focus.
            if (el.matches("a[href^='#']") && /skip/i.test(el.textContent || "")) continue;
            if (big(r)) continue;

            const isInput = el.tagName === "INPUT";
            // Visually hidden input (custom radio/checkbox): its label is the target.
            const label = isInput ? el.closest("label") || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) : null;
            if (label && big(label.getBoundingClientRect())) continue;
            // A control inside a list row that is the whole tap area (checkbox/radio rows).
            if (isInput) {
              const row = el.closest(".row, li, [role=listitem]");
              if (row && big(row.getBoundingClientRect()) && row.querySelectorAll("button, a[href], input").length === 1) continue;
            }
            // Hit area extended with a pseudo-element or padding trick: probe a
            // 44 x 44 box centred on the control; all probes must land on it.
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const probes = [
              [cx - 21, cy - 21], [cx + 21, cy - 21], [cx - 21, cy + 21], [cx + 21, cy + 21],
              [cx - 21, cy], [cx + 21, cy], [cx, cy - 21], [cx, cy + 21],
            ];
            const inView = probes.every(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
            if (inView && probes.every(([x, y]) => { const t = document.elementFromPoint(x, y); return t && (el === t || el.contains(t)); })) continue;

            out.push(`${describe(el)} is ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          return out;
        });
        expect(offenders, `controls under 44x44 on ${route.path} (${scheme}):\n${offenders.join("\n")}`).toEqual([]);
      });

      // ---------- L1 ----------
      test(`L1 system font: ${label}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "font stack does not change per project");
        await open(page, route);
        const bad = await page.evaluate(() => {
          const ok = (ff) => /^\s*(-apple-system|system-ui)/i.test(ff);
          const out = [];
          const body = getComputedStyle(document.body).fontFamily;
          if (!ok(body)) out.push(`body: ${body}`);
          for (const el of document.querySelectorAll("button, input, textarea, select, label, nav a, [role=tab]")) {
            if (!el.getClientRects().length) continue;
            // Radios, checkboxes and sliders draw no text; only text-like fields count.
            if (el.matches("input[type=radio], input[type=checkbox], input[type=range]")) continue;
            // Visually hidden (sr-only) fields show no text either.
            const box = el.getBoundingClientRect();
            if (box.width <= 2 || box.height <= 2) continue;
            const ff = getComputedStyle(el).fontFamily;
            if (!ok(ff)) out.push(`${el.tagName.toLowerCase()}.${el.className}: ${ff}`);
          }
          return [...new Set(out)];
        });
        expect(bad, `non-system UI font on ${route.path}:\n${bad.join("\n")}`).toEqual([]);
      });

      // ---------- M4 ----------
      test(`M4 reduced motion: ${label}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "motion rules do not change per project");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await open(page, route);
        const offenders = await page.evaluate(() => {
          const secs = (v) =>
            v.split(",").map((s) => { s = s.trim(); return s.endsWith("ms") ? parseFloat(s) / 1000 : parseFloat(s) || 0; });
          const TOL = 0.011;
          const out = new Set();
          const els = [document.documentElement, document.body, ...document.querySelectorAll("*")];
          for (const el of els) {
            const cs = getComputedStyle(el);
            const t = Math.max(0, ...secs(cs.transitionDuration));
            const a = Math.max(0, ...secs(cs.animationDuration));
            const iter = cs.animationName !== "none" && a > TOL;
            if (t > TOL || iter) {
              const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
              out.add(`${el.tagName.toLowerCase()}${cls}: transition ${cs.transitionDuration}, animation ${cs.animationName} ${cs.animationDuration}`);
            }
          }
          const sb = getComputedStyle(document.documentElement).scrollBehavior;
          if (sb === "smooth") out.add(`html: scroll-behavior ${sb}`);
          return [...out];
        });
        expect(offenders, `motion still running under reduce on ${route.path}:\n${offenders.join("\n")}`).toEqual([]);
      });
    }
  });
}

// ---------- A2 ----------
// Type tokens are rem-based and the root follows iOS Dynamic Type, so raising the
// root font size must grow body text. The test measures body text, not layout.
test.describe("A2 text scaling", () => {
  for (const route of [ROUTES[0], ROUTES[1], ROUTES[7]]) {
    test(`A2 200% root font size: ${route.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "phone only");
      await open(page, route);
      const sample = () =>
        page.evaluate(() => {
          const els = [...document.querySelectorAll("main p, main li, main h2, main button, main .t-body, main .t-foot")].filter((e) => e.getClientRects().length);
          const sizes = els.slice(0, 12).map((e) => parseFloat(getComputedStyle(e).fontSize));
          return { sizes, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
        });
      const before = await sample();
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await page.waitForTimeout(300);
      const after = await sample();
      const grew = before.sizes.map((s, i) => after.sizes[i] / s);
      // Every sampled text must be at least 1.8x bigger and the page must not scroll sideways.
      expect(Math.min(...grew), `font growth ratios ${grew.map((g) => g.toFixed(2)).join(", ")}`).toBeGreaterThanOrEqual(1.8);
      expect(after.overflowX, "horizontal overflow at 200%").toBe(false);
    });
  }
});
