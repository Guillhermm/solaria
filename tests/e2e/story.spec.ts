import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const journey = JSON.parse(readFileSync("data/journeys/andromeda.json", "utf8")) as {
  title: string;
  stops: { title: string; body: string; viewport: { x: number; y: number; z: number }; sources: { label: string; url: string }[] }[];
};
const source = JSON.parse(readFileSync("data/sources/andromeda-phat-phast-2025.json", "utf8"));
const PATH = "/andromeda/";
const COUNT = journey.stops.length;

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

const readout = (page: Page) => page.getByTestId("readout");
const card = (page: Page) => page.getByTestId("story").locator("[aria-current=step]");

const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// The camera has landed on the stop: the readout shows the stop's own view.
const atStop = async (page: Page, i: number) => {
  const { x, y, z } = journey.stops[i].viewport;
  await expect(readout(page)).toHaveText(new RegExp(`Center x\\s*${num(x)}\\s*y\\s*${num(y)}\\s*Zoom\\s*${z.toFixed(1)}×`), {
    timeout: 8000,
  });
};

test("the Journey runs from the first stop to Explore", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(journey.title);
  for (let i = 0; i < COUNT; i++) {
    const stop = journey.stops[i];
    await expect(card(page).getByRole("heading", { level: 2 })).toHaveText(`${String(i + 1).padStart(2, "0")}${stop.title}`);
    // The validated text, unaltered.
    await expect(card(page).locator("p")).toHaveText(stop.body.split(/\n\s*\n/));
    for (const s of stop.sources) {
      await expect(card(page).getByRole("link", { name: new RegExp(s.label) })).toHaveAttribute("href", s.url);
    }
    await expect(page.getByTestId("stop-count")).toHaveText(`Stop ${String(i + 1).padStart(2, "0")} / ${String(COUNT).padStart(2, "0")}`);
    await atStop(page, i);
    if (i > 0) await expect(page).toHaveURL(new RegExp(`\\?mode=story&stop=${i + 1}$`));
    if (i < COUNT - 1) await page.getByRole("button", { name: `Next: stop ${String(i + 2).padStart(2, "0")}` }).click();
  }
  await expect(page.locator("[aria-live=polite]")).toHaveText(`Stop ${COUNT} of ${COUNT}: ${journey.stops[COUNT - 1].title}`);
  await page.getByRole("button", { name: "Explore freely" }).click();
  await expect(page.getByTestId("story")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Explore", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "About this image" })).toBeVisible();
  await expect(page).toHaveURL(/\?mode=explore&x=\d+&y=\d+&z=[\d.]+$/);
  // Story picks up where it left.
  await page.getByRole("button", { name: "Story" }).click();
  await expect(page).toHaveURL(new RegExp(`\\?mode=story&stop=${COUNT}$`));
  await expect(card(page)).toContainText(journey.stops[COUNT - 1].title);
});

test("a link to a stop opens on that stop, and Previous goes back", async ({ page }) => {
  await page.goto(`${PATH}?mode=story&stop=4`);
  await ready(page);
  await atStop(page, 3);
  await expect(page.getByTestId("marks").locator("[data-current]")).toContainText("Stop 04");
  await page.getByRole("button", { name: "Previous stop" }).click();
  await expect(page).toHaveURL(/\?mode=story&stop=3$/);
  await atStop(page, 2);
});

test("the keyboard and the strip move through stops", async ({ page }) => {
  await page.goto(`${PATH}?mode=story&stop=2`);
  await ready(page);
  await page.getByTestId("story").getByRole("heading", { level: 2 }).click();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/stop=3$/);
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/stop=4$/);
  await page.keyboard.press("k");
  await expect(page).toHaveURL(/stop=3$/);
  // Also from the image itself.
  await page.getByRole("application").focus();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/stop=4$/);
  await page.getByRole("button", { name: `Go to stop 5: ${journey.stops[4].title}` }).click();
  await expect(page).toHaveURL(/stop=5$/);
  await atStop(page, 4);
});

test("the keyboard focus ring is drawn above the tiles, inside the visible image", async ({ page }) => {
  await page.goto(`${PATH}?mode=story&stop=2`);
  await ready(page);
  const viewer = page.getByRole("application");
  await viewer.focus();
  const ring = await viewer.evaluate((el) => {
    const after = getComputedStyle(el, "::after");
    const column = document.querySelector('[data-testid="story"]')!.parentElement!.getBoundingClientRect();
    return { display: after.display, z: after.zIndex, border: after.borderTopWidth, left: parseFloat(after.left), column: column.right };
  });
  expect(ring.display).toBe("block");
  expect(ring.z).toBe("1");
  expect(ring.border).toBe("2px");
  // It starts right of the column and its ruler, so all four sides show.
  expect(ring.left).toBeGreaterThan(ring.column);
  await page.getByRole("button", { name: "Next: stop 03" }).focus();
  expect(await viewer.evaluate((el) => getComputedStyle(el, "::after").display)).toBe("none");
});

test("touching the image pauses the story and the pill resumes it", async ({ page }) => {
  await page.goto(`${PATH}?mode=story&stop=3`);
  await ready(page);
  await atStop(page, 2);
  const box = (await page.getByTestId("viewer").boundingBox())!;
  const x = box.x + box.width * 0.7;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 200, y - 80, { steps: 8 });
  await page.mouse.up();
  const pill = page.getByRole("button", { name: `Stop 3 of ${COUNT}, back to the story` });
  await expect(pill).toBeVisible();
  // The story waits; the URL still holds the stop.
  await expect(page).toHaveURL(/stop=3$/);
  await pill.click();
  await expect(pill).toHaveCount(0);
  await atStop(page, 2);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("stops are reached by a cut, never a flight", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await atStop(page, 0);
    // Record every zoom the readout shows while the camera moves to the next stop.
    await page.evaluate(() => {
      const seen = new Set<string>();
      (window as unknown as { zooms: Set<string> }).zooms = seen;
      const el = document.querySelector('[data-testid="readout"] span:last-child')!;
      new MutationObserver(() => seen.add(el.textContent ?? "")).observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.getByRole("button", { name: "Next: stop 02" }).click();
    await atStop(page, 1);
    await page.waitForTimeout(500);
    const zooms = await page.evaluate(() => [...(window as unknown as { zooms: Set<string> }).zooms]);
    expect(zooms).toEqual([`${journey.stops[1].viewport.z.toFixed(1)}×`]);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  const creditVisible = async (page: Page) => {
    const credit = page.getByRole("button", { name: source.credit });
    await expect(credit).toBeVisible();
    const box = (await credit.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  };

  test("the stop card is a bottom sheet over the credit, through the whole Journey", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    // Zoom stays on gestures in Story; its buttons would crowd the reticle's tag.
    await expect(page.getByRole("group", { name: "View controls" })).toBeHidden();
    for (let i = 0; i < COUNT; i++) {
      await expect(card(page)).toContainText(journey.stops[i].title);
      await creditVisible(page);
      const sheet = (await page.getByTestId("sheet").boundingBox())!;
      expect(sheet.height).toBeLessThanOrEqual(844 / 2 + 1);
      if (i < COUNT - 1) await page.getByRole("button", { name: `Next: stop ${String(i + 2).padStart(2, "0")}` }).tap();
    }
    await page.getByRole("button", { name: "Explore freely" }).tap();
    await expect(page.getByTestId("story")).toHaveCount(0);
    await creditVisible(page);
  });

  test("a gesture on the image folds the sheet to the pill and keeps the credit", async ({ page }) => {
    await page.goto(`${PATH}?mode=story&stop=2`);
    await ready(page);
    // A phone frames the stop above the sheet, so the image edge may move the center; the zoom holds.
    await expect(readout(page)).toContainText(`${journey.stops[1].viewport.z.toFixed(1)}×`);
    await page.getByTestId("viewer").tap({ position: { x: 195, y: 200 } });
    const pill = page.getByRole("button", { name: `Stop 2 of ${COUNT}, back to the story` });
    await expect(pill).toBeVisible();
    await expect(page.getByTestId("story")).toBeHidden();
    await creditVisible(page);
    await pill.tap();
    await expect(page.getByTestId("story")).toBeVisible();
  });
});
