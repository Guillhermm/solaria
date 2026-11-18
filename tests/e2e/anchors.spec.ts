import { expect, test, type Locator, type Page } from "@playwright/test";

// The clear space between the sticky header's bottom edge and a heading reached by an anchor
// (--anchor-gap, 1.5rem).
const GAP = 24;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

// Samples scrollY on every frame from now on, to tell an animated scroll from a jump.
const recordScroll = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { scrollSamples: number[] };
    w.scrollSamples = [scrollY];
    const tick = () => {
      w.scrollSamples.push(scrollY);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const samples = (page: Page) => page.evaluate(() => (window as unknown as { scrollSamples: number[] }).scrollSamples);

const settled = async (page: Page) => {
  await expect
    .poll(async () => {
      const a = await page.evaluate(() => scrollY);
      await page.waitForTimeout(250);
      return (await page.evaluate(() => scrollY)) === a;
    })
    .toBe(true);
};

const expectBelowHeader = async (page: Page, heading: Locator) => {
  await settled(page);
  const header = (await page.locator("body > header").boundingBox())!;
  const box = (await heading.boundingBox())!;
  // The header stays on screen, and the heading rests below it with the gap, not under it.
  expect(header.y).toBe(0);
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height + GAP - 1);
  expect(box.y).toBeLessThanOrEqual(header.y + header.height + GAP + 1);
  await expect(heading).toBeInViewport();
  await expect(heading).toBeFocused();
  // Focus moved without pulling the page back.
  const y = await page.evaluate(() => scrollY);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(y);
};

const journeysLink = (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Journeys" });
const journeysHeading = (page: Page) => page.getByRole("heading", { name: "Journeys", level: 2, exact: true });

for (const { width, height } of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test("Journeys in the header lands its heading below the header on Home", async ({ page }) => {
      await page.goto("/");
      await journeysLink(page).click();
      await expect(page).toHaveURL(/\/#journeys$/);
      await expectBelowHeader(page, journeysHeading(page));
    });

    test("Journeys in the header lands its heading below the header from About", async ({ page }) => {
      await page.goto("/about/");
      await journeysLink(page).click();
      await expect(page).toHaveURL(/\/#journeys$/);
      await expectBelowHeader(page, journeysHeading(page));
    });

    test("footer anchors land About's headings below the header, from Home and on About", async ({ page }) => {
      const footer = page.getByRole("navigation", { name: "Footer" });
      await page.goto("/");
      await footer.getByRole("link", { name: "Sources and credits" }).click();
      await expect(page).toHaveURL(/\/about\/#credits$/);
      await expectBelowHeader(page, page.getByRole("heading", { name: "Credits and terms", level: 2 }));
      await footer.getByRole("link", { name: "Accessibility" }).click();
      await expect(page).toHaveURL(/\/about\/#accessibility$/);
      await expectBelowHeader(page, page.getByRole("heading", { name: "Accessibility", level: 2 }));
    });
  });
}

test("the scroll to an anchor animates when motion is allowed, from Home and from About", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const start of ["/", "/about/"]) {
    await page.goto(start);
    await recordScroll(page);
    await journeysLink(page).click();
    await expect(page).toHaveURL(/\/#journeys$/);
    await page.waitForTimeout(100);
    const mid = await page.evaluate(() => scrollY);
    await settled(page);
    const end = await page.evaluate(() => scrollY);
    expect(end).toBeGreaterThan(0);
    expect(mid).toBeLessThan(end);
    expect((await samples(page)).filter((y) => y > 0 && y < end).length).toBeGreaterThan(1);
  }
});

test("the scroll to an anchor is instant under reduced motion, from Home and from About", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const start of ["/", "/about/"]) {
    await page.goto(start);
    await recordScroll(page);
    await journeysLink(page).click();
    await expect(page).toHaveURL(/\/#journeys$/);
    await settled(page);
    const end = await page.evaluate(() => scrollY);
    expect(end).toBeGreaterThan(0);
    // Next navigates client side, so the sampler outlives About and sees Home's frames too.
    expect((await samples(page)).filter((y) => y > 0 && y < end)).toEqual([]);
    await expect(journeysHeading(page)).toBeFocused();
  }
});
