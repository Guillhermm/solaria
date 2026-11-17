import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Kiosk mode (F-01), design.md 14.1 and 14.3. K-rules hold at 1440x900 and 390x844 in the
// dark theme; time runs on Playwright's clock.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const andromeda = read("data/journeys/andromeda.json");
const sun = read("data/journeys/sun.json");
const COPY = "Still exploring? Returning to the start in 10 s.";

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

interface B {
  x: number;
  y: number;
  width: number;
  height: number;
}
const hits = (a: B, b: B) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};
// From here on the page's time moves only when the test runs the clock.
const freeze = async (page: Page) => page.clock.pauseAt((await page.evaluate(() => Date.now())) + 250);
const chip = (page: Page) => page.getByTestId("kiosk-chip");
const countdown = (page: Page) => page.getByTestId("kiosk-countdown");
const stopParam = (page: Page) => new URL(page.url()).searchParams.get("stop");

// Leaves the attract loop with a key nobody maps, so kiosk stays on and the page is left alone.
const stopAttract = async (page: Page) => {
  await expect(chip(page)).toBeVisible();
  await page.keyboard.press("Shift");
  await expect(chip(page)).toHaveCount(0);
};

// S3 for kiosk overlays: the boxes of every control group they must stay clear of.
const controls = (page: Page) =>
  page.evaluate(() =>
    [
      "main > header > *",
      "[role=group][aria-label='View controls']",
      "[data-testid=overview]",
      "[data-testid=readout]",
      "[data-testid=light-bar]",
      "[data-testid=sheet-grip]",
    ]
      .flatMap((q) => [...document.querySelectorAll(q)])
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
  );

// The highest top edge among the bottom overlays (sheet, light bar, controls) in the lower half.
const bottomLine = (page: Page) =>
  page.evaluate(() => {
    const tops = ["[data-testid=sheet]", "[data-testid=light-bar]", "[role=group][aria-label='View controls']"]
      .flatMap((q) => [...document.querySelectorAll(q)])
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0 && r.y + r.height > innerHeight / 2)
      .map((r) => r.y);
    return Math.min(innerHeight, ...tops);
  });

const assertDocked = async (page: Page, el: ReturnType<typeof chip>) => {
  const box = (await el.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height - ((await bottomLine(page)) - 12))).toBeLessThanOrEqual(1);
  expect(box.x).toBeGreaterThanOrEqual(11);
  expect(vp.width - box.x - box.width).toBeGreaterThanOrEqual(11);
  for (const c of await controls(page)) expect(hits(box, c)).toBe(false);
  const credit = await page.evaluate(() =>
    [...document.querySelectorAll("[data-testid=credit], [data-testid=sheet-credit], [data-testid=light-bar] ul[aria-label=Credits], footer")]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0)
      .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
  );
  for (const c of credit) expect(hits(box, c), "the credit stays uncovered").toBe(false);
};

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, colorScheme: "dark" });

    test("K1, K2: ?kiosk=1 sticks through reloads, forces dark and drops the theme switch; ?kiosk=0 ends it", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("theme", "light"));
      await page.goto("/?kiosk=1");
      await expect(page.locator("html[data-kiosk]")).toHaveCount(1);
      const ground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ground").trim().toLowerCase());
      expect(ground).toBe("#07090d");
      await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toHaveCount(0);
      await page.goto("/about/");
      await expect(page.locator("html[data-kiosk]")).toHaveCount(1);
      await page.reload();
      await expect(page.locator("html[data-kiosk]")).toHaveCount(1);
      await page.goto("/about/?kiosk=0");
      await expect(page.locator("html[data-kiosk]")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toHaveCount(1);
    });

    test("K3, K4: no link leaves the app, and Share and Fullscreen are gone", async ({ page }) => {
      await page.goto("/?kiosk=1");
      await stopAttract(page);
      for (const path of ["/", "/about/", `/${andromeda.slug}/`, `/${sun.slug}/`, "/andromeda-phat-phast-2025/"]) {
        await page.goto(path);
        if (path !== "/" && path !== "/about/") await ready(page);
        const out = await page.evaluate(() =>
          [...document.querySelectorAll("a[href]")]
            .map((a) => a as HTMLAnchorElement)
            .filter((a) => new URL(a.href, location.href).origin !== location.origin || a.target === "_blank" || /^(mailto|tel):/.test(a.getAttribute("href")!))
            .map((a) => a.href),
        );
        expect(out, path).toEqual([]);
      }
      await expect(page.getByRole("button", { name: "Share this view" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Fullscreen/ })).toHaveCount(0);
    });

    test("K5 to K7: the attract loop dwells 8 s per stop with card, credit and marker, under the chip", async ({ page }) => {
      // Two flights run frame by frame on the test's clock.
      test.slow();
      await page.clock.install();
      await page.goto("/?kiosk=1");
      await expect(chip(page)).toHaveText("Touch to explore");
      await page.clock.runFor(8_200);
      await expect(page).toHaveURL(new RegExp(`/${andromeda.slug}/\\?mode=story&stop=1`));
      await ready(page);
      await expect(page.getByTestId("story").locator("[aria-current=step]")).toBeVisible();
      await expect(page.locator("[data-testid=credit]:visible, [data-testid=sheet-credit]:visible")).toHaveCount(1);
      // Run the clock until stop 2 takes over, then hold it: from here time moves only on demand.
      for (let i = 0; i < 40 && stopParam(page) === "1"; i++) await page.clock.runFor(500);
      expect(stopParam(page)).toBe("2");
      await freeze(page);
      // Stop 2 flies (1.2 to 1.8 s), lands, then dwells 8 s with its reticle and card on screen.
      await page.clock.runFor(2_000);
      await expect(page.locator("[data-testid=marks] [class*=marker][data-current]")).toBeVisible();
      await page.clock.runFor(6_500);
      expect(stopParam(page)).toBe("2");
      await expect(page.getByTestId("story").locator("[aria-current=step]")).toBeVisible();
      await expect(page.locator("[data-testid=marks] [class*=marker][data-current]")).toBeVisible();
      await page.clock.runFor(2_000);
      expect(stopParam(page)).toBe("3");
      // Layout checks wait for animation frames, so time runs again.
      await page.clock.resume();
      const box = (await chip(page).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(56);
      expect(await chip(page).evaluate((el) => getComputedStyle(el).fontSize)).toBe("18px");
      await assertDocked(page, chip(page));
      const pulse = await chip(page).evaluate((el) =>
        el.getAnimations().map((a) => ({ duration: (a.effect as KeyframeEffect).getComputedTiming().duration, frames: (a.effect as KeyframeEffect).getKeyframes().map((k) => Number(k.opacity)) })),
      );
      expect(pulse).toContainEqual({ duration: 2000, frames: [0.7, 1] });
    });

    test("K5: after the last stop the loop goes on to the next Journey, and from the last back to the first", async ({ page }) => {
      await page.clock.install();
      await page.goto(`/${andromeda.slug}/?mode=story&stop=${andromeda.stops.length}&kiosk=1`);
      await ready(page);
      await page.clock.runFor(8_500);
      await expect(page).toHaveURL(new RegExp(`/${sun.slug}/\\?mode=story&stop=1`));
      await page.goto(`/${sun.slug}/?mode=story&stop=${sun.stops.length}&kiosk=1`);
      await ready(page);
      await page.clock.runFor(8_500);
      await expect(page).toHaveURL(new RegExp(`/${andromeda.slug}/\\?mode=story&stop=1`));
    });

    test("K7: under reduced motion the chip does not pulse", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/?kiosk=1");
      await expect(chip(page)).toBeVisible();
      expect(await chip(page).evaluate((el) => el.getAnimations().length)).toBe(0);
    });

    test("K8: the first touch stops the loop where it is and does nothing else", async ({ page }) => {
      await page.clock.install();
      await page.goto(`/${andromeda.slug}/?mode=story&stop=1&kiosk=1`);
      await ready(page);
      const next = page.getByRole("button", { name: /^Next/ }).filter({ visible: true }).first();
      await next.click();
      await expect(chip(page)).toHaveCount(0);
      expect(stopParam(page)).toBe("1");
      // Now it is the visitor's: the same button works, and the loop stays stopped.
      await next.click();
      await expect.poll(() => stopParam(page)).toBe("2");
      await page.clock.runFor(20_000);
      expect(stopParam(page)).toBe("2");
      await expect(page.locator("main[data-mode=story]")).toHaveCount(1);
    });

    test("K8: a key also stops the loop without acting", async ({ page }) => {
      await page.goto(`/${andromeda.slug}/?mode=story&stop=1&kiosk=1`);
      await ready(page);
      await page.keyboard.press("j");
      await expect(chip(page)).toHaveCount(0);
      expect(stopParam(page)).toBe("1");
    });

    test("K9, K11: targets of 3.5rem with 8px between them, body text of 1.125rem, no long-press menu", async ({ page }) => {
      await page.goto("/?kiosk=1");
      await stopAttract(page);
      for (const path of ["/", `/${andromeda.slug}/`, `/${sun.slug}/`]) {
        await page.goto(path);
        if (path !== "/") await ready(page);
        const bad = await page.evaluate(() => {
          // A target is what a finger can reach: on screen, its center not covered or scrolled
          // away. The image itself (role=application) is the surface under every target.
          const shown = (el: Element) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            if (r.width === 0 || r.height === 0 || s.visibility === "hidden" || el.closest("[inert], [aria-hidden=true]")) return false;
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            if (y < 0 || y > innerHeight) return true;
            const hit = document.elementFromPoint(x, y);
            return !!hit && (hit === el || el.contains(hit));
          };
          const els = [...document.querySelectorAll("a[href], button, input, select, textarea, [role=slider], [tabindex]:not([tabindex='-1'])")]
            .filter((el) => el.getAttribute("role") !== "application")
            .filter(shown);
          const boxes = els.map((el) => ({ el, r: el.getBoundingClientRect() }));
          const name = (el: Element) => el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30) ?? el.tagName;
          const small = boxes.filter(({ r }) => r.width < 55.5 || r.height < 55.5).map(({ el, r }) => `${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
          const close: string[] = [];
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i];
              const b = boxes[j];
              if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
              const gx = Math.max(a.r.left - b.r.right, b.r.left - a.r.right);
              const gy = Math.max(a.r.top - b.r.bottom, b.r.top - a.r.bottom);
              if (Math.max(gx, gy) < 7.5) close.push(`${name(a.el)} / ${name(b.el)}`);
            }
          const body = [...document.querySelectorAll("[data-testid=story] [aria-current=step] p, main p[class*=promise], main p[class*=summary]")]
            .filter(shown)
            .map((p) => parseFloat(getComputedStyle(p).fontSize))
            .filter((size) => size < 18);
          return { small, close, body };
        });
        expect(bad.small, `${path}: targets under 56px`).toEqual([]);
        expect(bad.close, `${path}: targets closer than 8px`).toEqual([]);
        expect(bad.body, `${path}: body text under 1.125rem`).toEqual([]);
        const menu = await page.evaluate(() => {
          const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
          document.querySelector("main")!.dispatchEvent(e);
          return e.defaultPrevented;
        });
        expect(menu).toBe(true);
        expect(await page.locator("main").evaluate((el) => getComputedStyle(el).userSelect)).toBe("none");
      }
      const text = page.getByTestId("story").locator("[aria-current=step] p").first();
      expect(await text.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe("none");
    });

    test("K10: on Home a tap aims the lens instead of leaving", async ({ page }) => {
      // At phone width the strip's stops are too close for K9 targets and only show (design.md 14.3, as built).
      test.skip(viewport.width < 768, "strip stops are not targets on a phone-wide kiosk");
      await page.goto("/?kiosk=1");
      await stopAttract(page);
      const mark = page.getByRole("link", { name: /^Open stop/ }).last();
      await mark.click();
      await expect(mark).toHaveAttribute("data-current", "true");
      await expect(page).toHaveURL(/\/(\?kiosk=1)?$/);
    });

    test("K13, S3: in Light the countdown clears the bars and the zoom buttons", async ({ page }) => {
      await page.clock.install();
      await page.goto("/sun-sdo-2024-05-10-aia-94/?mode=light&kiosk=1");
      await ready(page);
      await stopAttract(page);
      await page.clock.runFor(90_200);
      await expect(countdown(page)).toBeVisible();
      await assertDocked(page, countdown(page));
    });

    test("K12 to K14: 90 s idle opens the countdown; Keep exploring restarts it; at 0 the app starts over", async ({ page }) => {
      await page.clock.install();
      await page.goto(`/andromeda-phat-phast-2025/?kiosk=1`);
      await ready(page);
      await stopAttract(page);
      await page.getByRole("button", { name: "Feature labels" }).click();
      await page.clock.runFor(89_000);
      await expect(countdown(page)).toHaveCount(0);
      await page.clock.runFor(1_200);
      await expect(countdown(page)).toBeVisible();
      await expect(countdown(page).locator("p").first()).toHaveText(COPY);
      await expect(page.getByTestId("kiosk-live")).toHaveText(COPY);
      const keep = countdown(page).getByRole("button", { name: "Keep exploring" });
      await expect(keep).toBeFocused();
      expect((await keep.boundingBox())!.height).toBeGreaterThanOrEqual(56);
      await assertDocked(page, countdown(page));
      await page.clock.runFor(1_000);
      await expect(countdown(page).locator("p").first()).toHaveText("Still exploring? Returning to the start in 9 s.");
      // The button itself (a mouse would close the sheet on its way there: any movement does).
      await keep.dispatchEvent("click");
      await expect(countdown(page)).toHaveCount(0);
      await page.clock.runFor(89_000);
      await expect(countdown(page)).toHaveCount(0);
      await page.clock.runFor(1_200);
      await expect(countdown(page)).toBeVisible();
      // Any input closes it too.
      await page.mouse.move(10, 400);
      await page.mouse.move(20, 410);
      await expect(countdown(page)).toHaveCount(0);
      await page.clock.runFor(90_200);
      await expect(countdown(page)).toBeVisible();
      await page.clock.runFor(10_500);
      await expect(page).toHaveURL(/\/\?kiosk=1$/);
      await expect(chip(page)).toBeVisible();
      await expect(page.getByTestId("kiosk-live")).toHaveText("Returning to the start.");
      await expect(page.getByRole("button", { name: "Feature labels" })).toHaveCount(0);
      await page.clock.runFor(8_200);
      await expect(page).toHaveURL(new RegExp(`/${andromeda.slug}/\\?mode=story&stop=1`));
    });
  });
}

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("K13: a tap on Keep exploring reaches the button, not what lies beneath, and restarts the timer", async ({ page }) => {
    await page.clock.install();
    await page.goto(`/andromeda-phat-phast-2025/?kiosk=1`);
    await ready(page);
    await stopAttract(page);
    await page.clock.runFor(90_200);
    await expect(countdown(page)).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { clicks: string[] };
      w.clicks = [];
      window.addEventListener("click", (e) => w.clicks.push((e.target as Element).closest("button")?.textContent ?? (e.target as Element).tagName), true);
    });
    await countdown(page).getByRole("button", { name: "Keep exploring" }).tap();
    await expect(countdown(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { clicks: string[] }).clicks)).toEqual(["Keep exploring"]);
    await page.clock.runFor(89_000);
    await expect(countdown(page)).toHaveCount(0);
    await page.clock.runFor(1_200);
    await expect(countdown(page)).toBeVisible();
  });
});
