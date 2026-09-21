import { expect, test } from "@playwright/test";
import { LANGUAGES } from "../../src/localization";
import { onboardingCopy } from "../../src/onboardingCopy";
import { PRACTICE } from "../../src/practiceCopy";

test("every language has a translated landing page and signup form at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const entry of LANGUAGES) {
    const copy = onboardingCopy(entry.code);
    await page.goto("/#/home");
    await page.getByRole("combobox").selectOption(entry.code);
    await expect(page.getByRole("heading", { name: copy.hero })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", entry.htmlLang);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto("/#/feed/scam");
    await expect(page.getByLabel(copy.emailLabel, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.signup, exact: true })).toBeVisible();
    // Do not submit: this browser test never sends email.
  }
});

test("localized exercises teach a safer next step for all four topics", async ({ page }) => {
  await page.goto("/#/tools");
  await page.getByRole("combobox").selectOption("es");
  const copy = PRACTICE.es;
  for (let index = 0; index < 4; index++) {
    await page.getByRole("button", { name: copy.scenarios[index], exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
    await page.getByRole("button", { name: copy.act, exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: copy.lessons[index] })).toBeVisible();
    await page.getByRole("button", { name: copy.again, exact: true }).click();
    await page.getByRole("button", { name: copy.check, exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: copy.lessons[index] })).toBeVisible();
  }
});
