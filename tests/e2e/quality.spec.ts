import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L-05: accessibility and performance at phone width against the static build. Only the
// local server answers; nothing leaves localhost.
test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const PHONE = { width: 390, height: 844 };

for (const path of ["/", "/about/"]) {
  for (const scheme of ["dark", "light"] as const) {
    for (const [name, viewport] of [["phone", PHONE], ["desktop", { width: 1440, height: 900 }]] as const) {
      test(`axe finds no WCAG 2.2 A or AA violation on ${path} (${name}, ${scheme})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  }
}

// A mid-range phone as Lighthouse's mobile preset models it: 4x CPU slowdown, 150 ms round
// trip, 1.6 Mbps down, 750 kbps up. Applied here as DevTools throttling, which is stricter
// than Lighthouse's simulated throttling.
const throttle = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
};

const vitals = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number }>((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!e.hadRecentInput) cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve({ lcp, cls }), 500);
      }),
  );

test.describe("performance on a throttled phone (design.md 9)", () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  for (const path of ["/", "/about/"]) {
    test(`${path}: LCP under 2.5 s and layout shift within target`, async ({ page }) => {
      await throttle(page);
      await page.goto(path, { waitUntil: "load" });
      await page.waitForLoadState("networkidle");
      const { lcp, cls } = await vitals(page);
      test.info().annotations.push({ type: "vitals", description: `LCP ${Math.round(lcp)} ms, CLS ${cls}` });
      expect(lcp).toBeGreaterThan(0);
      expect(lcp).toBeLessThan(2500);
      // design.md 9: CLS below 0.1 (web.dev's "good"), and 0 on Home and the viewer. About's
      // font swap rewraps a paragraph (about 0.016) and stays, by decision, with swap.
      if (path === "/") expect(cls).toBe(0);
      else expect(cls).toBeLessThan(0.1);
    });
  }

  for (const path of ["/andromeda/", "/andromeda-phat-phast-2025/"]) {
    test(`${path}: the viewer does not shift`, async ({ page }) => {
      await throttle(page);
      await page.goto(path, { waitUntil: "load" });
      await page.waitForLoadState("networkidle");
      const { cls } = await vitals(page);
      test.info().annotations.push({ type: "vitals", description: `${path} CLS ${cls}` });
      expect(cls).toBe(0);
    });
  }

  test("Home: the theme toggle responds within 200 ms (INP)", async ({ page }) => {
    await throttle(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      (window as unknown as { worst: number }).worst = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { interactionId: number })[]) {
          if (e.interactionId) (window as unknown as { worst: number }).worst = Math.max((window as unknown as { worst: number }).worst, e.duration);
        }
      }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    });
    await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).tap();
    await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).tap();
    await page.waitForTimeout(500);
    const worst = await page.evaluate(() => (window as unknown as { worst: number }).worst);
    test.info().annotations.push({ type: "vitals", description: `worst interaction ${Math.round(worst)} ms` });
    expect(worst).toBeLessThan(200);
  });
});

test.describe("desktop lens interactions", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("aiming the lens with the keyboard responds within 200 ms (INP), with 4x CPU slowdown", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.evaluate(() => {
      (window as unknown as { worst: number }).worst = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { interactionId: number })[]) {
          if (e.interactionId) (window as unknown as { worst: number }).worst = Math.max((window as unknown as { worst: number }).worst, e.duration);
        }
      }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    });
    await page.getByRole("link", { name: "Open stop 02" }).focus();
    for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft"]) await page.keyboard.press(key);
    await page.waitForTimeout(500);
    const worst = await page.evaluate(() => (window as unknown as { worst: number }).worst);
    test.info().annotations.push({ type: "vitals", description: `worst interaction ${Math.round(worst)} ms` });
    expect(worst).toBeLessThan(200);
  });
});

test("Home loads no OpenSeadragon, the viewer does (design.md 9)", async ({ page }) => {
  const scriptBodies = async (path: string) => {
    const pending: Promise<string>[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") pending.push(r.text().catch(() => ""));
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    return Promise.all(pending);
  };
  const home = await scriptBodies("/");
  expect(home.length).toBeGreaterThan(0);
  expect(home.filter((b) => b.includes("OpenSeadragon"))).toHaveLength(0);
  const viewer = await page.context().newPage();
  const bodies: Promise<string>[] = [];
  viewer.on("response", (r) => {
    if (r.request().resourceType() === "script") bodies.push(r.text().catch(() => ""));
  });
  await viewer.goto("/andromeda/");
  await viewer.waitForLoadState("networkidle");
  expect((await Promise.all(bodies)).some((b) => b.includes("OpenSeadragon"))).toBe(true);
});
