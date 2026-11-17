import { expect, test } from "@playwright/test";

test("the head links the manifest, every icon and the theme color, and each URL is served", async ({ page, request }) => {
  await page.goto("/");
  const head = page.locator("head");
  await expect(head.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#07090d");
  const hrefs = async (selector: string) => head.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute("href")!));

  const manifestHref = await hrefs('link[rel="manifest"]');
  expect(manifestHref).toEqual(["/manifest.webmanifest"]);
  const icons = await hrefs('link[rel="icon"]');
  expect(icons.some((h) => h.startsWith("/favicon.ico"))).toBe(true);
  expect(icons.some((h) => h.startsWith("/icon.svg"))).toBe(true);
  const apple = await hrefs('link[rel="apple-touch-icon"]');
  expect(apple).toHaveLength(1);

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.id).toBe("/");
  const urls = [...icons, ...apple, ...manifest.icons.map((i: { src: string }) => i.src)];
  for (const url of urls) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()["content-type"], url).toMatch(/^image\//);
  }
});
