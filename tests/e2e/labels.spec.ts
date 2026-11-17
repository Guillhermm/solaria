import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Feature labels (F-03), design.md 14.1 and 14.2, asserted as geometry at both widths in both
// themes against the data files.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const andromeda = read("data/labels/andromeda-phat-phast-2025.json");
const sun = read("data/labels/sun-sdo-2024-05-10.json");
const journey = read("data/journeys/andromeda.json");
const IMAGE = "/andromeda-phat-phast-2025/";
const SUN = "/sun-sdo-2024-05-10-aia-94/";

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

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

// Labels are placed after the frame paints; wait until two frames agree.
const placed = (page: Page) =>
  page.waitForFunction(
    () =>
      new Promise<boolean>((done) => {
        const snap = () => [...document.querySelectorAll<HTMLElement>("[data-testid=label-chip]")].map((c) => `${c.style.translate}|${c.style.visibility}`).join();
        const a = snap();
        requestAnimationFrame(() => requestAnimationFrame(() => done(a === snap() && !document.getAnimations().some((x) => x.playState === "running" && x.effect?.getComputedTiming().iterations !== Infinity))));
      }),
  );

const settle = (page: Page) =>
  page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity));
const toggle = (page: Page) => page.getByRole("button", { name: "Feature labels" });
const chip = (page: Page, text: string) => page.locator("[data-testid=label-chip]", { hasText: text });

interface B {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Everything a rule talks about, measured in one pass.
const measure = (page: Page) =>
  page.evaluate(() => {
    const box = (el: Element | null): B | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      if (getComputedStyle(el).visibility === "hidden") return null;
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const all = (q: string) => [...document.querySelectorAll(q)].map(box).filter((b): b is B => !!b);
    const root = document.querySelector("main")!;
    const edge = parseFloat(getComputedStyle(root).getPropertyValue("--edge")) * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const controls = [
      ...all("main > header > *"),
      ...all("[role=group][aria-label='View controls']"),
      ...all("[data-testid=overview]"),
      ...all("[data-testid=readout]"),
      ...all("[data-testid=light-bar]"),
      ...all("[data-testid=compare-bar]"),
      ...all("[data-testid=sheet-grip]"),
    ];
    const rulerTop = box(document.querySelector("[data-ruler=top]"));
    const rulerLeft = box(document.querySelector("[data-ruler=left]"));
    // L10: an overlay across the width sets the foot of the free area; one at a side closes
    // the corner below its top edge.
    const bottoms = [
      ...all("[role=group][aria-label='View controls']"),
      ...all("[data-testid=overview]"),
      ...all("[data-testid=readout]"),
      ...all("[data-testid=sheet]"),
      ...all("[data-testid=light-bar]"),
    ].filter((b) => b.y + b.height > innerHeight / 2);
    const across = bottoms.filter((b) => b.width >= innerWidth * 0.9);
    const blocked = bottoms
      .filter((b) => b.width < innerWidth * 0.9)
      .map((b) => ({ x: b.x - edge, y: b.y - edge, width: b.width + 2 * edge, height: innerHeight - b.y + edge }));
    const tops = [...all("main > header > *"), ...all("[data-testid=light-bar]")].filter((b) => b.y < innerHeight / 2);
    const top = Math.max(rulerTop ? rulerTop.y + rulerTop.height : 0, ...tops.map((b) => b.y + b.height)) + edge;
    const left = (rulerLeft ? rulerLeft.x + rulerLeft.width : 0) + edge;
    const bottom = Math.min(innerHeight, ...across.map((b) => b.y)) - edge;
    const chips = [...document.querySelectorAll<HTMLElement>("[data-testid=label-chip]")]
      .map((el) => ({ text: el.textContent ?? "", button: box(el), chip: box(el.querySelector("[data-part=chip]")) }))
      .filter((c) => c.button && c.chip) as { text: string; button: B; chip: B }[];
    const credit = all("[data-testid=credit], [data-testid=sheet-credit], [data-testid=light-bar] ul[aria-label=Credits]");
    return {
      edge,
      viewport: { width: innerWidth, height: innerHeight },
      free: { x: left, y: top, width: innerWidth - edge - left, height: bottom - top },
      blocked,
      controls,
      chips,
      markers: all("[data-testid=label-marker]"),
      popover: box(document.querySelector("[data-testid=label-popover]:not([hidden])")),
      credit,
      sheetTop: box(document.querySelector("[data-testid=sheet]"))?.y ?? null,
    };
  });

const hits = (a: B, b: B) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
const within = (a: B, area: B) => a.x >= area.x - 1 && a.y >= area.y - 1 && a.x + a.width <= area.x + area.width + 1 && a.y + a.height <= area.y + area.height + 1;

// L14, S1, S2, S3 for whatever is on screen now.
const assertLayout = async (page: Page, where: string) => {
  const m = await measure(page);
  for (const [i, a] of m.chips.entries()) {
    expect(within(a.button, m.free), `${where}: chip "${a.text}" inside the free area`).toBe(true);
    for (const c of [...m.controls, ...m.blocked]) expect(hits(a.button, c), `${where}: chip "${a.text}" clear of controls`).toBe(false);
    for (const b of m.chips.slice(i + 1)) expect(hits(a.button, b.button), `${where}: "${a.text}" and "${b.text}" apart`).toBe(false);
    for (const k of m.markers) expect(hits(a.button, k), `${where}: chip "${a.text}" off every marker`).toBe(false);
  }
  for (const k of m.markers) {
    const cx = k.x + k.width / 2;
    const cy = k.y + k.height / 2;
    expect(within({ x: cx, y: cy, width: 0, height: 0 }, m.free), `${where}: marker center inside the free area`).toBe(true);
    for (const b of m.blocked) expect(within({ x: cx, y: cy, width: 0, height: 0 }, b), `${where}: marker center off a closed corner`).toBe(false);
  }
  // S2: the credit is on screen and nothing of this section covers it.
  expect(m.credit.length, `${where}: a credit is shown`).toBeGreaterThan(0);
  for (const c of m.credit) {
    expect(within(c, { x: 0, y: 0, ...m.viewport }), `${where}: credit inside the viewport`).toBe(true);
    for (const o of [...m.chips.map((x) => x.button), ...m.markers, ...(m.popover ? [m.popover] : [])]) expect(hits(c, o), `${where}: credit uncovered`).toBe(false);
  }
  // S1: the new overlays keep --edge from every side of the screen.
  for (const o of [...m.chips.map((x) => x.button), ...(m.popover ? [m.popover] : [])]) {
    expect(o.x).toBeGreaterThanOrEqual(m.edge - 1);
    expect(o.y).toBeGreaterThanOrEqual(m.edge - 1);
    expect(m.viewport.width - (o.x + o.width)).toBeGreaterThanOrEqual(m.edge - 1);
    expect(m.viewport.height - (o.y + o.height)).toBeGreaterThanOrEqual(m.edge - 1);
  }
  return m;
};

// S4: a 2px accent ring 2px out, and nothing paints over its corners.
const assertFocusRing = async (page: Page) => {
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    const accent = getComputedStyle(el).getPropertyValue("--accent").trim();
    const probe = document.createElement("span");
    probe.style.color = accent;
    el.append(probe);
    const want = getComputedStyle(probe).color;
    probe.remove();
    // The ring itself takes no hits; its corners are checked just inside the control it surrounds.
    const r = el.getBoundingClientRect();
    const corners = [
      [r.left + 1, r.top + 1],
      [r.right - 1, r.top + 1],
      [r.left + 1, r.bottom - 1],
      [r.right - 1, r.bottom - 1],
    ].map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === el || el.contains(hit));
    });
    return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, color: s.outlineColor, want, corners };
  });
  expect(ring.style).toBe("solid");
  expect(ring.width).toBe("2px");
  expect(ring.offset).toBe("2px");
  expect(ring.color).toBe(ring.want);
  expect(ring.corners).toEqual([true, true, true, true]);
};

for (const cell of CELLS) {
  const phone = cell.width < 768;
  test.describe(`${cell.width}x${cell.height} ${cell.scheme}`, () => {
    test.use({ viewport: { width: cell.width, height: cell.height }, colorScheme: cell.scheme });

    test("L1 to L3: the toggle sits above Reset view, starts off, and shows the labels", async ({ page }) => {
      await page.goto(IMAGE);
      await ready(page);
      const group = page.getByRole("group", { name: "View controls" });
      const names = await group.getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
      expect(names.indexOf("Feature labels") + 1).toBe(names.indexOf("Reset view"));
      const t = toggle(page);
      const b = (await t.boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
      await expect(t).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByTestId("label-chip")).toHaveCount(0);
      const off = await t.evaluate((el) => getComputedStyle(el).backgroundColor);
      await t.click();
      await expect(t).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main p[aria-live]")).toHaveText("Feature labels shown");
      await expect(page).toHaveURL(/[?&]labels=1/);
      await settle(page);
      const on = await t.evaluate((el) => {
        const s = getComputedStyle(el);
        const probe = (name: string) => {
          const p = document.createElement("span");
          p.style.color = `var(${name})`;
          el.append(p);
          const c = getComputedStyle(p).color;
          p.remove();
          return c;
        };
        return { bg: s.backgroundColor, icon: getComputedStyle(el.querySelector("svg")!).color, accent: probe("--accent"), ground: probe("--ground"), glass: getComputedStyle(el.closest("[role=group]")!).backgroundColor };
      });
      expect(on.bg).toBe(on.accent);
      expect(on.icon).toBe(on.ground);
      expect(off).not.toBe(on.bg);
      // The fill is the non-color cue: 3:1 against the off state, the group's glass over the ground.
      const lum = (c: string) => {
        const [r, g, b] = c.match(/[\d.]+/g)!.map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const blend = (c: string, under: string) => {
        const v = c.match(/[\d.]+/g)!.map(Number);
        const u = under.match(/[\d.]+/g)!.map(Number);
        const a = v[3] ?? 1;
        return `rgb(${[0, 1, 2].map((i) => v[i] * a + u[i] * (1 - a)).join(",")})`;
      };
      const offBg = blend(on.glass, on.ground);
      const ratio = (lum(on.accent) + 0.05) / (lum(offBg) + 0.05);
      expect(Math.max(ratio, 1 / ratio)).toBeGreaterThanOrEqual(3);
      await t.click();
      await expect(t).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("main p[aria-live]")).toHaveText("Feature labels hidden");
      await expect(page.getByTestId("label-chip")).toHaveCount(0);
      await expect(page).not.toHaveURL(/labels=1/);
    });

    test("L5 to L9, L14, L15, S1 to S3: at fit the chips are placed clear of everything", async ({ page }) => {
      await page.goto(`${IMAGE}?labels=1`);
      await ready(page);
      await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
      await placed(page);
      const m = await assertLayout(page, "fit");
      const shown = m.chips.map((c) => c.text);
      if (phone) expect(shown).toContain("Andromeda core");
      else expect(shown.sort()).toEqual(andromeda.labels.map((l: { text: string }) => l.text).sort());
      for (const c of m.chips) {
        expect(c.chip.height).toBeGreaterThanOrEqual(24);
        expect(c.button.height).toBeGreaterThanOrEqual(44);
      }
      // Rings: 10px across, a 1.5px white stroke over a 3px halo, the same in both themes.
      const rings = await page.locator("[data-testid=label-marker]").evaluateAll((els) =>
        els.filter((el) => getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none").map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          const halo = getComputedStyle(el.previousElementSibling!);
          return { size: Math.round(r.width + parseFloat(s.strokeWidth)), stroke: s.stroke, width: s.strokeWidth, halo: halo.strokeWidth };
        }),
      );
      expect(rings.length).toBe(m.markers.length);
      for (const r of rings) expect(r).toEqual({ size: 10, stroke: "rgb(255, 255, 255)", width: "1.5px", halo: "3px" });
      // The chip's type, and its text against its own glass over white and over black.
      const chipStyle = await page.locator("[data-testid=label-chip] [data-part=chip]").first().evaluate((el) => {
        const s = getComputedStyle(el);
        return { family: s.fontFamily, weight: s.fontWeight, size: s.fontSize, color: s.color, bg: s.backgroundColor, white: s.whiteSpace };
      });
      expect(chipStyle.family).toMatch(/Geist/);
      expect(chipStyle.weight).toBe("500");
      expect(chipStyle.size).toBe("13px");
      expect(chipStyle.white).toBe("nowrap");
      const lum = (rgb: number[]) => {
        const [r, g, b] = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = chipStyle.color.match(/[\d.]+/g)!.map(Number);
      const bg = chipStyle.bg.match(/[\d.]+/g)!.map(Number);
      for (const under of [0, 255]) {
        const a = bg[3] ?? 1;
        const ground = [0, 1, 2].map((i) => bg[i] * a + under * (1 - a));
        const ratio = (lum(fg) + 0.05) / (lum(ground) + 0.05);
        expect(Math.max(ratio, 1 / ratio)).toBeGreaterThanOrEqual(4.5);
      }
    });

    test("L14: at every Andromeda Journey stop view, in Explore, nothing collides", async ({ page }) => {
      // One page load per stop: under a full parallel run that outgrows the default 30 s.
      test.slow();
      for (const stop of journey.stops) {
        const { x, y, z } = stop.viewport;
        await page.goto(`${IMAGE}?mode=explore&labels=1&x=${x}&y=${y}&z=${z}`);
        await ready(page);
        await placed(page);
        await assertLayout(page, stop.id);
      }
    });

    test("L17 to L21, S4: a chip opens its description, placed and closed by the rules", async ({ page }) => {
      await page.goto(`${IMAGE}?labels=1`);
      await ready(page);
      await placed(page);
      const core = chip(page, "Andromeda core");
      // L22: chips follow the view controls in the tab order.
      await page.getByRole("button", { name: "Reset view" }).focus();
      let found = false;
      for (let i = 0; i < 6 && !found; i++) {
        await page.keyboard.press("Tab");
        found = await core.evaluate((el) => el === document.activeElement);
      }
      expect(found).toBe(true);
      await assertFocusRing(page);
      await expect(core).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Enter");
      const pop = page.getByTestId("label-popover");
      await expect(pop).toBeVisible();
      await expect(core).toHaveAttribute("aria-expanded", "true");
      await expect(core).toHaveAttribute("aria-controls", (await pop.getAttribute("id"))!);
      const label = andromeda.labels[0];
      await expect(pop.getByRole("heading")).toHaveText(label.text);
      await expect(pop.locator("p")).toHaveText(label.description);
      const close = pop.getByRole("button", { name: "Close" });
      const cb = (await close.boundingBox())!;
      expect(cb.width).toBeGreaterThanOrEqual(44);
      expect(cb.height).toBeGreaterThanOrEqual(44);
      await placed(page);
      const m = await assertLayout(page, "popover");
      const p = m.popover!;
      for (const c of m.controls) expect(hits(p, c)).toBe(false);
      if (phone) {
        // L19: docked edge to edge, 0.5rem above the sheet, its marker in view above it.
        expect(Math.abs(p.y + p.height - (m.sheetTop! - 8))).toBeLessThanOrEqual(1);
        expect(Math.abs(p.x - m.edge)).toBeLessThanOrEqual(1);
        expect(Math.abs(m.viewport.width - m.edge - (p.x + p.width))).toBeLessThanOrEqual(1);
        const coreMarker = (await page.locator("[data-testid=label-marker][data-id=andromeda-core]").boundingBox())!;
        expect(coreMarker.y + coreMarker.height).toBeLessThanOrEqual(p.y);
      } else {
        expect(within(p, m.free)).toBe(true);
        for (const c of m.chips) expect(hits(p, c.button)).toBe(false);
        for (const k of m.markers) expect(hits(p, k)).toBe(false);
      }
      // L21: the same glass as the view controls.
      const bgs = await page.evaluate(() => [
        getComputedStyle(document.querySelector("[data-testid=label-popover]")!).backgroundColor,
        getComputedStyle(document.querySelector("[role=group][aria-label='View controls']")!).backgroundColor,
      ]);
      expect(bgs[0]).toBe(bgs[1]);
      // L20: Esc closes and focus goes back to the chip.
      await page.keyboard.press("Escape");
      await expect(pop).toBeHidden();
      await expect(core).toBeFocused();
      await expect(core).toHaveAttribute("aria-expanded", "false");
      // A second activation closes it, as does the close button.
      await core.click();
      await expect(pop).toBeVisible();
      await core.click();
      await expect(pop).toBeHidden();
      await core.click();
      await close.click();
      await expect(pop).toBeHidden();
      await expect(core).toBeFocused();
    });

    test("L20: hovering opens nothing; a tap on the image closes the description", async ({ page }) => {
      await page.goto(`${IMAGE}?labels=1`);
      await ready(page);
      await placed(page);
      const core = chip(page, "Andromeda core");
      await core.hover();
      await expect(page.getByTestId("label-popover")).toBeHidden();
      await core.click();
      await expect(page.getByTestId("label-popover")).toBeVisible();
      // A tap on open image, right of every chip and clear of the panels.
      const m = await measure(page);
      const spot = { x: m.free.x + m.free.width * 0.75, y: m.free.y + m.free.height / 2 };
      await page.mouse.click(spot.x, spot.y);
      await expect(page.getByTestId("label-popover")).toBeHidden();
    });

    test("L23: About lists every label, and Show turns labels on, flies there and opens it", async ({ page }) => {
      await page.goto(IMAGE);
      await ready(page);
      if (phone) await page.getByTestId("sheet-credit").click();
      else await page.locator("main header").getByRole("button", { name: "About this image" }).click();
      const list = page.getByRole("region", { name: "Labeled features" });
      await expect(list.getByRole("heading", { name: "Labeled features" })).toBeVisible();
      await expect(list.locator("li p:first-child")).toHaveText(andromeda.labels.map((l: { text: string }) => l.text));
      await expect(list.locator("li p:last-child")).toHaveText(andromeda.labels.map((l: { description: string }) => l.description));
      await expect(list.getByRole("button", { name: /^Show/ })).toHaveCount(andromeda.labels.length);
      const target = andromeda.labels[2];
      await list.getByRole("button", { name: `Show ${target.text}` }).click();
      await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
      const pop = page.getByTestId("label-popover");
      await expect(pop.getByRole("heading")).toHaveText(target.text, { timeout: 8000 });
      await expect(page.getByTestId("readout")).toContainText(/Center x\s*5\s330\s*y\s*7\s260/);
      await placed(page);
      await assertLayout(page, "after Show");
    });
  });
}

test.describe("where labels live", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("L4: none in Story; leaving Explore hides them, coming back restores them", async ({ page }) => {
    await page.goto(`/${journey.slug}/`);
    await ready(page);
    await expect(toggle(page)).toHaveCount(0);
    await page.locator("main header").getByRole("button", { name: "Explore", exact: true }).click();
    await toggle(page).click();
    await expect(page.getByTestId("label-chip").first()).toBeVisible();
    await page.locator("main header").getByRole("button", { name: "Story", exact: true }).click();
    await expect(page.getByTestId("label-chip")).toHaveCount(0);
    await expect(page.getByTestId("label-marker")).toHaveCount(0);
    await page.locator("main header").getByRole("button", { name: "Explore", exact: true }).click();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("label-chip").first()).toBeVisible();
  });

  test("an image without labels shows no toggle; Compare shows none", async ({ page }) => {
    await page.goto("/pillars-hubble-2014/");
    await ready(page);
    await expect(toggle(page)).toHaveCount(0);
    await page.goto("/mock-compare-before/?mode=compare");
    await ready(page);
    await expect(toggle(page)).toHaveCount(0);
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`L6, L14: the Sun's region draws its circle in Light at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${SUN}?mode=light&labels=1`);
      await ready(page);
      await placed(page);
      const label = sun.labels[0];
      // At 390 px the chip fits on no side next to the zoom buttons (L12): the circle stays, and
      // About's Show is the way to it.
      if (viewport.width > 768) await expect(chip(page, label.text)).toBeVisible();
      const circle = page.locator(`[data-testid=label-circle][data-id=${label.id}]`);
      const s = await circle.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { dash: cs.strokeDasharray, width: cs.strokeWidth, r: el.getBoundingClientRect().width / 2 };
      });
      expect(s.dash.replace(/px/g, "")).toBe("4, 3");
      expect(s.width).toBe("1px");
      expect(s.r).toBeGreaterThanOrEqual(12);
      await assertLayout(page, "sun light");
      // Leaving Light for Explore keeps them (both modes show labels).
      await page.locator("main header").getByRole("button", { name: "Explore", exact: true }).click();
      await expect(page.locator(`[data-testid=label-circle][data-id=${label.id}]`)).toBeVisible();
    });
  }
});

test.describe("motion", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("L16: chips fade in over --dur-base, and appear at once under reduced motion", async ({ page }) => {
    await page.goto(IMAGE);
    await ready(page);
    await toggle(page).click();
    const fade = await chip(page, "Andromeda core").evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(fade.split(",").map((s) => s.trim())).toContain("0.2s");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await toggle(page).click();
    await toggle(page).click();
    const now = await chip(page, "Andromeda core").evaluate((el) => ({ opacity: getComputedStyle(el).opacity, duration: getComputedStyle(el).transitionDuration }));
    expect(now.opacity).toBe("1");
    expect(now.duration.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
  });
});
