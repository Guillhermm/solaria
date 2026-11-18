import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { readContent } from "./content";

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

test("the footer prints each credit line once, unaltered, after the images that use it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText(source.credit);
  // Group the images by their source's credit, in load order, as the footer does.
  const sources = new Map(readContent("sources").map((s) => [s.id, s.credit as string]));
  const lines = new Map<string, string[]>();
  for (const image of readContent("images")) {
    const credit = sources.get(image.sourceId)!;
    lines.set(credit, [...(lines.get(credit) ?? []), image.title]);
  }
  const shown = page.getByRole("contentinfo").locator("p[data-credit]");
  await expect(shown).toHaveText([...lines].map(([credit, titles]) => `${titles.join(", ")}: ${credit}`));
  const sdo = "Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams.";
  await expect(page.getByRole("contentinfo").getByText(sdo, { exact: false })).toHaveCount(1);
});

test("on a desktop screen the footer follows the content, with no empty band before it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const gap = await page.evaluate(() => {
    const footer = document.querySelector("footer")!.getBoundingClientRect().top;
    const main = document.querySelector("main")!;
    const last = [...main.querySelectorAll("section")].map((s) => s.getBoundingClientRect().bottom).reduce((a, b) => Math.max(a, b), 0);
    return footer - last;
  });
  // The page is taller than the screen, so the footer sits under the last section.
  expect(gap).toBeLessThan(8 * 16);
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
  // The search dialog's own buttons are measured with it open (search.spec.ts).
  const targets = page.locator("header a:visible, header button:visible, footer a");
  for (const target of await targets.all()) {
    const box = (await target.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
});

// The header, the Home sections and the footer share one side gutter (--gutter), so their
// content starts and ends on the same two lines. About's centered reading column is exempt.
for (const width of [1440, 390]) {
  test(`header, main and footer share left and right edges at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const edges = await page.evaluate(() => {
      const content = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return [Math.round(r.left + parseFloat(s.paddingLeft)), Math.round(r.right - parseFloat(s.paddingRight))];
      };
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.right)];
      };
      const q = (s: string) => document.querySelector(s)!;
      return {
        header: content(q("header")),
        footer: content(q("footer")),
        journeys: content(q("#journeys")),
        key: content(q("[aria-labelledby=key-title]")),
        wordmark: box(q("header a"))[0],
        heroTitle: box(q("h1"))[0],
        journeysTitle: box(q("#journeys-title"))[0],
        toggle: box(q("header nav > button:last-child"))[1],
        begin: box(q("#journeys a[aria-label^=Begin]"))[1],
      };
    });
    for (const part of [edges.footer, edges.journeys, edges.key]) expect(part).toEqual(edges.header);
    expect(edges.wordmark).toBe(edges.header[0]);
    expect(edges.heroTitle).toBe(edges.header[0]);
    expect(edges.journeysTitle).toBe(edges.header[0]);
    expect(edges.toggle).toBe(edges.header[1]);
    expect(edges.begin).toBe(edges.header[1]);
  });
}

for (const path of ["/", "/about/"]) {
  test(`${path} has one header and one footer, and credits no mock fixture`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
    // The end-to-end build loads the mock content too; it must never reach a credit line.
    await expect(page.getByText(/Not NASA data|Mock (Compare|Light)/)).toHaveCount(0);
  });
}
