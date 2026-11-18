import { expect, test } from "@playwright/test";

test("robots.txt and sitemap.xml are served, and a viewer page heads with its canonical and card image", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap: https://solaria.zenus.systems/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<loc>https://solaria.zenus.systems/andromeda/</loc>");
  // The end-to-end build carries the mock pages; the sitemap still leaves them out.
  expect(xml).not.toContain("mock-");

  await page.goto("/andromeda-phat-phast-2025/?mode=explore&x=1000&y=500&z=4");
  const head = page.locator("head");
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://solaria.zenus.systems/andromeda-phat-phast-2025/");
  await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://solaria.zenus.systems/tiles/andromeda-phat-phast-2025/thumbnail.jpg",
  );
});

test("the built Home head carries the Search Console verification tag", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toContain('<meta name="google-site-verification" content="rkg6DyBZ44QyNpVlFY7fIc9RAp6hZkBTdyDLKzNcZQI"/>');
});
