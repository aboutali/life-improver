import { test, expect } from "@playwright/test";
import { freezeAt, seed, go, trackErrors } from "./helpers.js";

test("a newcomer lands on the welcome screen", async ({ page }) => {
  const { expectNoErrors } = trackErrors(page);
  await freezeAt(page);
  await seed(page, {});
  await go(page, "/");
  await expect(page).toHaveURL(/#\/welcome$/);
  await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
  expectNoErrors();
});
