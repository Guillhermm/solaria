import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// The Mars Journey's design gate: Compare from the Journey, both images cut to their footprint,
// stop markers that never hide each other, and the Home thumbnail.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
type View = { x: number; y: number; z: number };
const journey = read("data/journeys/nili-patera.json") as { slug: string; imageId: string; stops: { viewport: View; marker?: { r: number } }[] };
const pair = read("data/pairs/nili-patera-hirise-2007.json") as { reference: string };
const reference = read(`data/images/${pair.reference}.json`);
const [W, H] = [reference.tiles.width, reference.tiles.height];
const footprint = reference.footprint[0] as { x: number; y: number }[];

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector("main[data-loading]"));
const number = (s: string | null) => parseFloat((s ?? "").replace(/[\s  ×]/g, ""));
const readout = async (page: Page) => {
  const spans = page.getByTestId("readout").locator("span");
  return { x: number(await spans.nth(1).textContent()), y: number(await spans.nth(3).textContent()), z: number(await spans.nth(5).textContent()) };
};
const steady = async (page: Page) => {
  let last = "";
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const now = JSON.stringify(await readout(page));
    if (now === last) return;
    last = now;
  }
};

// For each row of a viewer's canvas, the first and last column drawn, in CSS pixels.
const drawnRows = (page: Page, testId: string) =>
  page.evaluate((testId) => {
    const c = document.querySelector<HTMLCanvasElement>(`[data-testid="${testId}"] .openseadragon-canvas canvas`)!;
    const box = c.getBoundingClientRect();
    const k = c.width / box.width;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const rows: [number, number, number][] = [];
    for (let y = 0; y < c.height; y += Math.round(4 * k)) {
      let first = -1;
      let last = -1;
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 0) {
          if (first < 0) first = x;
          last = x;
        }
      }
      rows.push([first < 0 ? -1 : box.left + first / k, last < 0 ? -1 : box.left + (last + 1) / k, box.top + y / k]);
    }
    return rows;
  }, testId);

const sameArea = (a: number[][], b: number[][]) => {
  expect(a.length).toBe(b.length);
  const off = a.flatMap(([l, r], i) => {
    const [l2, r2] = b[i];
    if ((l < 0) !== (l2 < 0)) return [`row ${i}: ${l},${r} vs ${l2},${r2}`];
    return l >= 0 && (Math.abs(l - l2) > 2 || Math.abs(r - r2) > 2) ? [`row ${i}: ${l},${r} vs ${l2},${r2}`] : [];
  });
  expect(off, off.slice(0, 5).join("; ")).toEqual([]);
};

const compareFromStops = () => {
  for (const n of [4, 5, 6]) {
    test(`stop ${n}: one click opens the June and October wipe on the view Story shows`, async ({ page }) => {
      await page.goto(`/${journey.slug}/?mode=story&stop=${n}`);
      await ready(page);
      await settled(page);
      await steady(page);
      // The stop as Story shows it, past the hand zoom cap or not.
      const v = await readout(page);
      await page.getByRole("link", { name: /^Compare June and October/ }).click();
      await expect(page).toHaveURL(new RegExp(`/${pair.reference}/\\?mode=compare`));
      await ready(page);
      await expect(page.getByRole("slider", { name: "Divider between the two images" })).toBeVisible();
      await steady(page);
      const at = await readout(page);
      expect(Math.abs(at.x - v.x) / W, JSON.stringify(at)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(at.y - v.y) / H, JSON.stringify(at)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(at.z - v.z) / v.z, JSON.stringify(at)).toBeLessThanOrEqual(0.01);
    });
  }
};

test.describe("390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  compareFromStops();
});

test.describe("1440x900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  compareFromStops();

  test("Blink frames and Side panes draw the same area at fit", async ({ page }) => {
    await page.goto(`/${pair.reference}/?mode=compare&layout=blink`);
    await ready(page);
    await settled(page);
    await page.waitForTimeout(500);
    const showing = page.getByText(/^Showing /);
    const first = await drawnRows(page, "viewer");
    const was = await showing.textContent();
    await page.getByRole("button", { name: "Swap" }).click();
    await expect(showing).not.toHaveText(was!);
    await settled(page);
    await page.waitForTimeout(500);
    sameArea(first, await drawnRows(page, "viewer"));

    await page.goto(`/${pair.reference}/?mode=compare&layout=side`);
    await ready(page);
    await page.waitForFunction(() => document.querySelector('[data-testid="viewer-side"] .openseadragon-canvas canvas'));
    await settled(page);
    await page.waitForTimeout(1500);
    const left = await drawnRows(page, "viewer");
    const right = await drawnRows(page, "viewer-side");
    // Side panes sit side by side: compare each pane relative to its own left edge.
    const lbox = (await page.getByTestId("viewer").boundingBox())!;
    const rbox = (await page.getByTestId("viewer-side").boundingBox())!;
    sameArea(
      left.map(([l, r]) => (l < 0 ? [l, r] : [l - lbox.x, r - lbox.x])),
      right.map(([l, r]) => (l < 0 ? [l, r] : [l - rbox.x, r - rbox.x])),
    );
  });

  test("with Wipe at 95%, no June pixel lies right of the overlap edge", async ({ page }) => {
    await page.goto(`/${pair.reference}/?mode=compare&split=95`);
    await ready(page);
    await settled(page);
    await page.waitForTimeout(800);
    // At fit the image's center sits at the center of the area inside the rulers.
    const host = (await page.getByTestId("viewer").boundingBox())!;
    const top = (await page.locator("[data-ruler=top]").boundingBox())!;
    const left = (await page.locator("[data-ruler=left]").boundingBox())!;
    const x0 = left.x + left.width;
    const y0 = top.y + top.height;
    const cx = (x0 + host.x + host.width) / 2;
    const cy = (y0 + host.y + host.height) / 2;
    const s = Number(await page.getByTestId("viewer").getAttribute("data-scale"));
    // The overlap's right edge, from (3308, 0) to (3934, 5337).
    const [a, b] = [footprint[0], footprint[1]];
    const rows = await drawnRows(page, "viewer");
    const bad = rows.flatMap(([l, r, y]) => {
      if (l < 0) return [];
      const iy = (y - cy) / s + H / 2;
      if (iy < 2 || iy > b.y - 2) return [];
      const edge = cx + (a.x + ((b.x - a.x) * iy) / (b.y - a.y) - W / 2) * s;
      return r > edge + 2 ? [`image y ${Math.round(iy)}: drawn to ${r.toFixed(1)}, edge ${edge.toFixed(1)}`] : [];
    });
    expect(bad, bad.slice(0, 5).join("; ")).toEqual([]);
  });
});

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Visible tags inside `scope`: their numbers, and none covering another.
const readableTags = async (page: Page, selector: string) => {
  const tags = await page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => {
        const style = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return r.width > 0 && style.visibility !== "hidden" && getComputedStyle(el.parentElement!).visibility !== "hidden";
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent ?? "", box: { x: r.x, y: r.y, width: r.width, height: r.height } };
      }),
  );
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++) expect(overlap(tags[i].box, tags[j].box), `${tags[i].text} covers ${tags[j].text}`).toBe(false);
  return tags.flatMap((t) => t.text.replace(/^Stop /, "").split("·"));
};

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("at fit every stop from 02 to 05 is readable in the view and in the overview", async ({ page }) => {
      await page.goto(`/${journey.slug}/?mode=story&stop=1`);
      await ready(page);
      await settled(page);
      await page.waitForTimeout(800);
      const want = ["02", "03", "04", "05"];
      const view = await readableTags(page, "[data-testid=marks] > div > span:last-child");
      for (const n of want) expect(view, `view: ${view}`).toContain(n);
      // An overview narrower than 7.5rem shows only the current stop's chip (D18).
      const route = await page.getByTestId("route").boundingBox();
      if (route && route.width >= 120) {
        const overview = await readableTags(page, "[data-testid=route] button > span");
        for (const n of want) expect(overview, `overview: ${overview}`).toContain(n);
      }
    });

    test("the Mars thumbnail in the Journeys index fills its frame", async ({ page }) => {
      await page.goto("/");
      const img = page.getByRole("region", { name: "Journeys" }).getByRole("listitem").filter({ hasText: "Nili Patera" }).locator("img");
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete)).toBe(true);
      const fill = await img.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const f = el.parentElement!.getBoundingClientRect();
        const w = Math.max(0, Math.min(r.right, f.right) - Math.max(r.left, f.left));
        const h = Math.max(0, Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top));
        return (w * h) / (f.width * f.height);
      });
      expect(fill).toBeGreaterThanOrEqual(0.95);
    });
  });
}
