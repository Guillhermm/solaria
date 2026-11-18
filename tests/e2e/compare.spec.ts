import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Compare on the mock pair (docs/architecture-compare.md, slices 4 and 5). The end-to-end
// build includes the mock content; the reference is warm-tinted, the moving image cool.
const PATH = "/mock-compare-before/";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const before = read("data/mock/sources/mock-compare-before.json");
const after = read("data/mock/sources/mock-compare-after.json");
const pair = read("data/mock/pairs/mock-compare.json");

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

const divider = (page: Page) => page.getByRole("slider", { name: "Divider between the two images" });

// The color the left viewer drew at a point of the window, read from its canvas.
const pixel = (page: Page, x: number, y: number, testId = "viewer") =>
  page.evaluate(
    ({ x, y, testId }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(`[data-testid="${testId}"] .openseadragon-canvas canvas`)!;
      const box = canvas.getBoundingClientRect();
      const k = canvas.width / box.width;
      const [r, g, b, a] = canvas.getContext("2d")!.getImageData(Math.round((x - box.left) * k), Math.round((y - box.top) * k), 1, 1).data;
      return { r, g, b, a };
    },
    { x, y, testId },
  );

const warm = (p: { r: number; b: number }) => p.r > p.b;
const cool = (p: { r: number; b: number }) => p.b > p.r * 1.3;

// Waits until every tile in view has drawn.
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector("main[data-loading]"));

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Compare opens from Explore, keeps both credits on screen and hides the single credit", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await page.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Compare" }).click();
    await expect(page).toHaveURL(/\?mode=compare&x=\d+&y=\d+&z=[\d.]+$/);
    const bar = page.getByTestId("compare-bar");
    const credits = bar.getByRole("list", { name: "Credits" }).getByRole("listitem");
    await expect(credits).toHaveCount(2);
    await expect(credits.nth(0)).toHaveText(`Left, ${pair.labels[0].short}: ${before.credit}`);
    await expect(credits.nth(1)).toHaveText(`Right, ${pair.labels[1].short}: ${after.credit}`);
    await expect(credits.nth(0)).toBeVisible();
    await expect(credits.nth(1)).toBeVisible();
    await expect(bar).toContainText(pair.headline);
    // The pair is draft: its headline and labels carry the Draft tag.
    await expect(bar.locator("p", { hasText: pair.headline }).getByText("Draft", { exact: true })).toBeVisible();
    await page.keyboard.press("e");
    await expect(page).toHaveURL(/\?mode=explore/);
    await expect(divider(page)).toHaveCount(0);
  });

  test("wipe: the reference shows left of the divider and the moving image right, also after a zoom", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&split=30`);
    await ready(page);
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "30");
    await settled(page);
    const at = async () => {
      const handle = (await divider(page).boundingBox())!;
      const x = handle.x + handle.width / 2;
      const y = handle.y - 120;
      return { left: await pixel(page, x - 30, y), right: await pixel(page, x + 30, y) };
    };
    let p = await at();
    expect(warm(p.left), JSON.stringify(p)).toBe(true);
    expect(cool(p.right), JSON.stringify(p)).toBe(true);
    // Risk 4 of the architecture: the crops follow the camera through a zoom animation.
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page).toHaveURL(/z=2\.5/);
    await settled(page);
    p = await at();
    expect(warm(p.left), JSON.stringify(p)).toBe(true);
    expect(cool(p.right), JSON.stringify(p)).toBe(true);
  });

  test("the stepped corner shows neither image's black", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&split=0`);
    await ready(page);
    await settled(page);
    // The moving image's empty corner falls at the top right of the overlap; there the reference
    // is clipped away and the moving image is cropped to its footprint: nothing is drawn, so the
    // viewer ground shows through.
    const box = (await page.getByTestId("viewer").boundingBox())!;
    expect((await pixel(page, box.x + box.width * 0.82, box.y + box.height * 0.2)).a).toBe(0);
    // Just inside the footprint the moving image is drawn.
    expect(cool(await pixel(page, box.x + box.width * 0.5, box.y + box.height * 0.75))).toBe(true);
  });

  test("the divider follows the keyboard, writes the URL, and a reload restores it", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&split=30`);
    await ready(page);
    const slider = divider(page);
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "31");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "41");
    await page.keyboard.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "40");
    await expect(slider).toHaveAttribute("aria-valuetext", `40 %, ${pair.labels[0].full} on the left, ${pair.labels[1].full} on the right`);
    await expect(page).toHaveURL(/split=40/);
    await page.reload();
    await ready(page);
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "40");
    await divider(page).focus();
    await page.keyboard.press("Home");
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("End");
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "100");
    // The default is left out of the URL.
    await page.keyboard.press("Home");
    for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowRight");
    await expect(page).toHaveURL(/\?mode=compare&x=/);
  });

  test("dragging the handle moves the divider; dragging the image pans it", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare`);
    await ready(page);
    const handle = (await divider(page).boundingBox())!;
    const viewer = (await page.getByTestId("viewer").boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(viewer.x + viewer.width * 0.7, handle.y + handle.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "70");
    const url = page.url();
    await page.mouse.move(viewer.x + viewer.width * 0.3, viewer.y + viewer.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(viewer.x + viewer.width * 0.25, viewer.y + viewer.height * 0.4, { steps: 5 });
    await page.mouse.up();
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "70");
    await expect(page).not.toHaveURL(url);
  });

  test("blink alternates the two images, and Swap flips them by hand", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&layout=blink`);
    await ready(page);
    await settled(page);
    await expect(divider(page)).toHaveCount(0);
    const box = (await page.getByTestId("viewer").boundingBox())!;
    const probe = () => pixel(page, box.x + box.width * 0.45, box.y + box.height * 0.75);
    const seen = new Set<string>();
    for (let i = 0; i < 8 && seen.size < 2; i++) {
      const p = await probe();
      seen.add(warm(p) ? "warm" : cool(p) ? "cool" : "other");
      await page.waitForTimeout(300);
    }
    expect([...seen].sort()).toEqual(["cool", "warm"]);
    await page.getByRole("button", { name: "Pause blink" }).click();
    const showing = page.getByText(/^Showing /);
    const first = await showing.textContent();
    await page.waitForTimeout(1000);
    await expect(showing).toHaveText(first!);
    await page.getByRole("button", { name: "Swap" }).click();
    await expect(showing).not.toHaveText(first!);
  });

  test("side by side: two viewers, and panning one moves the other", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&layout=side`);
    await ready(page);
    await page.waitForFunction(() => document.querySelector('[data-testid="viewer-side"] .openseadragon-canvas canvas'));
    await settled(page);
    const left = (await page.getByTestId("viewer").boundingBox())!;
    const right = (await page.getByTestId("viewer-side").boundingBox())!;
    expect(left.width).toBeCloseTo(right.width, 0);
    expect(right.x).toBeCloseTo(left.x + left.width, 0);
    await page.waitForTimeout(800);
    const spot = { x: right.x + right.width * 0.5, y: right.y + right.height * 0.6 };
    expect(cool(await pixel(page, spot.x, spot.y, "viewer-side"))).toBe(true);
    const signature = () =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('[data-testid="viewer-side"] .openseadragon-canvas canvas')!;
        return Array.from(c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.filter((_, i) => i % 4099 === 0)).join(",");
      });
    const was = await signature();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page).toHaveURL(/layout=side.*z=2\.5/);
    await page.waitForTimeout(500);
    expect(await signature()).not.toBe(was);
    await expect(page.getByRole("slider")).toHaveCount(0);
  });

  test("side by side: the grid both images share lands at the same place in each viewer", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&layout=side`);
    await ready(page);
    await page.waitForFunction(() => document.querySelector('[data-testid="viewer-side"] .openseadragon-canvas canvas'));
    await settled(page);
    await page.waitForTimeout(800);
    // Grid lines crossing one row, in CSS pixels from each viewer's left edge.
    const lines = (testId: string) =>
      page.evaluate((testId) => {
        const c = document.querySelector<HTMLCanvasElement>(`[data-testid="${testId}"] .openseadragon-canvas canvas`)!;
        const k = c.width / c.getBoundingClientRect().width;
        const d = c.getContext("2d")!.getImageData(0, Math.round(c.height * 0.3), c.width, 1).data;
        const lum = (i: number) => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2];
        const out: number[] = [];
        for (let i = 2; i < c.width - 2; i++) {
          if (lum(i) > lum(i - 2) + 40 && lum(i) > lum(i + 2) + 40 && lum(i) >= lum(i - 1) && lum(i) > lum(i + 1)) out.push(i / k);
        }
        return out;
      }, testId);
    const a = await lines("viewer");
    const b = await lines("viewer-side");
    expect(b.length).toBeGreaterThan(3);
    // Every line in the right viewer has its twin in the left one, within 3 px.
    for (const x of b) expect(Math.min(...a.map((y) => Math.abs(x - y))), JSON.stringify({ a, b })).toBeLessThan(3);
  });

  test("What differs? shows the pair's note, its flags and both images' caveats, from the manifests only", async ({ page }) => {
    const reference = read("data/mock/images/mock-compare-before.json");
    const moving = read("data/mock/images/mock-compare-after.json");
    await page.goto(`${PATH}?mode=compare`);
    await ready(page);
    const open = page.getByRole("button", { name: "What differs?" });
    await open.click();
    const note = page.getByRole("dialog", { name: /What differs\?/ });
    await expect(note).toBeVisible();
    await expect(note.getByText(pair.whatDiffers)).toBeVisible();
    await expect(note.getByText("Draft", { exact: true })).toBeVisible();
    await expect(note).toContainText("Differs Date, Viewing geometry");
    await expect(note.getByRole("listitem")).toHaveText([...reference.caveats, ...moving.caveats]);
    await page.keyboard.press("Escape");
    await expect(note).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("the compare bar covers neither the overview nor the zoom controls", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare`);
    await ready(page);
    const bar = (await page.getByTestId("compare-bar").boundingBox())!;
    for (const other of [page.getByRole("group", { name: "View controls" }), page.getByTestId("readout")]) {
      const b = (await other.boundingBox())!;
      const overlap = bar.x < b.x + b.width && b.x < bar.x + bar.width && bar.y < b.y + b.height && b.y < bar.y + bar.height;
      expect(overlap).toBe(false);
    }
  });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no WCAG 2.2 A or AA violation in Compare (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${PATH}?mode=compare`);
      await ready(page);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("light theme: the chrome turns light and the image area stays dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${PATH}?mode=compare`);
    await ready(page);
    const bg = await page.getByTestId("compare-bar").evaluate((el) => getComputedStyle(el).color);
    expect(bg).toBe("rgb(17, 20, 26)");
    const label = page.getByTestId("divider").getByText(pair.labels[0].full);
    await expect(label).toBeVisible();
    expect(await label.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(233, 236, 242)");
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });

  test("blink never runs on its own; Swap is the only way", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&layout=blink`);
    await ready(page);
    await expect(page.getByRole("button", { name: /blink/ })).toHaveCount(0);
    const showing = page.getByText(/^Showing /);
    const first = await showing.textContent();
    await page.waitForTimeout(1200);
    await expect(showing).toHaveText(first!);
    await page.getByRole("button", { name: "Swap" }).click();
    await expect(showing).not.toHaveText(first!);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Wipe only, a 3rem handle, chips for the sides and both credits in the sheet", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&layout=side`);
    await ready(page);
    await expect(page.getByTestId("viewer-side")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Layout" })).toHaveCount(0);
    const handle = (await divider(page).boundingBox())!;
    expect(handle.width).toBe(48);
    const bar = page.getByTestId("compare-bar");
    await expect(bar.getByText(`Left: ${pair.labels[0].short}`)).toBeVisible();
    await expect(bar.getByText(`Right: ${pair.labels[1].short}`)).toBeVisible();
    const sheet = page.getByTestId("sheet");
    await expect(sheet.getByText(`Left, ${pair.labels[0].short}: ${before.credit}`)).toBeVisible();
    await expect(sheet.getByText(`Right, ${pair.labels[1].short}: ${after.credit}`)).toBeVisible();
    await divider(page).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(divider(page)).toHaveAttribute("aria-valuenow", "49");
  });

  test("the mode switch takes the title's room, and the open note leaves the zoom controls clear", async ({ page }) => {
    await page.goto(`${PATH}?mode=compare&x=2048&y=1024&z=1`);
    await ready(page);
    await expect(page.getByRole("group", { name: "Mode" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
    await page.getByRole("button", { name: "What differs?" }).click();
    const note = (await page.getByTestId("what-differs").boundingBox())!;
    const zoom = (await page.getByRole("group", { name: "View controls" }).boundingBox())!;
    expect(note.x + note.width).toBeLessThanOrEqual(zoom.x);
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page).not.toHaveURL(/z=1$/);
  });
});

test.describe("the Hubble 1995 and 2014 pair", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  const hubble = read("data/pairs/pillars-hubble-1995-2014.json");

  test("ships with its tiles, the alignment line by the divider and the alignment caveat in the note", async ({ page }) => {
    const tile = page.waitForResponse((r) => r.url().includes("/tiles/pillars-hubble-1995/"));
    await page.goto("/pillars-hubble-2014/?mode=compare");
    await ready(page);
    expect((await tile).status()).toBe(200);
    await expect(page.getByTestId("compare-bar").getByText("Draft", { exact: true })).toHaveCount(0);
    await divider(page).focus();
    await expect(divider(page)).toHaveAccessibleDescription(hubble.alignment);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.getByRole("button", { name: "What differs?" }).click();
    const note = page.getByRole("dialog", { name: /What differs\?/ });
    await expect(note.getByText(hubble.whatDiffers)).toBeVisible();
    await expect(note.getByRole("listitem").first()).toHaveText(hubble.caveats[0]);
    await expect(note).toContainText("Differs Instrument, Band, Date, Processing");
  });

  test("the note, labels and credits equal the manifests exactly", async ({ page }) => {
    await page.goto("/pillars-hubble-2014/?mode=compare");
    await ready(page);
    const ref = hubble.imageIds.indexOf(hubble.reference);
    const [left, right] = [hubble.labels[ref], hubble.labels[1 - ref]];
    await expect(page.getByTestId("divider").getByText(left.full)).toBeVisible();
    await expect(page.getByTestId("divider").getByText(right.full)).toBeVisible();
    await page.getByRole("button", { name: "What differs?" }).click();
    const note = page.getByRole("dialog", { name: /What differs\?/ });
    await expect(note.getByRole("listitem")).toHaveText([...hubble.caveats, ...[hubble.reference, hubble.imageIds.find((i: string) => i !== hubble.reference)].flatMap((id) => read(`data/images/${id}.json`).caveats)]);
    await page.keyboard.press("Escape");
    const credits = page.getByTestId("compare-bar").getByRole("list", { name: "Credits" }).getByRole("listitem");
    await expect(credits.nth(0)).toContainText(`Left, ${left.short}: `);
    await expect(credits.nth(1)).toContainText(`Right, ${right.short}: `);
  });
});
