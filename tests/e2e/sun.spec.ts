import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";

// The Sun Journey (G-04) and the SDO band notes (G-03), against the data files.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const journey = read("data/journeys/sun.json");
const set = read(`data/band-sets/${journey.bandSetId}.json`);
const images = set.imageIds.map((id: string) => read(`data/images/${id}.json`));
const band = (id: string) => images[set.imageIds.indexOf(id)].bands.value[0];
const spoken = (b: { wavelength: { value: number }; region: string }) => `${b.wavelength.value} angstroms, ${b.region}`;
const COUNT = journey.stops.length;

// A stop without a band keeps the one before it.
const bandAt = (i: number): string => (journey.stops[i].band ?? bandAt(i - 1));

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};
const rail = (page: Page) => page.getByRole("slider", { name: "Band" });
const card = (page: Page) => page.getByTestId("story").locator("[aria-current=step]");
const box = async (l: Locator) => (await l.boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// How red the view is above the active region's white core (the stop frames it above the
// Light bar, D11), frame by frame, for `ms`: 0 for the gray HMI band, high for
// the red 304 Å band, in between while one fades into the other.
const redness = (page: Page, ms: number) =>
  page.evaluate(
    (ms) =>
      new Promise<number[]>((done) => {
        const c = document.querySelector<HTMLCanvasElement>('[data-testid="viewer"] .openseadragon-canvas canvas')!;
        const g = c.getContext("2d")!;
        const out: number[] = [];
        const start = performance.now();
        const tick = () => {
          const d = g.getImageData(Math.round(c.width * 0.6), Math.round(c.height * 0.15), 24, 24).data;
          let r = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i];
            b += d[i + 2];
          }
          out.push(r > 0 ? (r - b) / r : 0);
          if (performance.now() - start < ms) requestAnimationFrame(tick);
          else done(out);
        };
        tick();
      }),
    ms,
  );

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the whole Journey: each stop's text as written, and its band on the rail and on screen", async ({ page }) => {
    await page.goto(`/${journey.slug}/`);
    await ready(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(journey.title);
    for (let i = 0; i < COUNT; i++) {
      const stop = journey.stops[i];
      await expect(card(page).getByRole("heading", { level: 2 })).toHaveText(`${String(i + 1).padStart(2, "0")}${stop.title}`);
      await expect(card(page).locator("p")).toHaveText(stop.body.split(/\n\s*\n/));
      for (const s of stop.sources) {
        await expect(card(page).getByRole("link", { name: new RegExp(s.label.replace(/[.()]/g, "\\$&")) })).toHaveAttribute("href", s.url);
      }
      const b = band(bandAt(i));
      await expect(rail(page)).toHaveAttribute("aria-valuetext", spoken(b));
      await expect(page.getByTestId("light-shows")).toHaveText(`Shows ${b.shows}`);
      if (i < COUNT - 1) await page.getByRole("button", { name: `Next: stop ${String(i + 2).padStart(2, "0")}` }).click();
    }
    // The last stop hands the rail over: any band, by keyboard.
    await rail(page).focus();
    await page.keyboard.press("Home");
    await expect(rail(page)).toHaveAttribute("aria-valuetext", spoken(band(set.imageIds[0])));
    await expect(page.getByTestId("light-shows")).toHaveText(`Shows ${band(set.imageIds[0]).shows}`);
  });

  test("a stop that changes band crossfades from one to the other", async ({ page }) => {
    await page.goto(`/${journey.slug}/?mode=story&stop=2`);
    await ready(page);
    await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
    await page.waitForTimeout(1500);
    const gray = await redness(page, 50);
    expect(gray[0]).toBeLessThan(0.1);
    await page.getByRole("button", { name: "Next: stop 03" }).click();
    const seen = await redness(page, 1600);
    // Gray, then frames in between, then red.
    expect(Math.max(...seen), JSON.stringify(seen)).toBeGreaterThan(0.5);
    expect(seen.some((v) => v > 0.12 && v < 0.45), JSON.stringify(seen)).toBe(true);
  });

  test("the set's note and every band's note equal the manifests, in Light mode too", async ({ page }) => {
    await page.goto(`/${set.imageIds[0]}/?mode=light`);
    await ready(page);
    await rail(page).focus();
    for (let i = 0; i < set.imageIds.length; i++) {
      const b = images[i].bands.value[0];
      await expect(rail(page)).toHaveAttribute("aria-valuetext", spoken(b));
      await expect(page.getByTestId("light-shows")).toHaveText(`Shows ${b.shows}`);
      await expect(page.getByTestId("light-rail").locator("li[data-current]")).toHaveText(`${b.wavelength.value} Å${b.region}`);
      await page.keyboard.press("ArrowRight");
    }
    await expect(page.getByTestId("light-showing").getByText("Draft", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "What differs?" }).click();
    const note = page.getByRole("dialog", { name: /What differs\?/ });
    await expect(note.getByText(set.whatDiffers)).toBeVisible();
    await expect(note).toContainText("Differs Instrument, Band");
  });

  test("light theme: the Journey's chrome turns light, the image stays dark, the credit shows", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`/${journey.slug}/?mode=story&stop=4`);
    await ready(page);
    expect(await page.getByTestId("light-bar").evaluate((el) => getComputedStyle(el).color)).toBe("rgb(17, 20, 26)");
    await expect(page.getByTestId("light-bar").getByRole("listitem").last()).toHaveText(read(`data/sources/${set.imageIds[0]}.json`).credit);
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("a stop's band change is a cut", async ({ page }) => {
    await page.goto(`/${journey.slug}/?mode=story&stop=2`);
    await ready(page);
    await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Next: stop 03" }).click();
    await expect(rail(page)).toHaveAttribute("aria-valuetext", spoken(band(bandAt(2))));
    await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
    const seen = await redness(page, 400);
    expect(seen.every((v) => v > 0.45), JSON.stringify(seen)).toBe(true);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Story keeps only the rail in the bar, under the top bar, clear of the zoom controls and the card", async ({ page }) => {
    await page.goto(`/${journey.slug}/?mode=story&stop=3`);
    await ready(page);
    const bar = await box(page.getByTestId("light-bar"));
    await expect(page.getByTestId("light-shows")).toBeHidden();
    await expect(rail(page)).toHaveAttribute("aria-valuetext", spoken(band(bandAt(2))));
    // Story on a phone hides the zoom controls; whatever is shown stays clear of the bar.
    for (const other of [page.locator("[aria-label='View controls']"), page.getByTestId("sheet"), page.locator("header")]) {
      if (!(await other.isVisible())) continue;
      expect(overlaps(bar, await box(other))).toBe(false);
    }
    await expect(card(page).locator("p")).toHaveText(journey.stops[2].body.split(/\n\s*\n/));
    await page.getByRole("button", { name: "Next: stop 04" }).click();
    await expect(rail(page)).toHaveAttribute("aria-valuetext", spoken(band(bandAt(3))));
  });
});

test.describe("phone, Light mode", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the image fits between the bar and the sheet; the bar is a strip; the band's note is in the sheet", async ({ page }) => {
    await page.goto(`/${set.imageIds[0]}/?mode=light&band=${set.imageIds[1]}`);
    await ready(page);
    await page.waitForFunction(() => !document.querySelector("main[data-loading]"));
    await page.waitForTimeout(400);
    const bar = await box(page.getByTestId("light-bar"));
    const sheet = await box(page.getByTestId("sheet"));
    expect(bar.height).toBeLessThanOrEqual(150);
    expect(bar.x + bar.width).toBeLessThanOrEqual(390);
    await expect(page.getByTestId("light-rail").locator("li").last()).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "What differs?" })).toBeInViewport({ ratio: 1 });
    // The caption and "What differs?" share one row.
    const caption = await box(page.getByTestId("light-showing"));
    const what = await box(page.getByRole("button", { name: "What differs?" }));
    expect(Math.abs(caption.y + caption.height / 2 - (what.y + what.height / 2))).toBeLessThanOrEqual(2);
    await expect(page.getByTestId("light-shows")).toBeHidden();
    await expect(page.getByTestId("sheet-shows")).toHaveText(`Shows ${images[1].bands.value[0].shows}`);
    // The rows the viewer drew in the middle column: nothing under the sheet or the bar.
    const drawn = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid="viewer"] .openseadragon-canvas canvas')!;
      const r = c.getBoundingClientRect();
      const k = c.width / r.width;
      const col = c.getContext("2d")!.getImageData(Math.round(c.width / 2), 0, 1, c.height).data;
      let first = -1, last = -1;
      for (let y = 0; y < c.height; y++) if (col[y * 4 + 3] > 0) {
        if (first < 0) first = y;
        last = y;
      }
      return { top: r.top + first / k, bottom: r.top + (last + 1) / k };
    });
    // Within 2 px: the margin is whole pixels and the canvas rows are device pixels.
    expect(drawn.bottom).toBeLessThanOrEqual(sheet.y + 2);
    expect(drawn.top).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    expect(drawn.bottom - drawn.top).toBeGreaterThan(200);
  });
});

