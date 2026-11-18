import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

// Light on the mock band set (G-01). Band A is a small red disc, B a larger green one, C the
// largest, blue; their synthetic wavelengths are 171, 1700 and 6173 Å.
const PATH = "/mock-light-a/";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const set = read("data/mock/band-sets/mock-light.json");
const images = set.imageIds.map((id: string) => read(`data/mock/images/${id}.json`));
const source = read("data/mock/sources/mock-light-a.json");

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector("main[data-loading]"));
const rail = (page: Page) => page.getByRole("slider", { name: "Band" });

// The mean color of the bright pixels the viewer drew (those with `channel` at 110 or more,
// any channel by default): the disc of whichever band shows.
const disc = (page: Page, channel?: 0 | 1 | 2) =>
  page.evaluate((channel) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="viewer"] .openseadragon-canvas canvas')!;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      if ((channel === undefined ? Math.max(d[i], d[i + 1], d[i + 2]) : d[i + channel]) < 110) continue;
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    return { r: r / n, g: g / n, b: b / n, n };
  }, channel);

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const box = async (l: Locator) => (await l.boundingBox())!;

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Light opens from Explore and with L, and E goes back", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    const modes = page.getByRole("group", { name: "Mode" });
    await expect(modes.getByRole("button")).toHaveText(["Explore", "Light"]);
    await modes.getByRole("button", { name: "Light" }).click();
    await expect(page).toHaveURL(/\?mode=light&x=\d+&y=\d+&z=[\d.]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(set.title);
    await page.keyboard.press("e");
    await expect(page).toHaveURL(/\?mode=explore/);
    await expect(rail(page)).toHaveCount(0);
    await page.keyboard.press("l");
    await expect(rail(page)).toBeVisible();
  });

  test("the rail goes band by band from the keyboard, speaks the wavelength, and the URL holds the band", async ({ page }) => {
    await page.goto(`${PATH}?mode=light`);
    await ready(page);
    const slider = rail(page);
    await expect(slider).toHaveAttribute("aria-valuemin", "0");
    await expect(slider).toHaveAttribute("aria-valuemax", "2");
    await expect(slider).toHaveAttribute("aria-valuetext", "171 angstroms, extreme ultraviolet");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "1");
    await expect(slider).toHaveAttribute("aria-valuetext", "1700 angstroms, ultraviolet");
    await expect(page.getByTestId("light-showing")).toContainText(images[1].title);
    await expect(page).toHaveURL(/band=mock-light-b/);
    await settled(page);
    let c = await disc(page);
    expect(c.g > c.r * 1.5 && c.g > c.b * 1.5, JSON.stringify(c)).toBe(true);
    await page.keyboard.press("End");
    await expect(slider).toHaveAttribute("aria-valuetext", "6173 angstroms, visible");
    await expect(page).toHaveURL(/band=mock-light-c/);
    await page.reload();
    await ready(page);
    await expect(rail(page)).toHaveAttribute("aria-valuenow", "2");
    await settled(page);
    c = await disc(page);
    expect(c.b > c.r * 1.5 && c.b > c.g * 1.5, JSON.stringify(c)).toBe(true);
    await rail(page).focus();
    await page.keyboard.press("Home");
    await expect(rail(page)).toHaveAttribute("aria-valuenow", "0");
    // The first band is the default and leaves the URL.
    await expect(page).toHaveURL(/\?mode=light&x=/);
    await page.keyboard.press("ArrowLeft");
    await expect(rail(page)).toHaveAttribute("aria-valuenow", "0");
  });

  test("dragging the rail crossfades between neighbors and settles on the nearer band", async ({ page }) => {
    await page.goto(`${PATH}?mode=light`);
    await ready(page);
    await settled(page);
    const r = await box(page.getByTestId("light-rail"));
    const y = r.y + 22;
    const stop = (i: number) => r.x + ((i + 0.5) / 3) * r.width;
    const a = await disc(page);
    expect(a.r > a.g * 1.5, JSON.stringify(a)).toBe(true);
    await page.mouse.move(stop(0), y);
    await page.mouse.down();
    await page.mouse.move((stop(0) + stop(1)) / 2, y, { steps: 4 });
    // Halfway: where band A's red disc lies, half of it and half of band B's green show.
    await settled(page);
    await page.waitForTimeout(150);
    const mid = await disc(page, 0);
    expect(mid.g / mid.r > 0.8 && mid.g / mid.r < 1.25, JSON.stringify(mid)).toBe(true);
    expect(a.g / a.r < 0.5).toBe(true);
    await page.mouse.move(stop(0) + (stop(1) - stop(0)) * 0.7, y, { steps: 2 });
    await page.mouse.up();
    await expect(rail(page)).toHaveAttribute("aria-valuenow", "1");
    await expect(page).toHaveURL(/band=mock-light-b/);
    await settled(page);
    await page.waitForTimeout(300);
    const b = await disc(page);
    expect(b.g > b.r * 1.5, JSON.stringify(b)).toBe(true);
  });

  test("the credit stays on screen and never fades, and About shows the band's image", async ({ page }) => {
    await page.goto(`${PATH}?mode=light&band=mock-light-c`);
    await ready(page);
    const credits = page.getByTestId("light-bar").getByRole("list", { name: "Credits" }).getByRole("listitem");
    await expect(credits).toHaveText([source.credit]);
    await page.mouse.move(600, 300);
    await page.waitForTimeout(5600);
    await expect(page.locator("main[data-idle]")).toHaveCount(1);
    expect(await credits.first().evaluate((el) => getComputedStyle(el.closest("section")!).opacity)).toBe("1");
    await page.getByRole("button", { name: "About this image" }).click();
    await expect(page.getByRole("heading", { name: images[2].title })).toBeVisible();
  });

  test("the bar and the open note cover neither the overview nor the zoom controls", async ({ page }) => {
    await page.goto(`${PATH}?mode=light`);
    await ready(page);
    const others = [page.getByRole("group", { name: "View controls" }), page.getByTestId("readout"), page.getByTestId("overview-image")];
    const bar = await box(page.getByTestId("light-bar"));
    for (const o of others) expect(overlaps(bar, await box(o))).toBe(false);
    await page.getByRole("button", { name: "What differs?" }).click();
    const note = page.getByRole("dialog", { name: /What differs\?/ });
    await expect(note.getByText(set.whatDiffers)).toBeVisible();
    await page.waitForTimeout(100);
    const n = await box(note);
    for (const o of [page.getByTestId("light-bar"), ...others]) expect(overlaps(n, await box(o))).toBe(false);
    await page.keyboard.press("Escape");
    await expect(note).toBeHidden();
  });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no WCAG 2.2 A or AA violation in Light (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${PATH}?mode=light`);
      await ready(page);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("light theme: the bar turns light and the image area stays dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${PATH}?mode=light`);
    await ready(page);
    expect(await page.getByTestId("light-bar").evaluate((el) => getComputedStyle(el).color)).toBe("rgb(17, 20, 26)");
    expect(await page.getByTestId("viewer").evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgb(247, 246, 242)");
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });

  test("a released drag lands on its stop at once", async ({ page }) => {
    await page.goto(`${PATH}?mode=light`);
    await ready(page);
    const r = await box(page.getByTestId("light-rail"));
    await page.mouse.move(r.x + r.width / 6, r.y + 22);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width * 0.75, r.y + 22, { steps: 3 });
    await page.mouse.up();
    expect(await rail(page).getAttribute("aria-valuenow")).toBe("2");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the bar sits under the top bar, the credit in the sheet, and nothing covers the zoom controls", async ({ page }) => {
    await page.goto(`${PATH}?mode=light&band=mock-light-b`);
    await ready(page);
    const bar = await box(page.getByTestId("light-bar"));
    const top = await box(page.locator("header"));
    expect(bar.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
    expect(bar.x + bar.width).toBeLessThanOrEqual(390);
    const zoom = await box(page.getByRole("group", { name: "View controls" }));
    expect(overlaps(bar, zoom)).toBe(false);
    await expect(page.getByTestId("sheet").getByRole("button", { name: source.credit })).toBeVisible();
    await expect(page.getByTestId("light-rail").getByText("1700 Å")).toBeVisible();
    // The rail's target is at least 2.75rem.
    const thumb = await box(rail(page));
    expect(thumb.height).toBeGreaterThanOrEqual(44);
    await rail(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect(rail(page)).toHaveAttribute("aria-valuenow", "2");
    await page.getByRole("button", { name: "What differs?" }).click();
    const note = await box(page.getByRole("dialog", { name: /What differs\?/ }));
    expect(overlaps(note, zoom)).toBe(false);
    expect(overlaps(note, await box(page.getByTestId("light-bar")))).toBe(false);
  });

  test("a tap on a stop's label goes to that band", async ({ page }) => {
    await page.goto(`${PATH}?mode=light`);
    await ready(page);
    await page.getByTestId("light-rail").getByText("6173 Å").tap();
    await expect(rail(page)).toHaveAttribute("aria-valuenow", "2");
  });
});

// The Sun from SDO (G-02): staged drafts, in the end-to-end build only.
test.describe("the SDO band set", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  const sun = read("data/staging/band-sets/sun-sdo-2024-05-10.json");
  const SUN = `/${sun.imageIds[0]}/`;
  const sunSource = read(`data/staging/sources/${sun.imageIds[0]}.json`);

  test("seven stops in wavelength order, read as the manifests state them, with every band's tiles", async ({ page }) => {
    await page.goto(`${SUN}?mode=light`);
    await ready(page);
    const labels = sun.imageIds.map((id: string) => {
      const w = read(`data/staging/images/${id}.json`).bands.value[0].wavelength;
      return `${w.value} ${w.unit}`;
    });
    expect(labels).toEqual(["94 Å", "171 Å", "193 Å", "211 Å", "304 Å", "1700 Å", "6173 Å"]);
    await expect(page.getByTestId("light-rail").locator("li")).toHaveText(labels);
    await expect(rail(page)).toHaveAttribute("aria-valuetext", "94 angstroms");
    // No note is written yet, so none is offered; the draft says so.
    await expect(page.getByRole("button", { name: "What differs?" })).toHaveCount(0);
    await expect(page.getByTestId("light-showing").getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByTestId("light-bar").getByRole("listitem").last()).toHaveText(sunSource.credit);
    const hmi = page.waitForResponse((r) => r.url().includes(`/tiles/${sun.imageIds[6]}/`));
    await rail(page).focus();
    await page.keyboard.press("End");
    await expect(rail(page)).toHaveAttribute("aria-valuetext", "6173 angstroms");
    expect((await hmi).status()).toBe(200);
  });

  test("a square image: the overview keeps its aspect and the bar clears it and the zoom controls", async ({ page }) => {
    await page.goto(`${SUN}?mode=light`);
    await ready(page);
    const nav = await box(page.getByTestId("overview-image"));
    expect(Math.abs(nav.width - nav.height)).toBeLessThanOrEqual(1);
    const bar = await box(page.getByTestId("light-bar"));
    for (const o of [page.getByRole("group", { name: "View controls" }), page.locator("[data-testid='overview-image']").locator("xpath=../..")]) {
      expect(overlaps(bar, await box(o))).toBe(false);
    }
  });
});
