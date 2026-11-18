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

test("footer links open outside the app and say so", async ({ page }) => {
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Footer" }).getByRole("link");
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
  }
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
