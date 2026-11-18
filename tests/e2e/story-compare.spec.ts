import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// A Journey stop that shows a pair in wipe (architecture-compare.md 5, C-05), on the mock
// Journey over the mock pair: the reference is warm-tinted, the moving image cool.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const journey = read("data/mock/journeys/mock-compare-tour.json");
const pair = read("data/mock/pairs/mock-compare.json");
const STOP = journey.stops.findIndex((s: { compare?: unknown }) => s.compare);
const SPLIT = journey.stops[STOP].compare.split;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

// The color the viewer drew at a point of the window, read from its canvas.
const pixel = (page: Page, x: number, y: number) =>
  page.evaluate(
    ({ x, y }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="viewer"] .openseadragon-canvas canvas')!;
      const box = canvas.getBoundingClientRect();
      const k = canvas.width / box.width;
      const [r, g, b] = canvas.getContext("2d")!.getImageData(Math.round((x - box.left) * k), Math.round((y - box.top) * k), 1, 1).data;
      return { r, g, b };
    },
    { x, y },
  );
const cool = (p: { r: number; b: number }) => p.b > p.r * 1.3;

const IMAGE = { width: 4096, height: 2048 };
type View = { x: number; y: number; z: number };
// The readout shows the stop's zoom and its center, or the small pan that keeps the reticle
// clear of the overlays (design.md 15.5, D16): within 6 % of the image on each axis.
const atStop = async (page: Page, i: number) => {
  const { x, y, z } = journey.stops[i].viewport as View;
  await expect
    .poll(
      async () => {
        const t = ((await page.getByTestId("readout").textContent()) ?? "").replace(/[\s\u202f\u00a0]/g, "");
        const m = /Centerx(\d+)y(\d+)Zoom([\d.]+)×/.exec(t);
        return !!m && m[3] === z.toFixed(1) && Math.abs(Number(m[1]) - x) <= 0.06 * IMAGE.width && Math.abs(Number(m[2]) - y) <= 0.06 * IMAGE.height;
      },
      { timeout: 8000 },
    )
    .toBe(true);
};
const rect = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
const apart = (a: DOMRect, b: DOMRect) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
const stopName = (i: number) => String(i + 1).padStart(2, "0");

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("the camera lands on each stop, forward and back across the compare stop", async ({ page }) => {
      test.slow();
      await page.goto(`/${journey.slug}/?mode=story&stop=${STOP}`);
      await ready(page);
      await atStop(page, STOP - 1);
      const handle = page.getByRole("slider", { name: "Divider between the two images" });
      const reticle = '[data-testid="marks"] [data-current]';
      const arrive = async () => {
        await atStop(page, STOP);
        await expect(handle).toBeVisible();
        // C5-1: once the flight lands the handle keeps off the stop's reticle, and the reticle
        // sits below the top bar and the compare bar.
        await expect.poll(async () => apart(await rect(page, "[role=slider]"), await rect(page, reticle)), { timeout: 4000 }).toBe(true);
        const r = await rect(page, reticle);
        const bar = await rect(page, '[data-testid="compare-bar"]');
        const top = await rect(page, "main > header");
        expect((r.top + r.bottom) / 2).toBeGreaterThan(Math.max(top.bottom, viewport.width < 1024 ? bar.bottom : 0));
        // C5-2: on a phone the bar keeps the headline and stays within 5.5rem.
        if (viewport.width < 640) {
          expect(bar.height).toBeLessThanOrEqual(88);
          await expect(page.getByTestId("compare-bar").getByText(pair.headline)).toBeVisible();
        }
      };
      await page.getByRole("button", { name: `Next: stop ${stopName(STOP)}` }).click();
      await arrive();
      await page.getByRole("button", { name: `Next: stop ${stopName(STOP + 1)}` }).click();
      await atStop(page, STOP + 1);
      await page.getByRole("button", { name: "Previous stop" }).click();
      await arrive();
      await page.getByRole("button", { name: "Previous stop" }).click();
      await atStop(page, STOP - 1);
      await expect(handle).toHaveCount(0);
    });
  });
}

test("arriving at a compare stop shows the pair in wipe, and leaving removes it", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/${journey.slug}/`);
  await ready(page);
  const divider = page.getByTestId("divider");
  const bar = page.getByTestId("compare-bar");
  await expect(divider).toHaveCount(0);
  await expect(bar).toHaveCount(0);

  await page.getByRole("button", { name: `Next: stop ${String(STOP + 1).padStart(2, "0")}` }).click();
  await expect(divider.getByText(pair.labels[0].full)).toBeVisible();
  await expect(divider.getByText(pair.labels[1].full)).toBeVisible();
  await expect(bar).toContainText(pair.headline);
  const handle = page.getByRole("slider", { name: "Divider between the two images" });
  await expect(handle).toHaveAttribute("aria-valuenow", String(SPLIT));
  // Only Wipe in a story, so no layout switch; both credits stay on screen.
  await expect(bar.getByRole("group", { name: "Layout" })).toHaveCount(0);
  await expect(bar.getByRole("list", { name: "Credits" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByTestId("credit")).toHaveCount(0);

  // Right of the divider the moving image is drawn, once the flight and its fade are over.
  const box = (await handle.boundingBox())!;
  const right = { x: box.x + box.width / 2 + 120, y: box.y + box.height / 2 - 120 };
  await expect.poll(async () => cool(await pixel(page, right.x, right.y)), { timeout: 8000 }).toBe(true);

  // A drag holds at this stop; the next stop removes the pair.
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", String(SPLIT + 1));
  await page.getByRole("button", { name: `Next: stop ${String(STOP + 2).padStart(2, "0")}` }).click();
  await expect(divider).toHaveCount(0);
  await expect(bar).toHaveCount(0);
  await expect(page.getByTestId("credit")).toBeVisible();
  await expect.poll(async () => cool(await pixel(page, right.x, right.y)), { timeout: 8000 }).toBe(false);

  // Coming back is arriving again: the stop's own split.
  await page.getByRole("button", { name: "Previous stop" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", String(SPLIT));
});
