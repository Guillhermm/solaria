import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const PATH = "/andromeda-phat-phast-2025/";

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const readout = (page: Page) => page.getByTestId("readout");

// The viewer is ready once OpenSeadragon has drawn and the readout came from it.
const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
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

test("a shared link restores its view, and so does a reload", async ({ page }) => {
  await page.goto(`${PATH}?mode=explore&x=10000&y=5000&z=8`);
  await ready(page);
  await expect(readout(page)).toHaveText(/Center x\s*10 000\s*y\s*5 000\s*Zoom\s*8\.0×/);
  await page.reload();
  await ready(page);
  await expect(readout(page)).toHaveText(/Center x\s*10 000\s*y\s*5 000\s*Zoom\s*8\.0×/);
});

test("invalid view parameters fall back to the fit view", async ({ page }) => {
  await page.goto(`${PATH}?mode=nope&x=abc&y=1&z=Infinity`);
  await ready(page);
  await expect(readout(page)).toHaveText(/Center x\s*21 104\s*y\s*4 935\s*Zoom\s*1\.0×/);
});

test("the URL follows the view once it settles", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page).toHaveURL(/\?mode=explore&x=21104&y=4935&z=2$/);
});

test("the share button copies a link that reopens the same view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${PATH}?mode=explore&x=30000&y=6000&z=4`);
  await ready(page);
  await page.getByRole("button", { name: "Share this view" }).click();
  await expect(page.getByRole("status").filter({ hasText: "copied" })).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/andromeda-phat-phast-2025\/\?mode=explore&x=30000&y=6000&z=4$/);
  const other = await context.newPage();
  await other.goto(link);
  await ready(other);
  await expect(readout(other)).toHaveText(/Center x\s*30 000\s*y\s*6 000\s*Zoom\s*4\.0×/);
});

test("the info panel shows the manifest's fields, every caveat and the source link", async ({ page }) => {
  const manifest = JSON.parse(readFileSync("data/images/andromeda-phat-phast-2025.json", "utf8"));
  const source = JSON.parse(readFileSync("data/sources/andromeda-phat-phast-2025.json", "utf8"));
  await page.goto(PATH);
  await ready(page);
  const about = page.getByRole("button", { name: "About this image" });
  await about.click();
  await expect(about).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("region", { name: manifest.title });
  await expect(panel.getByRole("heading", { level: 2 })).toBeFocused();
  const fields = await panel.locator("dl > div").evaluateAll((rows) =>
    rows.map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.innerText]),
  );
  expect(fields).toEqual([
    ["Target", "M31, the Andromeda Galaxy"],
    ["Observatory", "Hubble"],
    ["Camera", "Advanced Camera for Surveys (ACS)"],
    ["Filters", "F475W shown as blue\nF814W shown as yellow"],
    ["Observed", "2010-07 to 2022-12"],
    ["Released", "2025-01-16"],
    ["Credit", source.credit],
  ]);
  await expect(panel.getByRole("listitem")).toHaveText(manifest.caveats);
  const link = panel.getByRole("link", { name: /Source page/ });
  await expect(link).toHaveAttribute("href", source.pageUrl);
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(about).toBeFocused();
});
