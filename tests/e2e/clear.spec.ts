import { readdirSync, readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";

// design.md 15.5, D16 to D18: a stop's reticle and chip, the wipe handle and the overview chips
// stay clear of what covers them.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
type Point = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };
const journeys = readdirSync("data/journeys").map((f) => read(`data/journeys/${f}`)) as {
  slug: string;
  imageId: string;
  stops: { viewport: { z: number } }[];
}[];
const GAP = 16;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
  await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
};
const steady = async (page: Page) => {
  const read = () => page.getByTestId("readout").textContent();
  let last = "";
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const now = (await read()) ?? "";
    if (now === last) return;
    last = now;
  }
};
const near = (a: Box, b: Box, gap: number) =>
  a.x - gap < b.x + b.width && b.x < a.x + a.width + gap && a.y - gap < b.y + b.height && b.y < a.y + a.height + gap;
const visibleBoxes = async (l: Locator) =>
  (await l.evaluateAll((els) =>
    els
      .filter((el) => getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none")
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
  )) as Box[];
const insideConvex = (poly: Point[], p: Point) => {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
};
const number = (s: string | null) => parseFloat((s ?? "").replace(/[\s  ×]/g, ""));

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const phone = viewport.width < 768;
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    for (const journey of journeys) {
      test(`${journey.slug}: every stop's reticle and chip stay clear of the overlays, and the view of its data`, async ({ page }) => {
        test.slow();
        const image = read(`data/images/${journey.imageId}.json`);
        const footprint = image.footprint?.[0] as Point[] | undefined;
        for (let i = 0; i < journey.stops.length; i++) {
          const where = `stop ${i + 1}`;
          await page.goto(`/${journey.slug}/?mode=story&stop=${i + 1}`);
          await ready(page);
          await steady(page);
          const mark = page.locator("[data-testid=marks] [data-current]");
          if (await mark.count()) {
            const parts = await visibleBoxes(mark.locator(":scope > span"));
            const x = Math.min(...parts.map((b) => b.x));
            const y = Math.min(...parts.map((b) => b.y));
            const box = { x, y, width: Math.max(...parts.map((b) => b.x + b.width)) - x, height: Math.max(...parts.map((b) => b.y + b.height)) - y };
            const overlays = [
              ...(await visibleBoxes(page.locator("main > header > *"))),
              ...(phone ? await visibleBoxes(page.getByTestId("sheet")) : await visibleBoxes(page.getByTestId("overview"))),
            ];
            for (const o of overlays) expect(near(box, o, GAP), `${where}: reticle ${JSON.stringify(box)} within ${GAP} px of ${JSON.stringify(o)}`).toBe(false);
          }
          if (!footprint) continue;
          if (journey.stops[i].viewport.z <= 1) {
            test.info().annotations.push({ type: "footprint", description: `${journey.slug} ${where}: the fit view shows the whole image, frame included` });
            continue;
          }
          // The view's corners, from the readout's center and the screen scale over the free area.
          const spans = page.getByTestId("readout").locator("span");
          const cx = number(await spans.nth(1).textContent());
          const cy = number(await spans.nth(3).textContent());
          const s = Number(await page.getByTestId("viewer").getAttribute("data-scale"));
          const host = (await page.getByTestId("viewer").boundingBox())!;
          // A phone has no rulers.
          const top = await page.locator("[data-ruler=top]").boundingBox();
          const left = await page.locator("[data-ruler=left]").boundingBox();
          const bottom = phone ? (await page.getByTestId("sheet").boundingBox())!.y : host.y + host.height;
          const w = (host.x + host.width - (left ? left.x + left.width : host.x)) / s;
          const h = (bottom - (top ? top.y + top.height : host.y)) / s;
          const corners = [
            { x: cx - w / 2, y: cy - h / 2 },
            { x: cx + w / 2, y: cy - h / 2 },
            { x: cx + w / 2, y: cy + h / 2 },
            { x: cx - w / 2, y: cy + h / 2 },
          ];
          // A 4 px allowance for the readout's rounding and the margins' whole pixels.
          const out = corners.filter((c) => !insideConvex(footprint, c));
          const shrunk = corners.map((c) => ({ x: c.x + Math.sign(cx - c.x) * (4 / s), y: c.y + Math.sign(cy - c.y) * (4 / s) }));
          const outShrunk = shrunk.filter((c) => !insideConvex(footprint, c));
          if (outShrunk.length) {
            const why = await page.getByTestId("viewer").getAttribute("data-framing");
            expect(why, `${where}: corners outside the footprint ${JSON.stringify(out)}`).toBe("leaves-data");
            test.info().annotations.push({ type: "footprint", description: `${journey.slug} ${where}: no clear view stays inside the footprint at ${viewport.width}x${viewport.height}` });
          }
        }
      });
    }
  });
}

test.describe("1440x900, wipe", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("at 95% the handle sits in the free band beside the divider, 1rem from every overlay", async ({ page }) => {
    await page.goto("/nili-patera-hirise-2007-06-30/?mode=compare&split=95");
    await ready(page);
    await page.waitForTimeout(500);
    const handle = (await page.getByRole("slider", { name: "Divider between the two images" }).boundingBox())!;
    const overlays = [
      ...(await visibleBoxes(page.locator("main > header > *"))),
      ...(await visibleBoxes(page.getByTestId("overview"))),
      ...(await visibleBoxes(page.locator("[role=group][aria-label='View controls']"))),
      ...(await visibleBoxes(page.getByTestId("compare-bar"))),
    ];
    for (const o of overlays) expect(near(handle, o, GAP), `handle ${JSON.stringify(handle)} within 1rem of ${JSON.stringify(o)}`).toBe(false);
  });
});

test.describe("390x844, overview", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const journey of journeys) {
    test(`${journey.slug}: no chip in the overview overlaps a bracket`, async ({ page }) => {
      test.slow();
      for (let i = 0; i < journey.stops.length; i++) {
        await page.goto(`/${journey.slug}/?mode=story&stop=${i + 1}`);
        await ready(page);
        const route = page.getByTestId("route");
        const chips = await visibleBoxes(route.locator("button > span"));
        const brackets = await visibleBoxes(route.locator("button > svg"));
        for (const c of chips)
          for (const b of brackets) expect(near(c, b, 0), `stop ${i + 1}: chip ${JSON.stringify(c)} on bracket ${JSON.stringify(b)}`).toBe(false);
      }
    });
  }
});
