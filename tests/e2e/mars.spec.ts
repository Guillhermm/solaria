import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// The Mars Journey (F-05): every stop's text as written, its sources, and the Compare pair.
const journey = JSON.parse(readFileSync("data/journeys/nili-patera.json", "utf8")) as {
  title: string;
  stops: { title: string; body: string; sources: { label: string; url: string }[] }[];
};
const pair = JSON.parse(readFileSync("data/pairs/nili-patera-hirise-2007.json", "utf8")) as { headline: string };
const COUNT = journey.stops.length;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};
const card = (page: Page) => page.getByTestId("story").locator("[aria-current=step]");

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("the Journey shows each stop's text and sources, and a picture of each", async ({ page }) => {
      test.slow();
      await page.goto("/nili-patera/");
      await ready(page);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(journey.title);
      for (let i = 0; i < COUNT; i++) {
        const stop = journey.stops[i];
        await expect(card(page).getByRole("heading", { level: 2 })).toHaveText(`${String(i + 1).padStart(2, "0")}${stop.title}`);
        await expect(card(page).locator("p")).toHaveText(stop.body.split(/\n\s*\n/));
        for (const s of stop.sources) {
          await expect(card(page).getByRole("link", { name: new RegExp(s.label) })).toHaveAttribute("href", s.url);
        }
        await page.waitForTimeout(2500);
        if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/s11-mars-${viewport.width}-stop${i + 1}.png` });
        if (i < COUNT - 1) await page.getByRole("button", { name: /next/i }).click();
      }
    });
  });
}

test("Compare opens on the Mars pair and names it", async ({ page }) => {
  await page.goto("/nili-patera-hirise-2007-06-30/");
  await ready(page);
  await page.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("slider", { name: "Divider between the two images" })).toBeVisible();
  await expect(page.getByText(pair.headline).first()).toBeVisible();
});
