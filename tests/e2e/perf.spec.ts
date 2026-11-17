import { readdirSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// T-03: every viewer draws with OpenSeadragon's canvas drawer; the WebGL drawer read each tile
// back from the GPU and stalled the main thread while zooming.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const ids = (dir: string) => readdirSync(dir).map((f) => f.replace(/\.json$/, ""));
const pages = [
  ...ids("data/images").map((id) => `/${id}/`),
  ...ids("data/journeys").map((id) => `/${read(`data/journeys/${id}.json`).slug}/?mode=story&stop=1`),
  ...ids("data/band-sets").map((id) => `/${read(`data/band-sets/${id}.json`).imageIds[0]}/?mode=light`),
  ...ids("data/pairs").map((id) => `/${read(`data/pairs/${id}.json`).imageIds[1]}/?mode=compare`),
];
// The longest task a scripted 20x zoom may take. On an Apple M1 at load 5 the longest was
// 273 and 282 ms with the WebGL drawer, 55 and 59 ms with the canvas drawer.
const LONGEST_MS = 200;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
};

test("every viewer page draws with the canvas drawer", async ({ page }) => {
  test.slow();
  for (const path of pages) {
    await page.goto(path);
    await ready(page);
    await expect(page.getByTestId("viewer"), path).toHaveAttribute("data-drawer", "canvas");
  }
});

test.describe("DPR 2", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test(`a 20x wheel zoom on Andromeda has no task over ${LONGEST_MS} ms`, async ({ page }) => {
    test.slow();
    await page.addInitScript(() => {
      const w = window as unknown as { longest: number };
      w.longest = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.longest = Math.max(w.longest, e.duration);
      }).observe({ type: "longtask" });
    });
    await page.goto("/andromeda-phat-phast-2025/");
    await ready(page);
    await page.waitForTimeout(1000);
    await page.evaluate(() => ((window as unknown as { longest: number }).longest = 0));
    const box = (await page.getByTestId("viewer").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // 1.2^17 is 22x.
    for (let i = 0; i < 17; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(2000);
    expect(parseFloat((await page.getByTestId("readout").locator("span").nth(5).textContent())!)).toBeGreaterThan(15);
    for (let i = 0; i < 17; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => (window as unknown as { longest: number }).longest)).toBeLessThanOrEqual(LONGEST_MS);
  });
});
