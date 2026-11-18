import { readdirSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// design.md 15.5, D10: by hand the camera stops at 1.1 screen pixels per image pixel; only a
// link's own view may go past it, and only as far as that view needs. D19: an image whose
// manifest has maxPixelRatio stops there instead, by hand and on its Journey's stops.
const IMAGES = readdirSync("data/images").map((f) => f.replace(/\.json$/, ""));
const manifest = (id: string) => JSON.parse(readFileSync(`data/images/${id}.json`, "utf8"));
const CAP = 1.1;
const capOf = (id: string) => Math.max(CAP, manifest(id).maxPixelRatio ?? 1);
const MAGNIFIED = IMAGES.filter((id) => manifest(id).maxPixelRatio > 1);
const journeyOn = (id: string) =>
  readdirSync("data/journeys")
    .map((f) => JSON.parse(readFileSync(`data/journeys/${f}`, "utf8")))
    .find((j) => j.imageId === id);
const SUN_LABEL = "/sun-sdo-2024-05-10-aia-94/?mode=light&labels=1&x=3020&y=2508&z=5.69";

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

// Screen pixels per image pixel, once the camera has stopped moving.
const scale = async (page: Page) => {
  const read = () => page.getByTestId("viewer").evaluate((el) => Number((el as HTMLElement).dataset.scale));
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const now = await read();
    if (Math.abs(now - last) < 1e-4) return now;
    last = now;
  }
  return last;
};

const readoutZ = async (page: Page) => parseFloat((await page.getByTestId("readout").locator("span").nth(5).textContent())!);

const pinch = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page);
  const box = (await page.getByTestId("viewer").boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const touch = async (type: "touchStart" | "touchMove" | "touchEnd", d: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }],
    });
  await touch("touchStart", 20);
  for (let d = 30; d <= 160; d += 10) await touch("touchMove", d);
  await touch("touchEnd", 160);
};

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const phone = viewport.width < 768;
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: phone });

    test("by hand the zoom stops at 1.1 screen pixels per image pixel on every image, or at its maxPixelRatio", async ({ page }) => {
      test.setTimeout(300_000);
      for (const id of IMAGES) {
        const cap = capOf(id);
        await page.goto(`/${id}/`);
        await ready(page);
        const canvas = page.locator('[data-testid="viewer"] .openseadragon-canvas');
        const box = (await page.getByTestId("viewer").boundingBox())!;
        await canvas.focus();
        for (let i = 0; i < 14; i++) await page.keyboard.press("+");
        expect(await scale(page), `${id}: + key`).toBeLessThanOrEqual(cap * 1.01);
        await page.keyboard.press("0");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        for (let i = 0; i < 14; i++) await page.mouse.wheel(0, -600);
        expect(await scale(page), `${id}: wheel`).toBeLessThanOrEqual(cap * 1.01);
        await page.keyboard.press("0");
        for (let i = 0; i < 8; i++) await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
        expect(await scale(page), `${id}: double-click`).toBeLessThanOrEqual(cap * 1.01);
        for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Zoom in" }).click({ force: true });
        expect(await scale(page), `${id}: Zoom in`).toBeLessThanOrEqual(cap * 1.01);
        if (phone) {
          await page.keyboard.press("0");
          for (let i = 0; i < 6; i++) await pinch(page);
          expect(await scale(page), `${id}: pinch`).toBeLessThanOrEqual(cap * 1.01);
        }
      }
    });

    for (const id of MAGNIFIED) {
      test(`D19: ${id} magnifies to its maxPixelRatio, on its deepest Journey stop and by hand`, async ({ page }) => {
        const ratio = manifest(id).maxPixelRatio;
        const journey = journeyOn(id);
        const deepest = journey.stops.reduce((a: { viewport: { z: number } }, b: { viewport: { z: number } }) => (b.viewport.z > a.viewport.z ? b : a));
        await page.goto(`/${journey.slug}/?mode=story&stop=${journey.stops.indexOf(deepest) + 1}`);
        await ready(page);
        const atStop = await scale(page);
        // Past the native zoom other images stop at, and no further than the manifest allows.
        expect(atStop).toBeGreaterThan(CAP * 1.01);
        expect(atStop).toBeLessThanOrEqual(ratio * 1.01);
        await page.goto(`/${id}/`);
        await ready(page);
        await page.locator('[data-testid="viewer"] .openseadragon-canvas').focus();
        for (let i = 0; i < 20; i++) await page.keyboard.press("+");
        expect(await scale(page)).toBeCloseTo(ratio, 1);
      });
    }

    test("the Sun label link lands on z 5.69; past the cap Zoom in is off until the user zooms out", async ({ page }) => {
      await page.goto(SUN_LABEL);
      await ready(page);
      const s = await scale(page);
      expect(Math.abs((await readoutZ(page)) - 5.69) / 5.69).toBeLessThanOrEqual(0.01);
      const zoomIn = page.getByRole("button", { name: "Zoom in" });
      if (s > CAP) {
        await expect(zoomIn).toBeDisabled();
        await page.locator('[data-testid="viewer"] .openseadragon-canvas').focus();
        await page.keyboard.press("+");
        expect(Math.abs((await scale(page)) - s)).toBeLessThan(1e-3);
      }
      await page.getByRole("button", { name: "Zoom out" }).click();
      await scale(page);
      await expect(zoomIn).toBeEnabled();
      for (let i = 0; i < 6; i++) if (await zoomIn.isEnabled()) await zoomIn.click();
      expect(await scale(page)).toBeLessThanOrEqual(CAP * 1.01);
      await expect(zoomIn).toBeDisabled();
    });
  });
}

// Since D11 the Light bar is a margin on desktop, so the label link's z 5.69 stays under the cap
// at 1440x900; a closer link on the same point still needs more than the cap.
const SUN_CLOSE = "/sun-sdo-2024-05-10-aia-94/?mode=light&labels=1&x=3020&y=2508&z=8";

test.describe("1440x900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("a Sun link that needs more than the cap here raises the cap for it", async ({ page }) => {
    await page.goto(SUN_CLOSE);
    await ready(page);
    expect(await scale(page)).toBeGreaterThan(CAP);
    expect(Math.abs((await readoutZ(page)) - 8) / 8).toBeLessThanOrEqual(0.01);
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });
});
