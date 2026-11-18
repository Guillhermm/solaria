import { expect, type Page, test } from "@playwright/test";

const PATH = "/andromeda-phat-phast-2025/";

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const readout = (page: Page) => page.getByTestId("readout");

// The viewer is ready once OpenSeadragon has drawn and the readout came from it.
const ready = async (page: Page) => {
  await page.getByTestId("viewer").locator(".openseadragon-canvas").waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

test("the image page opens full-bleed with no site header or footer", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  const box = (await page.getByTestId("viewer").locator(".openseadragon-container").boundingBox())!;
  const size = page.viewportSize()!;
  expect(box).toEqual({ x: 0, y: 0, width: size.width, height: size.height });
});

test("the viewer requests its tiles under /tiles/", async ({ page }) => {
  const tile = page.waitForRequest((r) => r.url().includes("/tiles/andromeda-phat-phast-2025/"));
  await page.goto(PATH);
  expect((await tile).url()).toMatch(/\/tiles\/andromeda-phat-phast-2025\/\d+\/\d+\/\d+\.jpg$/);
  expect((await (await tile).response())?.status()).toBe(200);
});

test("a wide image fits the window and the readout shows its center at 1.0x", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await expect(readout(page)).toHaveText(/Center x\s*21 104\s*y\s*4 935\s*Zoom\s*1\.0×/);
});

test("zoom buttons and reset drive the view; zoom shows once", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(readout(page)).toContainText("2.0×");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(readout(page)).toContainText("4.0×");
  await expect(page.getByText(/\d\.\d×/)).toHaveCount(1);
  await page.getByRole("group", { name: "View controls" }).getByRole("button", { name: "Reset view" }).click();
  await expect(readout(page)).toContainText("1.0×");
});

test("the overview keeps the image's aspect ratio", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  const box = (await page.getByTestId("overview-image").boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(42208 / 9870, 1);
});

test("an unknown slug answers 404", async ({ page }) => {
  const response = await page.goto("/no-such-image/");
  expect(response?.status()).toBe(404);
});
