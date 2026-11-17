import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const source = JSON.parse(readFileSync("data/sources/andromeda-phat-phast-2025.json", "utf8"));

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

test("the header holds the wordmark home link and the theme toggle", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Solaria" })).toHaveAttribute("href", "/");
  await expect(header.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible();
});

test("the footer prints the credit line unaltered from the source record", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText(source.credit);
});

test("the footer links About, credits and accessibility, and says which links leave the app", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "/about/");
  await expect(footer.getByRole("link", { name: "Sources and credits" })).toHaveAttribute("href", "/about/#credits");
  await expect(footer.getByRole("link", { name: "Accessibility" })).toHaveAttribute("href", "/about/#accessibility");
  const outside = footer.locator('a[target="_blank"]');
  await expect(outside).toHaveCount(2);
  for (const link of await outside.all()) {
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
  }
  await expect(page.getByRole("contentinfo")).toContainText("Solaria is an independent project. It is not endorsed by NASA or ESA.");
});

test("the header links the Journeys index and About", async ({ page }) => {
  await page.goto("/about/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about/");
  await nav.getByRole("link", { name: "Journeys" }).click();
  await expect(page).toHaveURL(/\/#journeys$/);
  await expect(page.getByRole("heading", { name: "Journeys", level: 2 })).toBeInViewport();
});

test("header and footer controls meet the 2.75rem target and fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const targets = page.locator("header a, header button, footer a");
  for (const target of await targets.all()) {
    const box = (await target.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
});
