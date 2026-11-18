import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { homeJourneys, readContent } from "./content";
import { contrastRatio, over, parseColor as parseCss } from "../../src/styles/contrast";

// Search (F-04), design.md 15.1 and 15.2, as geometry and behavior in the four cells.
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const andromedaLabels = read("data/labels/andromeda-phat-phast-2025.json");
const IMAGE = "/andromeda-phat-phast-2025/";
const SUN = "/sun-sdo-2024-05-10-aia-94/";

// Computed styles come back as "rgba(r, g, b, a)"; contrast.ts reads "rgb(r g b / a)".
const parseColor = (v: string) => {
  const m = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(v.trim());
  return parseCss(m ? `rgb(${m[1]} ${m[2]} ${m[3]}${m[4] ? ` / ${m[4]}` : ""})` : v);
};

const CELLS = [
  { width: 390, height: 844, scheme: "dark" },
  { width: 390, height: 844, scheme: "light" },
  { width: 1440, height: 900, scheme: "dark" },
  { width: 1440, height: 900, scheme: "light" },
] as const;

interface B {
  x: number;
  y: number;
  width: number;
  height: number;
}

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());
});

const ready = async (page: Page) => {
  await page.locator('[data-testid="viewer"][data-open]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="viewer"] .openseadragon-canvas canvas'));
};

const settle = (page: Page) =>
  page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity));

const dialog = (page: Page) => page.getByRole("dialog", { name: "Search" });
const input = (page: Page) => page.getByRole("combobox", { name: "Search Solaria" });
const options = (page: Page) => dialog(page).getByRole("option");
const trigger = (page: Page) => page.getByRole("button", { name: "Search", exact: true });

const open = async (page: Page) => {
  await trigger(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(input(page)).toBeFocused();
  await settle(page);
};

const hits = (a: B, b: B) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;

const boxes = (page: Page, selector: string) =>
  page.evaluate(
    (q) =>
      [...document.querySelectorAll(q)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
    selector,
  );

const CREDITS = "[data-testid=hero-credit], [data-testid=credit], [data-testid=sheet-credit], [data-testid=light-bar] ul[aria-label=Credits], footer [data-credit]";

const remPx = (page: Page, v: string) =>
  page.evaluate((value) => {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.width = value;
    document.body.append(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  }, v);

// Q8 and Q9: where the panel sits, and that it keeps clear of the top bar and the credit.
const assertPanel = async (page: Page, where: string, viewer: boolean) => {
  const panel = (await dialog(page).boundingBox())!;
  const vw = page.viewportSize()!.width;
  const vh = page.viewportSize()!.height;
  const credits = (await boxes(page, CREDITS)).filter((c) => c.y < vh && c.y + c.height > 0);
  // As built (15.5, D4): a credit in the upper half of the screen moves the panel to 0.5rem under it.
  const above = credits.filter((c) => hits({ ...c, y: 0, height: vh }, { ...panel, y: 0, height: vh }) && c.y < vh / 2);
  const under = (top: number) => Math.max(top, ...above.map((c) => c.y + c.height + 8));
  if (vw >= 768) {
    const gutter = await remPx(page, "var(--gutter)");
    expect(panel.width, `${where}: width`).toBeCloseTo(Math.min(640, vw - 2 * gutter), 0);
    expect(Math.abs(panel.x + panel.width / 2 - vw / 2), `${where}: centered`).toBeLessThanOrEqual(1);
    expect(Math.abs(panel.y - under(96)), `${where}: top`).toBeLessThanOrEqual(1);
    if (viewer) for (const g of await boxes(page, "main > header > *")) expect(hits(panel, g), `${where}: clear of the top bar`).toBe(false);
  } else {
    expect(Math.abs(panel.x - 12), `${where}: left edge`).toBeLessThanOrEqual(1);
    expect(Math.abs(vw - panel.x - panel.width - 12), `${where}: right edge`).toBeLessThanOrEqual(1);
    expect(Math.abs(panel.y - under(12)), `${where}: top`).toBeLessThanOrEqual(1);
  }
  expect(panel.y + panel.height, `${where}: inside the viewport`).toBeLessThanOrEqual(vh - 12 + 1);
  for (const c of credits) {
    expect(hits(panel, c), `${where}: the credit stays uncovered`).toBe(false);
    if (c.y >= vh / 2) expect(c.y - (panel.y + panel.height), `${where}: 0.5rem above the credit`).toBeGreaterThanOrEqual(8 - 1);
  }
};

const effectiveOpacity = (l: Locator) =>
  l.evaluate((el) => {
    let o = 1;
    for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  });

for (const cell of CELLS) {
  const phone = cell.width < 768;
  test.describe(`${cell.width}x${cell.height} ${cell.scheme}`, () => {
    test.use({ viewport: { width: cell.width, height: cell.height }, colorScheme: cell.scheme });

    test("Q4: Home's Search button leads the nav, with its text and keycap from 48rem", async ({ page }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Main" });
      const first = nav.locator("a:visible, button:visible").first();
      await expect(first).toHaveAccessibleName("Search");
      await expect(first).toHaveAttribute("aria-keyshortcuts", "/");
      const b = (await first.boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
      const icon = (await first.locator("svg").boundingBox())!;
      expect(icon.width).toBeCloseTo(18, 0);
      const text = first.getByText("Search", { exact: true });
      const key = first.locator("kbd");
      if (phone) {
        await expect(text).toBeHidden();
        await expect(key).toBeHidden();
      } else {
        await expect(text).toBeVisible();
        await expect(key).toHaveText("/");
        await expect(key).toHaveAttribute("aria-hidden", "true");
      }
    });

    test("Q5: the viewer's Search sits before Share, and the top bar stays one row", async ({ page }) => {
      for (const path of [IMAGE, "/andromeda/", `${SUN}?mode=light`, "/pillars-hubble-2014/?mode=compare", "/sun/"]) {
        await page.goto(path);
        await ready(page);
        const s = page.locator("main > header").getByRole("button", { name: "Search", exact: true });
        const b = (await s.boundingBox())!;
        expect(b.width, path).toBeGreaterThanOrEqual(44);
        expect(b.height, path).toBeGreaterThanOrEqual(44);
        const next = await s.evaluate((el) => el.nextElementSibling?.getAttribute("aria-label"));
        expect(next, path).toBe("Share this view");
        const groups = await boxes(page, "main > header > *");
        for (const [i, g] of groups.entries()) {
          expect(g.height, `${path}: one row`).toBeLessThanOrEqual(46);
          for (const h of groups.slice(i + 1)) expect(hits(g, h), `${path}: groups apart`).toBe(false);
        }
      }
    });

    test("Q7 to Q10: a modal, unshaded dialog placed by the measured edges", async ({ page }) => {
      for (const path of ["/", IMAGE, `${SUN}?mode=light`]) {
        await page.goto(path);
        if (path !== "/") await ready(page);
        await open(page);
        expect(await dialog(page).evaluate((d) => d.matches(":modal"))).toBe(true);
        expect(await dialog(page).evaluate((d) => getComputedStyle(d, "::backdrop").backgroundColor)).toBe("rgba(0, 0, 0, 0)");
        // S2 in every state: empty, results, no match, point.
        for (const q of ["", "the", "your turn", "2048, 2048"]) {
          await input(page).fill(q);
          await assertPanel(page, `${path} "${q}"`, path !== "/");
        }
        const style = await dialog(page).evaluate((d) => {
          const s = getComputedStyle(d);
          const ref = document.querySelector("[role=group][aria-label='View controls']");
          return {
            bg: s.backgroundColor,
            want: ref ? getComputedStyle(ref).backgroundColor : null,
            glass: getComputedStyle(document.documentElement).getPropertyValue("--glass"),
            border: s.borderTopWidth,
            radius: s.borderTopLeftRadius,
            duration: s.transitionDuration,
          };
        });
        expect(style.border).toBe("1px");
        expect(style.radius).toBe("4px");
        if (style.want) expect(style.bg).toBe(style.want);
        expect(style.duration).toContain("0.32s");
      }
    });

    test("S3: the open panel never cuts through the loading status", async ({ page }) => {
      // Tiles answer late, so the viewer stays loading long enough to say so.
      await page.route(/\/tiles\/.+\/\d+\/\d+\/\d+\.jpg$/, async (r) => {
        await new Promise((done) => setTimeout(done, 15_000));
        await r.continue().catch(() => {});
      });
      await page.goto(IMAGE);
      await page.locator('[data-testid="viewer"][data-open]').waitFor();
      await expect(page.getByText("Still loading the detail.", { exact: false })).toBeVisible({ timeout: 8000 });
      await open(page);
      const panel = (await dialog(page).boundingBox())!;
      for (const t of await boxes(page, "[data-testid=toasts] > *")) {
        const shown = await page.locator("[data-testid=toasts]").evaluate((el) => getComputedStyle(el).visibility !== "hidden");
        if (shown) expect(hits(panel, t), "loading status uncovered").toBe(false);
      }
    });

    test("Q9: on a phone the list scrolls inside the panel above the sheet's credit", async ({ page }) => {
      test.skip(!phone, "phone only");
      await page.goto(IMAGE);
      await ready(page);
      await open(page);
      await input(page).fill("s");
      await assertPanel(page, "phone s", true);
      const list = dialog(page).getByRole("listbox");
      const { scroll, client } = await list.evaluate((l) => ({ scroll: l.scrollHeight, client: l.clientHeight }));
      expect(scroll).toBeGreaterThanOrEqual(client);
    });

    test("Q11 and Q13: the input, Close and the keyboard hint", async ({ page }) => {
      await page.goto("/");
      await open(page);
      const i = input(page);
      for (const [k, v] of [["maxlength", "80"], ["autocomplete", "off"], ["spellcheck", "false"], ["autocapitalize", "off"], ["enterkeyhint", "go"], ["placeholder", "Feature, stop, image, or x, y"]]) {
        await expect(i).toHaveAttribute(k, v);
      }
      expect(parseFloat(await i.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      const close = dialog(page).getByRole("button", { name: "Close" });
      const c = (await close.boundingBox())!;
      const ib = (await i.boundingBox())!;
      expect(c.width).toBeGreaterThanOrEqual(44);
      expect(c.height).toBeGreaterThanOrEqual(44);
      expect(c.x).toBeGreaterThanOrEqual(ib.x + ib.width - 1);
      expect(Math.min(c.y + c.height, ib.y + ib.height) - Math.max(c.y, ib.y)).toBeGreaterThan(1);
      const keys = dialog(page).getByTestId("search-keys");
      if (phone) await expect(keys).toHaveCount(0);
      else await expect(keys).toHaveText(["↑ ↓ Move", "Enter Open", "Esc Close"].join(""), { useInnerText: false });
    });

    test("Q18 to Q20: a combobox over a listbox, the active row barred and readable", async ({ page }) => {
      await page.goto("/");
      await open(page);
      await input(page).fill("andro");
      const i = input(page);
      await expect(i).toHaveAttribute("aria-expanded", "true");
      const list = dialog(page).getByRole("listbox");
      await expect(i).toHaveAttribute("aria-controls", (await list.getAttribute("id"))!);
      await expect(options(page)).toHaveText([/Andromeda core/, /Andromeda Galaxy/]);
      const first = options(page).first();
      await expect(i).toHaveAttribute("aria-activedescendant", (await first.getAttribute("id"))!);
      await expect(first).toHaveAttribute("aria-selected", "true");
      await expect(options(page).nth(1)).toHaveAttribute("aria-selected", "false");
      await i.press("ArrowUp");
      await expect(first).toHaveAttribute("aria-selected", "true");
      await i.press("ArrowDown");
      await i.press("ArrowDown");
      await expect(options(page).nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(dialog(page).locator("[aria-selected=true]")).toHaveCount(1);
      for (const b of await boxes(page, "[role=option]")) expect(b.height).toBeGreaterThanOrEqual(44);
      // Q19: glyph, name with the match in weight 600, context, kind tag.
      await expect(first.getByTestId("search-kind")).toHaveText("Feature");
      await expect(first.getByTestId("search-context")).toHaveText("Andromeda Galaxy (M31), Hubble PHAT+PHAST panorama");
      await expect(first.locator("strong")).toHaveText("Andro");
      expect(await first.locator("strong").evaluate((el) => getComputedStyle(el).fontWeight)).toBe("600");
      await expect(first.locator("svg[data-glyph=label]")).toHaveCount(1);
      await expect(options(page).nth(1).locator("svg[data-glyph=image]")).toHaveCount(1);
      // Q20: the active row's bar and ground, and 4.5:1 for its text on the panel.
      await i.press("ArrowUp");
      const look = await first.evaluate((row) => {
        const s = getComputedStyle(row);
        const bar = getComputedStyle(row, "::before");
        const panel = row.closest("dialog")!;
        const probe = document.createElement("span");
        probe.style.color = s.getPropertyValue("--accent");
        row.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.style.color = s.getPropertyValue("--hairline");
        const hairline = getComputedStyle(probe).color;
        probe.remove();
        return {
          barWidth: bar.width,
          barColor: bar.backgroundColor,
          accent,
          bg: s.backgroundColor,
          hairline,
          panel: getComputedStyle(panel).backgroundColor,
          ground: getComputedStyle(document.body).backgroundColor,
          name: getComputedStyle(row.querySelector("[data-testid=search-name]")!).color,
          context: getComputedStyle(row.querySelector("[data-testid=search-context]")!).color,
        };
      });
      expect(look.barWidth).toBe("2px");
      expect(look.barColor).toBe(look.accent);
      expect(look.bg).toBe(look.hairline);
      const ground = over(parseColor(look.bg), over(parseColor(look.panel), parseColor(look.ground)));
      expect(contrastRatio(parseColor(look.name), ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(parseColor(look.context), ground)).toBeGreaterThanOrEqual(4.5);
    });

    test("S4: Search, Close and a row's input show the accent ring", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(trigger(page)).toBeFocused();
      const ring = (l: Locator) => l.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth, offset: getComputedStyle(el).outlineOffset }));
      expect(await ring(trigger(page))).toEqual({ style: "solid", width: "2px", offset: "2px" });
      await page.keyboard.press("Enter");
      await expect(input(page)).toBeFocused();
      await page.keyboard.press("Tab");
      const close = dialog(page).getByRole("button", { name: "Close" });
      await expect(close).toBeFocused();
      expect(await ring(close)).toEqual({ style: "solid", width: "2px", offset: "2px" });
    });
  });
}

test.describe("behavior at 1440x900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Q1: opening and typing make no request", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await open(page);
    await input(page).pressSequentially("pillars");
    await expect(options(page)).toHaveCount(3);
    expect(requests).toEqual([]);
  });

  test("Q6: / opens search from the page and from the image, and passes through elsewhere", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click({ position: { x: 5, y: 600 } });
    await page.keyboard.press("Control+/");
    await expect(dialog(page)).toBeHidden();
    await page.keyboard.press("/");
    await expect(dialog(page)).toBeVisible();
    await expect(input(page)).toHaveValue("");
    // In the input it is a character like any other.
    await page.keyboard.press("/");
    await expect(input(page)).toHaveValue("/");
    await page.keyboard.press("Escape");
    await page.goto(IMAGE);
    await ready(page);
    await page.locator('[data-testid="viewer"] .openseadragon-canvas').focus();
    await page.keyboard.press("/");
    await expect(input(page)).toBeFocused();
    await page.keyboard.press("Escape");
    // Q12: focus goes back to where / was pressed.
    await expect(page.locator('[data-testid="viewer"] .openseadragon-canvas')).toBeFocused();
  });

  // The dialog's own input proves nothing here: an open dialog blocks "/" on its own.
  test("Q6: / typed in a text field outside the dialog stays in the field", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click({ position: { x: 5, y: 600 } });
    await page.keyboard.press("/");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const field = document.createElement("textarea");
      field.dataset.testid = "probe";
      document.body.append(field);
    });
    await page.getByTestId("probe").focus();
    await page.keyboard.press("/");
    await expect(page.getByTestId("probe")).toHaveValue("/");
    await expect(dialog(page)).toBeHidden();
  });

  test("Q12: Esc, Close and a press outside close it and give focus back to Search", async ({ page }) => {
    await page.goto("/");
    await open(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await open(page);
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await open(page);
    await page.mouse.click(20, 880);
    await expect(dialog(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test("Q12: in the viewer Esc closes only the dialog, not About or a label's description", async ({ page }) => {
    await page.goto(`${IMAGE}?mode=explore&labels=1`);
    await ready(page);
    await page.getByRole("button", { name: "About this image" }).click();
    await open(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByTestId("info")).toBeVisible();
  });

  test("Q16 and Q17: results follow every keystroke; the live region waits 500 ms", async ({ page }) => {
    await page.goto("/");
    await open(page);
    const status = dialog(page).getByRole("status");
    await input(page).pressSequentially("m32");
    await expect(options(page)).toHaveText([/Satellite galaxy M32/, /The companion galaxy M32/]);
    await expect(status).toHaveText("2 results");
    await input(page).fill("the");
    await expect(options(page)).toHaveCount(8);
    await expect(dialog(page).getByTestId("search-line")).toHaveText(["Showing 8 of 20. Type more to narrow."]);
    await input(page).fill("your turn");
    await expect(options(page)).toHaveCount(0);
    await expect(dialog(page).getByTestId("search-line")).toHaveText([
      "No matches for “your turn”.",
      "Search image titles, feature labels and Journey stop titles. To go to a point, type its image pixels, like 21104, 4935.",
    ]);
    await expect(status).toHaveText("No results");
    await input(page).fill("00h42m");
    await expect(dialog(page).getByTestId("search-line")).toHaveText(["Sky coordinates (RA and Dec) are not supported yet. Type image pixels instead, like 21104, 4935."]);
  });

  test("Q17: the live region speaks once the typing rests", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await open(page);
    const status = dialog(page).getByRole("status");
    await input(page).fill("dust lanes");
    await page.clock.runFor(300);
    await expect(status).toHaveText("");
    await page.clock.runFor(300);
    await expect(status).toHaveText("1 result");
  });

  test("empty query: the hint, then every label", async ({ page }) => {
    await page.goto("/");
    await open(page);
    await expect(dialog(page).getByTestId("search-group")).toHaveText(["Labeled features"]);
    await expect(options(page)).toHaveCount(4);
  });

  test("Q21: a row on another page navigates client side to its href", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => ((window as unknown as { kept: boolean }).kept = true));
    await open(page);
    await input(page).fill("satellite");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/andromeda-phat-phast-2025\/\?mode=explore&labels=1&x=11412&y=2448&z=12$/);
    await ready(page);
    expect(await page.evaluate(() => (window as unknown as { kept?: boolean }).kept)).toBe(true);
    await expect(page.getByRole("button", { name: "Feature labels" })).toHaveAttribute("aria-pressed", "true");
  });

  test("Q21: a row on the open page moves the view in place, labels on", async ({ page }) => {
    await page.goto(IMAGE);
    await ready(page);
    await page.evaluate(() => ((window as unknown as { kept: boolean }).kept = true));
    await open(page);
    await input(page).fill("ngc 206");
    await options(page).first().click();
    await expect(dialog(page)).toBeHidden();
    const label = andromedaLabels.labels.find((l: { id: string }) => l.id === "andromeda-ngc206");
    const href = `${IMAGE}?mode=explore&labels=1&x=${label.x}&y=${label.y}&z=15`;
    await settle(page);
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(href);
    expect(await page.evaluate(() => (window as unknown as { kept?: boolean }).kept)).toBe(true);
    await expect(page.getByRole("button", { name: "Feature labels" })).toHaveAttribute("aria-pressed", "true");
  });

  test("Q21: a stop row on its Journey goes to the stop in place", async ({ page }) => {
    await page.goto("/andromeda/");
    await ready(page);
    await open(page);
    await input(page).fill("dust");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/andromeda\/\?mode=story&stop=3$/);
    await expect(page.getByRole("heading", { name: "Dust lanes" })).toBeVisible();
  });

  test("Q22 and Q23: a point in this image flies there in Explore and the readout agrees", async ({ page }) => {
    await page.goto("/andromeda/?mode=story&stop=2");
    await ready(page);
    await open(page);
    await input(page).fill(" 17461 ,6482 ");
    await expect(dialog(page).getByTestId("search-group")).toHaveText(["Go to a point"]);
    const row = options(page).first();
    await expect(row.getByTestId("search-name")).toHaveText("Go to 17461, 6482");
    await expect(row.getByTestId("search-context")).toHaveText("In this image");
    await expect(row.getByTestId("search-kind")).toHaveText("Point");
    await expect(row.locator("svg[data-glyph=point]")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/andromeda\/\?mode=explore&x=17461&y=6482&z=\d+(\.\d+)?$/);
    await settle(page);
    const readout = page.getByTestId("readout");
    await expect(readout).toContainText("17 461");
    await expect(readout).toContainText("6 482");
    const z = Number(new URL(page.url()).searchParams.get("z"));
    expect(z).toBeGreaterThanOrEqual(4);
  });

  test("Q23: a point outside the image says where points run", async ({ page }) => {
    await page.goto(IMAGE);
    await ready(page);
    await open(page);
    await input(page).fill("50000, 2");
    await expect(dialog(page).getByTestId("search-line")).toHaveText(["No pixel at 50000, 2 in this image. Points run from 0, 0 to 42207, 9869."]);
  });

  test("Q24: on Home a point lists every image that holds it", async ({ page }) => {
    await page.goto("/");
    await open(page);
    await input(page).fill("2048, 2048");
    // Journey images in Home's order, a band set as one row under its title, then the rest by id.
    // Search lists validated images only; a staged draft stays out.
    const images = readContent("images").filter((i) => i.validation.status === "approved");
    const sets = readContent("band-sets");
    const holds = (id: string) => {
      const t = images.find((i) => i.id === id).tiles;
      return t.width > 2048 && t.height > 2048;
    };
    const lead = homeJourneys().map((j) => j.imageId);
    const rest = images.map((i) => i.id).filter((id) => !lead.includes(id) && !sets.some((s: { imageIds: string[] }) => s.imageIds.includes(id))).sort();
    const title = (id: string) => sets.find((s: { imageIds: string[] }) => s.imageIds[0] === id)?.title ?? images.find((i) => i.id === id).title;
    await expect(options(page).getByTestId("search-context")).toHaveText([...lead, ...rest].filter(holds).map(title));
  });

  test("S5: Search fades with Share when idle, and never while the dialog is open", async ({ page }) => {
    await page.goto(IMAGE);
    await ready(page);
    const s = page.locator("main > header").getByRole("button", { name: "Search", exact: true });
    await page.mouse.move(700, 450);
    await expect(page.locator("main[data-idle]")).toHaveCount(1, { timeout: 8000 });
    await expect.poll(() => effectiveOpacity(s)).toBe(0);
    await page.mouse.move(600, 400);
    await expect.poll(() => effectiveOpacity(s)).toBe(1);
    await open(page);
    await page.waitForTimeout(6000);
    await expect(page.locator("main[data-idle]")).toHaveCount(0);
  });

  test("S6: under reduced motion the panel has no transition", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await open(page);
    const d = await dialog(page).evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(d.split(",").every((x) => x.trim() === "0s")).toBe(true);
  });
});

test.describe("phone behavior", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("S5: on a phone Search never fades", async ({ page }) => {
    await page.goto(IMAGE);
    await ready(page);
    await expect(page.locator("main[data-idle]")).toHaveCount(1, { timeout: 8000 });
    await page.waitForTimeout(500);
    expect(await effectiveOpacity(page.locator("main > header").getByRole("button", { name: "Search", exact: true }))).toBe(1);
  });

  // On a phone the view at z 6 is taller than the image, so the viewer holds it inside and the
  // settled view's y differs from the label's: only the held link keeps Q21.
  test("Q21: in place, the URL stays the row's href when the view is held inside the image", async ({ page }) => {
    await page.goto(IMAGE);
    await ready(page);
    await trigger(page).click();
    await input(page).fill("andromeda core");
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeHidden();
    // Past the flight and the 400 ms URL timer that follows it.
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(`${IMAGE}?mode=explore&labels=1&x=17461&y=6482&z=6`);
  });
});

// Q3 and Q21: Light keeps the zoom the link asks for, opened fresh and moved in place.
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`Light zoom from the URL at ${viewport.width}`, () => {
    test.use({ viewport });
    const zoom = async (page: Page) => {
      await settle(page);
      await page.waitForTimeout(800);
      return parseFloat((await page.getByTestId("readout").locator("span").nth(5).textContent())!);
    };

    test("a fresh load lands on z", async ({ page }) => {
      await page.goto(`${SUN}?mode=light&labels=1&x=3020&y=2508&z=5.69`);
      await ready(page);
      expect(Math.abs((await zoom(page)) - 5.69) / 5.69).toBeLessThanOrEqual(0.01);
    });

    test("an in-place jump lands on z", async ({ page }) => {
      await page.goto(`${SUN}?mode=light`);
      await ready(page);
      await settle(page);
      await trigger(page).click();
      await input(page).fill("active region");
      await options(page).filter({ hasText: "Feature" }).first().click();
      await expect(dialog(page)).toBeHidden();
      expect(Math.abs((await zoom(page)) - 5.69) / 5.69).toBeLessThanOrEqual(0.01);
      expect(new URL(page.url()).searchParams.get("z")).toBe("5.69");
    });
  });
}

test.describe("kiosk (Q26)", () => {
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });

  test("56px targets 8px apart, no keyboard hint, and the countdown closes the dialog", async ({ page }) => {
    await page.clock.install();
    await page.goto(`${IMAGE}?kiosk=1`);
    await ready(page);
    // The first touch only stops the attract loop.
    await page.mouse.click(700, 500);
    await page.clock.resume();
    const s = page.locator("main > header").getByRole("button", { name: "Search", exact: true });
    const b = (await s.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(56);
    expect(b.height).toBeGreaterThanOrEqual(56);
    await s.click();
    await expect(dialog(page)).toBeVisible();
    await input(page).fill("a");
    const close = (await dialog(page).getByRole("button", { name: "Close" }).boundingBox())!;
    expect(close.height).toBeGreaterThanOrEqual(56);
    const rows = await boxes(page, "[role=option]");
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) expect(r.height).toBeGreaterThanOrEqual(56);
    for (let i = 1; i < rows.length; i++) expect(rows[i].y - (rows[i - 1].y + rows[i - 1].height)).toBeGreaterThanOrEqual(8 - 0.5);
    await expect(dialog(page).getByTestId("search-keys")).toHaveCount(0);
    await page.clock.runFor(90_200);
    await expect(dialog(page)).toBeHidden();
  });
});
