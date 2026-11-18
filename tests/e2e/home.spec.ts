import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  // No live network: only the local server may answer.
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

test("home page renders the title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "NASA 2025 Solaria"
  );
});

test("the unlabeled comparison slider is gone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Comparison Slider")).toHaveCount(0);
  await expect(page.locator("img-comparison-slider")).toHaveCount(0);
});

test("the unvalidated gallery is gone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Spectral Gallery")).toHaveCount(0);
  await expect(page.getByText("PIA")).toHaveCount(0);
});

test("the viewer requests its tiles under /tiles/", async ({ page }) => {
  const tile = page.waitForRequest((r) => r.url().includes("/tiles/andromeda-phat-phast-2025/"));
  await page.goto("/");
  expect((await tile).url()).toMatch(/\/tiles\/andromeda-phat-phast-2025\/\d+\/\d+\/\d+\.jpg$/);
  await expect(page.getByRole("heading", { level: 3 })).toHaveText(
    "Andromeda Galaxy (M31), Hubble PHAT+PHAST panorama"
  );
});
