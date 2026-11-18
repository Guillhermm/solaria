import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const source = JSON.parse(readFileSync("data/sources/andromeda-phat-phast-2025.json", "utf8"));

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

test("About has its sections in order", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Solaria");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "What Solaria is",
    "Who made it",
    "How images are prepared",
    "Credits and terms",
    "Accessibility",
    "Contact and source code",
  ]);
  await expect(page).toHaveTitle("About | Solaria");
});

test("the non-endorsement line has the science review's wording", async ({ page }) => {
  await page.goto("/about/");
  await expect(
    page.getByText(
      "Solaria is an independent project. It is not endorsed by NASA or ESA. The images belong to their credited owners and are used under the terms listed below.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/had no part in building/)).toHaveCount(0);
});

test("credits and terms are copied unaltered from the source record", async ({ page }) => {
  await page.goto("/about/");
  // The end-to-end build also lists the mock sources; this test reads the Andromeda record.
  const credits = page.locator("#credits dl").filter({ hasText: source.title });
  await expect(credits).toHaveCount(1);
  const field = (name: string) => credits.locator(":scope > div", { has: page.locator(`dt:text-is("${name}")`) }).locator("dd");
  await expect(field("Title")).toHaveText(source.title);
  await expect(field("Credit")).toHaveText(source.credit);
  await expect(field("Release")).toHaveText(`${source.releaseId}, ${source.releasedAt}`);
  await expect(field("Retrieved")).toHaveText(source.retrievedAt);
  await expect(field("Source page").getByRole("link")).toHaveAttribute("href", source.pageUrl);
  await expect(field("Terms").getByRole("link")).toHaveAttribute("href", source.terms.url);
  await expect(field("Terms")).toContainText(source.terms.name);
});

test("the size sentence is computed from the source record", async ({ page }) => {
  await page.goto("/about/");
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const millions = Math.round((source.file.width * source.file.height) / 1e6);
  await expect(page.getByText(`It is ${fmt(source.file.width)} by ${fmt(source.file.height)} pixels, about ${millions} million pixels.`)).toBeVisible();
});

test("footer anchors land on the credits and accessibility sections, at phone width in the light theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Accessibility" }).click();
  await expect(page).toHaveURL(/\/about\/#accessibility$/);
  await expect(page.getByRole("heading", { name: "Accessibility", level: 2 })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
});

test("the accessibility statement names only the automated checks that exist", async ({ page }) => {
  await page.goto("/about/");
  const section = page.locator("#accessibility");
  await expect(section).toContainText("checked with axe-core at phone and desktop width");
  await expect(section).toContainText("an audit with screen readers is planned, not yet done");
  await expect(section).not.toContainText("Home page lens: planned");
});

test("no NASA or ESA logo is shown", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.locator("main img")).toHaveCount(0);
});

test("sources that share a credit line share one entry, the credit printed once", async ({ page }) => {
  await page.goto("/about/");
  const sdo = "Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams.";
  await expect(page.locator("#credits dd", { hasText: sdo })).toHaveCount(1);
  const entry = page.locator("#credits dl", { hasText: sdo });
  await expect(entry.locator(":scope > div", { has: page.locator('dt:text-is("Title")') }).locator("dd")).toHaveCount(7);
});

test("source links point at the current repository and name the archived one", async ({ page }) => {
  await page.goto("/about/");
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Contact and source code" }) });
  await expect(section.locator('a[href="https://github.com/Guillhermm/solaria"]')).toHaveCount(1);
  await expect(section.locator('a[href="https://github.com/Guillhermm/solaria/issues"]')).toHaveCount(1);
  await expect(section.getByText("The original Space Apps 2025 code is archived, read-only:")).toBeVisible();
  await expect(section.locator('a[href="https://github.com/Guillhermm/nasa-2025-solaria"]')).toHaveCount(1);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: /Source code/ })).toHaveAttribute("href", "https://github.com/Guillhermm/solaria");
});
