import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Detail of the week (F-02), design.md 15.3, in the four cells.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const pool: { kind: string; journey: string; stop: string; body?: string; caveat?: string }[] = read("data/weekly.json");
const journeys: Record<string, { slug: string; title: string; stops: { id: string; title: string; body: string }[] }> = {
  andromeda: read("data/journeys/andromeda.json"),
  sun: read("data/journeys/sun.json"),
};

const CELLS = [
  { width: 390, height: 844, scheme: "dark" },
  { width: 390, height: 844, scheme: "light" },
  { width: 1440, height: 900, scheme: "dark" },
  { width: 1440, height: 900, scheme: "light" },
] as const;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const card = (page: Page) => page.getByRole("region", { name: "Detail of the week" });

// The item the card should show, from its own "Week n" eyebrow and the pool (W3).
const expected = async (page: Page) => {
  const week = Number((await card(page).getByTestId("weekly-week").textContent())!.replace("Week ", ""));
  const item = pool[(week - 1) % pool.length];
  const journey = journeys[item.journey];
  const index = journey.stops.findIndex((s) => s.id === item.stop);
  return { week, item, journey, index, stop: journey.stops[index] };
};

for (const cell of CELLS) {
  const phone = cell.width < 768;
  test.describe(`${cell.width}x${cell.height} ${cell.scheme}`, () => {
    test.use({ viewport: { width: cell.width, height: cell.height }, colorScheme: cell.scheme });

    test("W5: its own section between the Journeys and the instrument key, on the gutter", async ({ page }) => {
      await page.goto("/");
      const order = await page.evaluate(() => [...document.querySelectorAll("main section > h2")].map((h) => h.textContent));
      const at = order.indexOf("Detail of the week");
      expect(at).toBeGreaterThan(0);
      expect(order[at - 1]).toBe("Journeys");
      expect(order[at + 1]).toBe("Reading the instrument");
      const gutter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gutter")) * 16);
      const h2 = (await card(page).getByRole("heading", { level: 2 }).boundingBox())!;
      expect(Math.abs(h2.x - gutter)).toBeLessThanOrEqual(1);
    });

    test("W6: a square crop, beside the text from 48rem and above it on a phone", async ({ page }) => {
      // No tile loads: the crop holds its square on its own (S7).
      await page.route(/\/tiles\/.+\/\d+\/\d+\/\d+\.jpg$/, (r) => r.abort());
      await page.goto("/");
      const crop = (await card(page).getByTestId("weekly-crop").boundingBox())!;
      const text = (await card(page).getByTestId("weekly-text").boundingBox())!;
      const h2 = (await card(page).getByRole("heading", { level: 2 }).boundingBox())!;
      expect(Math.abs(crop.width - crop.height)).toBeLessThanOrEqual(1);
      if (phone) {
        expect(crop.width).toBeCloseTo(358, 0);
        expect(crop.y).toBeGreaterThan(h2.y + h2.height - 1);
        expect(text.y).toBeGreaterThanOrEqual(crop.y + crop.height - 1);
      } else {
        expect(crop.width).toBeCloseTo(340, 0);
        expect(text.x - (crop.x + crop.width)).toBeCloseTo(40, 0);
        const ch = await card(page).getByTestId("weekly-text").evaluate((el) => {
          const probe = document.createElement("span");
          probe.style.cssText = "position:absolute;width:42ch";
          el.append(probe);
          const w = probe.getBoundingClientRect().width;
          probe.remove();
          return w;
        });
        expect(text.width).toBeLessThanOrEqual(ch + 1);
      }
    });

    test("W7, W8, W11, W13: the text column, readout, credit and link come from the data", async ({ page }) => {
      await page.goto("/");
      const { week, item, journey, index, stop } = await expected(page);
      const c = card(page);
      await expect(c.getByTestId("weekly-week")).toHaveText(`Week ${week}`);
      const title = c.getByRole("heading", { level: 3 });
      await expect(title).toHaveText(stop.title);
      await expect(c.getByTestId("weekly-context")).toHaveText(`${journey.title} · Stop ${index + 1} of ${journey.stops.length}`);
      const body = (item.body ?? stop.body).split(/\n\s*\n/).map((p) => p.trim());
      await expect(c.getByTestId("weekly-body")).toHaveText(body);
      if (item.caveat) await expect(c.getByTestId("weekly-caveat")).toHaveText(item.caveat);
      else await expect(c.getByTestId("weekly-caveat")).toHaveCount(0);
      const order = await c.getByTestId("weekly-text").evaluate((el) => [...el.children].map((x) => x.getAttribute("data-testid") ?? x.tagName));
      expect(order).toEqual(["weekly-week", "H3", "weekly-context", "weekly-body", ...(item.caveat ? ["weekly-caveat"] : []), "weekly-go"]);
      await expect(c.getByTestId("weekly-readout")).toContainText(/Zoom\s*\d+\.\d×/);
      await expect(c.getByTestId("weekly-readout")).toContainText("Center x");
      const credit = c.getByTestId("weekly-credit");
      expect(await credit.evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).textOverflow !== "ellipsis")).toBe(true);
      const go = c.getByRole("link", { name: "Go to this detail" });
      await expect(go).toHaveAttribute("href", `/${journey.slug}/?mode=story&stop=${index + 1}`);
      await expect(go).toHaveAttribute("aria-describedby", (await title.getAttribute("id"))!);
      expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(c.getByRole("link")).toHaveCount(1);
    });

    test("W9, W10, W12: tiles from the pyramid on a dark canvas with rulers and a bracket", async ({ page }) => {
      await page.goto("/");
      const { stop } = await expected(page);
      const crop = card(page).getByTestId("weekly-crop");
      await expect(crop).toHaveAttribute("role", "img");
      const imageTitle = await crop.getAttribute("data-image-title");
      await expect(crop).toHaveAccessibleName(`${stop.title}, a detail of ${imageTitle}`);
      expect(await crop.evaluate((el) => el.matches(":focus-within") || (el as HTMLElement).tabIndex >= 0)).toBe(false);
      const tiles = crop.locator("img");
      const n = await tiles.count();
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(16);
      for (let i = 0; i < n; i++) {
        const t = tiles.nth(i);
        await expect(t).toHaveAttribute("loading", "lazy");
        await expect(t).toHaveAttribute("decoding", "async");
        await expect(t).toHaveAttribute("width", /\d+/);
        await expect(t).toHaveAttribute("height", /\d+/);
        expect(await t.getAttribute("src")).toMatch(/\/tiles\/.+\/\d+\/\d+\/\d+\.jpg$/);
      }
      expect(await card(page).getByTestId("weekly-canvas").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(7, 9, 13)");
      await expect(card(page).getByTestId("weekly-ruler-top")).toHaveCount(1);
      await expect(card(page).getByTestId("weekly-ruler-left")).toHaveCount(1);
      await expect(card(page).locator("[data-mark=bracket]")).toHaveCount(1);
    });

    test("W12: a tile that fails leaves the dark canvas", async ({ page }) => {
      await page.route(/\/tiles\/.+\/\d+\/\d+\/\d+\.jpg$/, (r) => r.abort());
      await page.goto("/");
      const crop = card(page).getByTestId("weekly-crop");
      await crop.scrollIntoViewIfNeeded();
      await expect.poll(() => crop.locator("img:visible").count()).toBe(0);
    });

    test("W14 and S4: the link's ring and its hover underline", async ({ page }) => {
      await page.goto("/");
      const go = card(page).getByRole("link", { name: "Go to this detail" });
      await go.focus();
      const s = await go.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth, offset: getComputedStyle(el).outlineOffset, transition: getComputedStyle(el).transitionDuration }));
      expect(s).toMatchObject({ style: "solid", width: "2px", offset: "2px" });
      expect(s.transition).toContain("0.12s");
      const underline = () => go.evaluate((el) => getComputedStyle(el).textDecorationColor);
      expect(await underline()).toBe("rgba(0, 0, 0, 0)");
      await go.hover();
      await expect.poll(underline).not.toBe("rgba(0, 0, 0, 0)");
    });

    test("S7: Home does not shift until a second after the crop scrolls into view", async ({ page }) => {
      await page.goto("/", { waitUntil: "load" });
      await page.evaluate(() => {
        (window as unknown as { cls: number }).cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!e.hadRecentInput) (window as unknown as { cls: number }).cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await card(page).getByTestId("weekly-crop").evaluate((el) => el.scrollIntoView());
      await page.waitForTimeout(1000);
      expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBe(0);
    });
  });
}
