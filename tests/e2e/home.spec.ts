import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // No live network: only the local server may answer.
  await page.route(/^(?!http:\/\/127\.0\.0\.1)/, (route) => route.abort());
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
