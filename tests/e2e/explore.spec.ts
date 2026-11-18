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
  // Shown once on screen; the visually hidden live region may say it too.
  const shown = await page.evaluate(
    () =>
      [...document.querySelectorAll("body *")].filter(
        (el) => el.children.length === 0 && /\d\.\d×/.test(el.textContent ?? "") && el.getBoundingClientRect().width > 1,
      ).length,
  );
  expect(shown).toBe(1);
  await page.getByRole("group", { name: "View controls" }).getByRole("button", { name: "Reset view" }).click();
  await expect(readout(page)).toContainText("1.0×");
});

test("the overview keeps the image's aspect ratio", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  const box = (await page.getByTestId("overview-image").boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(42208 / 9870, 1);
});

test("an unknown slug answers 404 with a way back", async ({ page }) => {
  const response = await page.goto("/no-such-image/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nothing at these coordinates.");
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
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
  await expect(panel.getByRole("region", { name: "Caveats" }).getByRole("listitem")).toHaveText(manifest.caveats);
  const link = panel.getByRole("link", { name: /Source page/ });
  await expect(link).toHaveAttribute("href", source.pageUrl);
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(about).toBeFocused();
});

const centerX = async (page: Page) =>
  Number((await readout(page).locator("span").nth(1).textContent())!.replace(/\u202f/g, ""));

test("the keyboard zooms, pans and fits, and the zoom is announced once settled", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  const viewer = page.getByRole("application", {
    name: "Andromeda Galaxy (M31), Hubble PHAT+PHAST panorama image viewer. Use arrow keys to pan, plus and minus to zoom.",
  });
  await viewer.focus();
  await page.keyboard.press("+");
  await expect(readout(page)).toContainText("2.0×");
  await expect(page.locator("[aria-live=polite]")).toHaveText("Zoom 2.0×");
  await page.keyboard.press("+");
  await expect(readout(page)).toContainText("4.0×");
  await page.keyboard.press("-");
  await expect(readout(page)).toContainText("2.0×");

  // At 2x the view is 21 104 px across: an arrow pans 10 % of it, Shift+arrow 50 %.
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => centerX(page)).toBe(21104 + 2110);
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => centerX(page)).toBe(21104 + 2110 - 10552);
  await page.keyboard.press("0");
  await expect(readout(page)).toHaveText(/Center x\s*21\u202f104\s*y\s*4\u202f935\s*Zoom\s*1\.0×/);
});

test("a tile outage keeps the lower level and offers a retry after 10 failures", async ({ page }) => {
  const failed = new Set<string>();
  await page.route(/\/tiles\/andromeda-phat-phast-2025\/[3-6]\//, (route) => {
    failed.add(route.request().url());
    return route.abort();
  });
  await page.goto(PATH);
  await ready(page);
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  const toast = page.getByRole("status").filter({ hasText: "Some detail could not load." });
  await expect(toast).toBeVisible();
  await page.unroute(/\/tiles\/andromeda-phat-phast-2025\/[3-6]\//);
  // OpenSeadragon never asks again for a tile that failed, so only Retry can refetch one.
  const refetch = page.waitForRequest((request) => failed.has(request.url()), { timeout: 10_000 });
  await toast.getByRole("button", { name: "Retry" }).click();
  await refetch;
  await expect(toast).toHaveCount(0);
});

test("slow tiles show a progress line and, after 4 s, a note", async ({ page }) => {
  await page.route(/\/tiles\//, async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.continue().catch(() => {});
  });
  await page.goto(PATH);
  await expect(page.locator("main[data-loading]")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Still loading the detail. You can start moving around.", {
    timeout: 8000,
  });
});

test("when the viewer cannot load, a retry brings it back", async ({ page }) => {
  let block = true;
  await page.route(/\/_next\/static\/chunks\/.+\.js$/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (block && body.includes("Unable to load TileSource")) return route.abort();
    return route.fulfill({ response, body });
  });
  await page.goto(PATH);
  const alert = page.getByRole("alert").filter({ hasText: "could not load" });
  await expect(alert).toContainText("This image could not load. Check your connection and try again.");
  block = false;
  await alert.getByRole("button", { name: "Retry" }).click();
  await ready(page);
  await expect(alert).toHaveCount(0);
});

test.describe("phone, 390 px wide", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fits without horizontal overflow, with every control on screen", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    for (const name of ["Back to home", "Share this view", "Zoom in", "Zoom out", "Reset view", "About this image"]) {
      // The back link names the image it leaves: "Back to home from <title>".
      const target =
        name === "Back to home"
          ? page.getByRole("link", { name: /^Back to home from Andromeda Galaxy/ })
          : page.getByRole("button", { name, exact: true });
      const box = (await target.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeInViewport({ ratio: 1 });
  });

  test("the sheet holds the readout and overview, and its handle opens the details", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    const sheetTop = (await page.getByRole("button", { name: "About this image", exact: true }).boundingBox())!.y;
    expect((await readout(page).boundingBox())!.y).toBeGreaterThan(sheetTop);
    expect((await page.getByTestId("overview-image").boundingBox())!.y).toBeGreaterThan(sheetTop);
    await page.getByRole("button", { name: "About this image", exact: true }).tap();
    await expect(page.getByRole("region", { name: /Andromeda Galaxy/ })).toBeVisible();
    await page.getByRole("button", { name: "Close details" }).tap();
    await expect(page.getByRole("region", { name: /Andromeda Galaxy/ })).toBeHidden();
  });

  test("peek takes at most a quarter of the screen; About fills one surface under 85 %", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    // offsetHeight, not the box: a settling transform would skew it.
    const sheetHeight = () => page.getByTestId("sheet").evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(await sheetHeight()).toBeLessThanOrEqual(844 * 0.25);
    await page.getByRole("button", { name: "About this image", exact: true }).tap();
    await expect(page.getByRole("region", { name: /Andromeda Galaxy/ })).toBeVisible();
    expect(await sheetHeight()).toBeLessThanOrEqual(Math.ceil(844 * 0.85));
    await expect(page.getByTestId("overview-image")).toBeHidden();
    // One header and one close control on screen.
    await expect(page.getByText("About this image", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Close details" })).toHaveCount(1);
    // The long title is kept for screen readers only (1 px boxes); the top bar shows the short one.
    const shownTitles = await page.evaluate(() =>
      [...document.querySelectorAll("h1 *, h2")]
        .filter((el) => el.getBoundingClientRect().width > 1 && getComputedStyle(el).display !== "none")
        .map((el) => el.textContent),
    );
    expect(shownTitles).toEqual(["Andromeda Galaxy"]);
  });

  test("the full credit line stays visible in peek and min, and a tap on it opens About", async ({ page }) => {
    const source = JSON.parse(readFileSync("data/sources/andromeda-phat-phast-2025.json", "utf8"));
    await page.goto(PATH);
    await ready(page);
    const credit = page.getByRole("button", { name: source.credit, exact: true });
    await expect(credit).toBeInViewport({ ratio: 1 });
    expect(await credit.evaluate((el) => getComputedStyle(el).fontSize)).toBe("12px");
    await page.getByRole("button", { name: "Minimize the panel" }).tap();
    await expect(credit).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "Show overview" }).tap();
    await credit.tap();
    await expect(page.getByRole("region", { name: /Andromeda Galaxy/ })).toBeVisible();
  });

  test("on a phone only the zoom buttons dim when idle", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await expect(page.locator("main[data-idle]")).toHaveCount(1, { timeout: 8000 });
    const opacity = (loc: import("@playwright/test").Locator) => loc.evaluate((el) => getComputedStyle(el).opacity);
    await expect.poll(() => opacity(page.getByRole("group", { name: "View controls" }))).toBe("0.4");
    expect(await opacity(page.locator("header > div").first())).toBe("1");
    expect(await opacity(page.getByTestId("sheet"))).toBe("1");
  });

  test("dragging the sheet down minimizes it and dragging up brings it back", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    const handle = page.getByRole("button", { name: "About this image", exact: true });
    const box = (await handle.boundingBox())!;
    const drag = async (dy: number) => {
      await page.mouse.move(box.x + 20, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 20, box.y + 10 + dy / 2);
      await page.mouse.move(box.x + 20, box.y + 10 + dy);
      await page.mouse.up();
    };
    await drag(120);
    await expect(page.getByTestId("overview-image")).toBeHidden();
    await expect(readout(page)).toBeVisible();
    // The sheet eases back into place after the finger lifts.
    const show = page.getByRole("button", { name: "Show overview" });
    await expect(show).toBeInViewport({ ratio: 1 });
    await page.waitForFunction(() => !document.getAnimations().some((a) => a instanceof CSSTransition));
    const min = (await show.boundingBox())!;
    await page.mouse.move(min.x + 20, min.y + 10);
    await page.mouse.down();
    await page.mouse.move(min.x + 20, min.y - 50);
    await page.mouse.move(min.x + 20, min.y - 100);
    await page.mouse.up();
    await expect(page.getByTestId("overview-image")).toBeVisible();
  });

  test("the minimize button does what the drag does, without a gesture", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await page.getByRole("button", { name: "Minimize the panel" }).tap();
    await expect(page.getByTestId("overview-image")).toBeHidden();
    await page.getByRole("button", { name: "Show overview" }).tap();
    await expect(page.getByTestId("overview-image")).toBeVisible();
  });

  test("a double tap zooms in, so pinching is never required", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    const viewer = page.getByTestId("viewer");
    const box = (await viewer.boundingBox())!;
    await page.touchscreen.tap(box.width / 2, box.height / 2);
    await page.touchscreen.tap(box.width / 2, box.height / 2);
    await expect(readout(page)).not.toContainText("1.0×");
  });
});

test("in the light theme every overlay shares one glass, and the rulers are opaque", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(PATH);
  await ready(page);
  const bg = (testIdOrSelector: string) =>
    page.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).backgroundColor, testIdOrSelector);
  const bar = await bg("header > div");
  expect(bar).toBe("rgba(247, 246, 242, 0.86)");
  expect(await page.getByTestId("overview-image").evaluate((el) => getComputedStyle(el.closest("[class*=overview]")!).backgroundColor)).toBe(bar);
  expect(await bg('[role="group"][aria-label="View controls"]')).toBe(bar);
  expect(await readout(page).evaluate((el) => getComputedStyle(el).color)).toBe("rgb(17, 20, 26)");
  for (const canvas of await page.locator("canvas[class*=ruler]").all()) {
    expect(await canvas.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(247, 246, 242)");
  }
  // The image canvas stays dark.
  expect(await page.getByTestId("viewer").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(7, 9, 13)");
});

test("opening About dismisses the loading note, and no note sits over its controls", async ({ page }) => {
  await page.route(/\/tiles\//, async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.continue().catch(() => {});
  });
  await page.goto(PATH);
  const note = page.getByRole("status").filter({ hasText: "Still loading the detail." });
  await expect(note).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "About this image" }).click();
  await expect(note).toHaveCount(0);
  const close = page.getByRole("region", { name: /Andromeda Galaxy/ }).getByRole("button", { name: "Close details" });
  const box = (await close.boundingBox())!;
  const onTop = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(onTop).toBe("Close details");
});

test("after 5 s idle the chrome fades, rulers and zoom dim, and the credit stays", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await page.mouse.move(700, 450);
  const opacity = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).opacity);
  await page.waitForTimeout(4000);
  expect(await opacity("header > div")).toBe("1");
  await expect(page.locator("main[data-idle]")).toHaveCount(1, { timeout: 3000 });
  await expect.poll(() => opacity("header > div")).toBe("0");
  await expect.poll(() => opacity('[role="group"][aria-label="View controls"]')).toBe("0.4");
  expect(await page.getByText(/^NASA, ESA, Benjamin Williams/).first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await page.mouse.move(600, 400);
  await expect.poll(() => opacity("header > div")).toBe("1");
});

test("nothing fades while About is open", async ({ page }) => {
  await page.goto(PATH);
  await ready(page);
  await page.getByRole("button", { name: "About this image" }).click();
  await page.mouse.move(700, 450);
  await page.waitForTimeout(5800);
  await expect(page.locator("main[data-idle]")).toHaveCount(0);
  expect(await page.locator("header > div").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});
