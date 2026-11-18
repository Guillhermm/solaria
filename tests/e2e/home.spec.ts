import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { homeJourneys } from "./content";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const source = read("data/sources/andromeda-phat-phast-2025.json");
const journey = read("data/journeys/andromeda.json");
const W = source.file.width;

const POSTER_ALT =
  "The disk of the Andromeda Galaxy as a wide panorama, in colors assigned to two filters: blue toward the outer edge, yellowish toward the bright center, with dark dust lanes.";

// Readouts are computed from the Journey file, never typed: zoom = the stop's z, field = W / z.
const readout = (index: number) => {
  const { x, y, z } = journey.stops[index].viewport;
  const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return { zoom: `${z.toFixed(1)}×`, field: `${fmt(W / z)} × ${fmt(W / z)} px`, x: `${fmt(x)} px`, y: `${fmt(y)} px` };
};

test.beforeEach(async ({ page, baseURL }) => {
  // No live network: only the local server may answer.
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const lensLabel = (page: Page) => page.getByText(/^Lens, aimed at stop \d\d of 07$/);
const strip = (page: Page) => page.getByRole("group", { name: "Whole panorama, with a close-up lens" });

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the hero states the copy, the poster and the credit", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fly into one giant image.");
    await expect(page.getByText("Andromeda · Hubble · 7 stops", { exact: true })).toBeVisible();
    await expect(page.getByText("Stops 01 and 07 show the whole image.")).toBeVisible();
    await expect(
      page.getByText("Solaria guides you through a giant Hubble image, one stop at a time, then lets you zoom anywhere."),
    ).toBeVisible();
    const poster = page.getByRole("img", { name: POSTER_ALT });
    await expect(poster).toHaveAttribute("fetchpriority", "high");
    await expect(poster).toHaveAttribute("src", "/tiles/andromeda-phat-phast-2025/preview.jpg");
    await expect(poster).toHaveAttribute("srcset", "/tiles/andromeda-phat-phast-2025/poster.jpg 1319w, /tiles/andromeda-phat-phast-2025/preview.jpg 2048w");
    expect(await page.locator('link[rel="preload"][as="image"][imagesrcset*="poster.jpg"]').count()).toBe(1);
    // Desktop at 1x takes the 2048 px preview.
    await expect.poll(() => poster.evaluate((el) => (el as HTMLImageElement).currentSrc)).toMatch(/preview\.jpg$/);
    await expect(page.locator("main section").first().getByText(source.credit, { exact: true })).toBeVisible();
    await expect(page.getByText(/NASA's largest/)).toHaveCount(0);
  });

  test("the actions open the Journey and Explore", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Begin the journey" })).toHaveAttribute("href", "/andromeda/");
    await expect(page.getByRole("link", { name: "Explore freely" })).toHaveAttribute("href", "/andromeda-phat-phast-2025/");
    await page.getByRole("link", { name: "Begin the journey" }).click();
    await expect(page).toHaveURL(/\/andromeda\/$/);
  });

  test("the lens starts on the first close stop with computed readouts and real tiles", async ({ page }) => {
    await page.goto("/");
    await expect(lensLabel(page)).toHaveText("Lens, aimed at stop 02 of 07");
    await expect(page.getByText(journey.stops[1].title, { exact: true }).first()).toBeVisible();
    const r = readout(1);
    const values = page.locator("dl").first();
    for (const [term, value] of [["Zoom", r.zoom], ["Field", r.field], ["Center x", r.x], ["Center y", r.y]]) {
      await expect(values.locator("div", { has: page.locator(`dt:text-is("${term}")`) }).locator("dd")).toHaveText(value);
    }
    await expect(page.getByRole("link", { name: "Go to stop 02" })).toHaveAttribute("href", "/andromeda/?mode=story&stop=2");
    // The lens draws from the viewer's pyramid: every tile loads.
    const tiles = page.locator('img[src*="/tiles/andromeda-phat-phast-2025/"]:not([src$="preview.jpg"]):not([src$="thumbnail.jpg"])');
    expect(await tiles.count()).toBeGreaterThan(0);
    await expect
      .poll(() => tiles.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
  });

  test("hovering a stop aims the lens and leaving the strip returns it", async ({ page }) => {
    await page.goto("/");
    await strip(page).getByRole("link", { name: "Open stop 04" }).hover();
    await expect(lensLabel(page)).toHaveText("Lens, aimed at stop 04 of 07");
    await expect(page.locator("dd").first()).toHaveText(readout(3).zoom);
    await page.mouse.move(700, 150);
    await expect(lensLabel(page)).toHaveText("Lens, aimed at stop 02 of 07");
  });

  test("the stops are one roving tab stop moved with the arrows, and Enter opens the stop", async ({ page }) => {
    await page.goto("/");
    const marks = strip(page).getByRole("link");
    await expect(marks).toHaveCount(5);
    expect(await marks.evaluateAll((els) => els.map((el) => el.getAttribute("tabindex")))).toEqual(["0", "-1", "-1", "-1", "-1"]);
    await page.getByRole("link", { name: "Explore freely" }).focus();
    await page.keyboard.press("Tab");
    await expect(strip(page).getByRole("link", { name: "Open stop 02" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(strip(page).getByRole("link", { name: "Open stop 03" })).toBeFocused();
    await expect(lensLabel(page)).toHaveText("Lens, aimed at stop 03 of 07");
    await expect(page.locator("[aria-live=polite]").filter({ hasText: /^Stop/ })).toHaveText(`Stop 3, zoom ${readout(2).zoom}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(strip(page).getByRole("link", { name: "Open stop 02" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/andromeda\/\?mode=story&stop=3$/);
  });

  test("the leader lines join the lens to its view box on the strip", async ({ page }) => {
    await page.goto("/");
    const d = () => page.getByTestId("leaders").locator("path").last().getAttribute("d");
    await expect.poll(d).toMatch(/^M.+L.+M.+L.+$/);
    const before = await d();
    await strip(page).getByRole("link", { name: "Open stop 06" }).hover();
    await expect.poll(d).not.toBe(before);
  });

  test("leaders are cut at the strip: one plain line above it in the light theme, white and halo over the image", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      const leaders = page.getByTestId("leaders");
      await expect.poll(() => leaders.locator("[data-part=over]").getAttribute("d")).toMatch(/^M.+L.+M.+L.+$/);
      const look = await leaders.evaluate((svg) =>
        [...svg.querySelectorAll("path")].map((p) => {
          const s = getComputedStyle(p);
          return { part: p.dataset.part ?? "halo", display: s.display, stroke: s.stroke, opacity: s.strokeOpacity };
        }),
      );
      const above = look.find((l) => l.part === "above")!;
      const over = look.find((l) => l.part === "over")!;
      const halos = look.filter((l) => l.part === "halo");
      expect(over.stroke).toBe("rgba(255, 255, 255, 0.7)");
      if (scheme === "light") {
        expect(halos.map((h) => h.display)).toEqual(["none", "inline"]);
        expect(above.stroke).toBe("rgb(17, 20, 26)");
        expect(above.opacity).toBe("0.6");
      } else {
        expect(halos.map((h) => h.display)).toEqual(["inline", "inline"]);
        expect(above.stroke).toBe("rgba(255, 255, 255, 0.7)");
      }
      // The cut sits on the strip's top edge.
      const edge = await page.evaluate(() => {
        const hero = document.querySelector("main section")!.getBoundingClientRect().top;
        return document.querySelector("[role=group]")!.getBoundingClientRect().top - hero;
      });
      const cutY = Number((await leaders.locator("[data-part=over]").getAttribute("d"))!.match(/^M[\d.]+ ([\d.]+)/)![1]);
      expect(cutY).toBeCloseTo(edge, 0);
    }
  });

  test("the lens on the deepest stop loads the level that gives at least 680 device pixels across", async ({ page }) => {
    await page.goto("/");
    await strip(page).getByRole("link", { name: "Open stop 06" }).hover();
    await expect(lensLabel(page)).toHaveText("Lens, aimed at stop 06 of 07");
    // Field 42 208 / 29 = 1 455 px: level 5 (half) gives 728 px across, level 4 only 364.
    const levels = await page
      .locator('img[src*="/tiles/andromeda-phat-phast-2025/"]:not([src$="preview.jpg"]):not([src$="thumbnail.jpg"]):not([src$="poster.jpg"])')
      .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLImageElement).getAttribute("src")!.split("/")[3]))]);
    expect(levels).toContain("5");
  });

  test("with reduced motion the lens swaps without fading", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await strip(page).getByRole("link", { name: "Open stop 05" }).hover();
    await expect(lensLabel(page)).toHaveText("Lens, aimed at stop 05 of 07");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test("the Journeys index lists the published Journeys from their files", async ({ page }) => {
    await page.goto("/");
    const index = page.getByRole("region", { name: "Journeys" });
    const rows = index.getByRole("listitem");
    await expect(rows.getByRole("heading", { level: 3 })).toHaveText(homeJourneys().map((j) => j.title));
    const mars = JSON.parse(readFileSync("data/journeys/nili-patera.json", "utf8"));
    const rowOf = (title: string) => rows.filter({ has: page.getByRole("heading", { level: 3, name: title, exact: true }) });
    const marsRow = rowOf(mars.title);
    await expect(marsRow.getByRole("heading", { level: 3 })).toHaveText(mars.title);
    await expect(marsRow).toContainText(mars.summary);
    await expect(marsRow).toContainText("6 stops · Story, Explore · Mars Reconnaissance Orbiter");
    await expect(marsRow).toContainText("3 934 × 5 747 px");
    await expect(marsRow.getByRole("link", { name: `Begin ${mars.title}` })).toHaveAttribute("href", "/nili-patera/");
    const sun = JSON.parse(readFileSync("data/journeys/sun.json", "utf8"));
    const second = rowOf(sun.title);
    await expect(second.getByRole("heading", { level: 3 })).toHaveText(sun.title);
    await expect(second).toContainText(sun.summary);
    await expect(second).toContainText("7 stops · Story, Explore, Light · SDO");
    // The thumbnail is the band the Journey opens on.
    await expect(second.locator("img")).toHaveAttribute("src", new RegExp(`/${sun.stops[0].band}/thumbnail\\.jpg$`));
    await expect(second).toContainText("4 096 × 4 096 px");
    await expect(second.getByRole("link", { name: `Begin ${sun.title}` })).toHaveAttribute("href", "/sun/");
    // A square thumbnail is contained in the wide slot, whole.
    const sunShape = await second.locator("img").evaluate((el) => {
      const img = el as HTMLImageElement;
      const box = img.getBoundingClientRect();
      const frame = img.parentElement!.getBoundingClientRect();
      return { drawn: box.width / box.height, file: img.naturalWidth / img.naturalHeight, inside: box.top >= frame.top - 0.5 && box.bottom <= frame.bottom + 0.5 };
    });
    expect(sunShape.drawn).toBeCloseTo(sunShape.file, 1);
    expect(sunShape.inside).toBe(true);
    const row = rows.nth(0);
    await expect(row.getByRole("heading", { level: 3 })).toHaveText(journey.title);
    await expect(row).toContainText(journey.summary);
    await expect(row).toContainText("7 stops · Story, Explore · Hubble");
    await expect(row).toContainText("42 208 × 9 870 px");
    await expect(row.getByRole("link", { name: `Begin ${journey.title}` })).toHaveAttribute("href", "/andromeda/");
    await expect(index.getByRole("heading", { name: "More journeys will appear here" })).toHaveCount(0);
    await expect(index.getByText(/Planned/)).toHaveCount(0);
    // design.md 6.4: the thumbnail keeps its true shape inside the slot.
    const shape = await row.locator("img").evaluate((el) => {
      const img = el as HTMLImageElement;
      const box = img.getBoundingClientRect();
      return { drawn: box.width / box.height, file: img.naturalWidth / img.naturalHeight };
    });
    expect(shape.drawn).toBeCloseTo(shape.file, 1);
  });

  test("the unlabeled comparison slider and the unvalidated gallery stay gone", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("img-comparison-slider")).toHaveCount(0);
    await expect(page.getByText("Spectral Gallery")).toHaveCount(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  for (const scheme of ["dark", "light"] as const) {
    test(`no lens, stops open the Journey, nothing overflows (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const tileRequests: string[] = [];
      page.on("request", (r) => {
        if (/\/tiles\/.+\/\d+\/\d+\/\d+\.jpg$/.test(r.url())) tileRequests.push(r.url());
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(scheme);
      await expect(page.getByRole("img", { name: POSTER_ALT })).toBeVisible();
      // A phone at 3x takes the stitched poster (one pyramid level), not the 2048 px preview.
      expect(await page.getByRole("img", { name: POSTER_ALT }).evaluate((el) => (el as HTMLImageElement).currentSrc)).toMatch(/poster\.jpg$/);
      await expect(lensLabel(page)).toBeHidden();
      await expect(page.getByText("Stops 01 and 07 show the whole image.")).toBeVisible();
      await expect(page.getByText("Aim the lens at a stop", { exact: false })).toBeHidden();
      // The detail of the week draws its crop from tiles; the hero's lens loads none.
      const weekly = await page.getByTestId("weekly-crop").locator("img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
      expect(tileRequests.filter((u) => !weekly.includes(u))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      const begin = (await page.getByRole("link", { name: "Begin the journey" }).boundingBox())!;
      expect(begin.height).toBeGreaterThanOrEqual(48);
      expect(begin.width).toBeGreaterThan(390 - 2 * 16 - 1);
      await strip(page).getByRole("link", { name: "Open stop 05" }).tap();
      await expect(page).toHaveURL(/\/andromeda\/\?mode=story&stop=5$/);
    });
  }
});
