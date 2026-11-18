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

test.use({ viewport: { width: 1280, height: 800 } });

test("arriving at a compare stop shows the pair in wipe, and leaving removes it", async ({ page }) => {
  test.slow();
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
