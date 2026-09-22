import { expect, test } from "@playwright/test";

test("navigation survives reload and browser Back/Forward", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/#\/about$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: /about/i }).first()).toBeVisible();
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await skipLink.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(page).toHaveURL(/#\/about$/);
  await page.getByRole("button", { name: "Read", exact: true }).first().click();
  await expect(page).toHaveURL(/#\/feed\/scam$/);
  await page.getByRole("tab", { name: "AI Sec Jobs", exact: true }).click();
  await expect(page).toHaveURL(/#\/feed\/job$/);
  await page.goBack();
  await expect(page.getByRole("tab", { name: "AI Sec News", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(page.getByRole("tab", { name: "AI Sec Jobs", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});

test("invalid links provide a recovery path on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/unknown");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("button", { name: "Go to the home page", exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a published card link survives refresh and keeps its content", async ({ page }) => {
  test.skip(!process.env.FLIPSEC_TEST_STORY_ID, "Set FLIPSEC_TEST_STORY_ID to the imported local permalink fixture; see RELIABILITY.md.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // The card no longer prints its own link, so this checks the ROUTE rather
  // than a control: a shared URL still opens exactly one card and still
  // survives a refresh. That is the part a shared link depends on.
  await page.goto(`/#/feed/course/story/${process.env.FLIPSEC_TEST_STORY_ID}`);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Permalink verification card");
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Permalink verification card");
  expect(errors).toEqual([]);
});
