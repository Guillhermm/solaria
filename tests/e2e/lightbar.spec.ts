import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// design.md 15.5, D11: on desktop the Light bar is a margin of the view, so a link's view is
// framed in the area above it and its label's circle and chip stay clear of the bar.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const journey = read("data/journeys/sun.json");
const set = read(`data/band-sets/${journey.bandSetId}.json`);
const first = set.imageIds[0];
const tiles = read(`data/images/${first}.json`).tiles;
const labels = read("data/labels/sun-sdo-2024-05-10.json").labels as { id: string; x: number; y: number; r?: number }[];

type View = { x: number; y: number; z: number };
// The label links as the search index builds them (design.md 15.2, Q3), and each stop's view
// opened as a Light link. "Past the edge" sits against the image's edge, where the view is
// clamped, so a stop's x and y are checked only where the image leaves room for them.
const labelViews: View[] = labels.filter((l) => l.r).map((l) => ({ x: l.x, y: l.y, z: Number((Math.min(tiles.width, tiles.height) / (3 * l.r!)).toFixed(2)) }));
const stopViews: View[] = journey.stops
  .map((s: { viewport: View }) => s.viewport)
  .filter((v: View, i: number, all: View[]) => all.findIndex((w) => w.x === v.x && w.y === v.y && w.z === v.z) === i);
const views = [...labelViews.map((v) => ({ v, exact: true })), ...stopViews.map((v) => ({ v, exact: false }))];

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const settle = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
  const read = () => page.getByTestId("viewer").evaluate((el) => Number((el as HTMLElement).dataset.scale));
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const now = await read();
    if (Math.abs(now - last) < 1e-4) return;
    last = now;
  }
};

const readoutZ = async (page: Page) => parseFloat((await page.getByTestId("readout").locator("span").nth(5).textContent())!);

type B = { x: number; y: number; width: number; height: number };
const overlaps = (a: B, b: B) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  for (const colorScheme of ["dark", "light"] as const) {
    test.describe(`${viewport.width}x${viewport.height}, ${colorScheme}`, () => {
      test.use({ viewport, colorScheme });

      test("each Sun label link and Journey stop view keeps its circle and chip clear of the Light bar", async ({ page }) => {
        test.setTimeout(120_000);
        for (const { v, exact } of views) {
          const where = `x=${v.x}&y=${v.y}&z=${v.z}`;
          await page.goto(`/${first}/?mode=light&labels=1&${where}`);
          await settle(page);
          const bar = (await page.getByTestId("light-bar").boundingBox())!;
          for (const label of labels) {
            for (const testid of ["label-circle", "label-chip"]) {
              const el = page.locator(`[data-testid=${testid}][data-id="${label.id}"]`);
              if (!(await el.isVisible())) continue;
              const b = (await el.boundingBox())!;
              if (b.width === 0) continue;
              expect(overlaps(b, bar), `${where}: ${testid} ${JSON.stringify(b)} meets the bar ${JSON.stringify(bar)}`).toBe(false);
            }
          }
          const url = new URL(page.url());
          expect(url.searchParams.get("z"), where).toBe(String(v.z));
          if (exact) expect([url.searchParams.get("x"), url.searchParams.get("y")], where).toEqual([String(v.x), String(v.y)]);
          expect(Math.abs((await readoutZ(page)) - v.z) / v.z, where).toBeLessThanOrEqual(0.01);
        }
      });

      test("each Sun Journey stop keeps its reticle and tag clear of the Light bar", async ({ page }) => {
        test.setTimeout(120_000);
        for (let i = 0; i < journey.stops.length; i++) {
          await page.goto(`/${journey.slug}/?mode=story&stop=${i + 1}`);
          await settle(page);
          const bar = (await page.getByTestId("light-bar").boundingBox())!;
          const mark = page.locator("[data-testid=marks] [data-current]");
          if (await mark.count()) {
            for (const part of [mark, mark.locator("span").last()]) {
              const b = (await part.boundingBox())!;
              expect(overlaps(b, bar), `stop ${i + 1}: ${JSON.stringify(b)} meets the bar ${JSON.stringify(bar)}`).toBe(false);
            }
          }
          expect(Math.abs((await readoutZ(page)) - journey.stops[i].viewport.z) / journey.stops[i].viewport.z, `stop ${i + 1}`).toBeLessThanOrEqual(0.01);
        }
      });
    });
  }
}
