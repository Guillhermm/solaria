import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const theme = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);

const ground = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("follows a dark system setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await theme(page)).toBe("dark");
  expect(await ground(page)).toBe("rgb(7, 9, 13)");
});

test("follows a light system setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await theme(page)).toBe("light");
  expect(await ground(page)).toBe("rgb(247, 246, 242)");
});

test("the toggle switches the theme and the choice survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  expect(await theme(page)).toBe("light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  await page.reload();
  expect(await theme(page)).toBe("light");
});

test("the fonts are self-hosted", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "font") fonts.push(new URL(r.url()).pathname);
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  for (const path of fonts) expect(path).toMatch(/^\/_next\/static\/media\/.+\.woff2$/);
});
