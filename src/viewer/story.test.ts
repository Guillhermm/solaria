import { describe, expect, it } from "vitest";
import { stop } from "@/content/__fixtures__/content";
import {
  clearStop,
  FLIGHT_MAX_MS,
  FLIGHT_MIN_MS,
  flightMs,
  flightPlan,
  paragraphs,
  parseStop,
  stepStop,
  stopNumber,
  stopOf,
  stopTarget,
  stopCompare,
  storySearch,
  viewBounds,
  zoomSpan,
} from "./story";

const ANDROMEDA = { width: 42208, height: 9870 };
const PILLARS = { width: 8423, height: 14589 };

describe("the stop in the URL", () => {
  it("reads ?stop= counted from 1", () => {
    expect(parseStop("?mode=story&stop=3", 7)).toBe(2);
  });

  it("opens the first stop when the parameter is missing or malformed", () => {
    for (const search of ["", "?mode=story", "?stop=", "?stop=abc", "?stop=2.5", "?stop=-1", "?stop=1e2"]) {
      expect(parseStop(search, 7)).toBe(0);
    }
  });

  it("clamps numbers to the Journey", () => {
    expect(parseStop("?stop=0", 7)).toBe(0);
    expect(parseStop("?stop=99", 7)).toBe(6);
  });

  it("writes the stop back counted from 1 and round-trips", () => {
    expect(storySearch(4)).toBe("?mode=story&stop=5");
    for (let i = 0; i < 7; i++) expect(parseStop(storySearch(i), 7)).toBe(i);
  });
});

describe("stop navigation", () => {
  it("steps forward and back and stops at both ends", () => {
    expect(stepStop(0, 1, 7)).toBe(1);
    expect(stepStop(3, -1, 7)).toBe(2);
    expect(stepStop(0, -1, 7)).toBe(0);
    expect(stepStop(6, 1, 7)).toBe(6);
  });

  it("labels stops with two digits and in words", () => {
    expect(stopNumber(1)).toBe("02");
    expect(stopNumber(11)).toBe("12");
    expect(stopOf(2, 7)).toBe("Stop 3 of 7");
  });

  it("splits the body into paragraphs on blank lines only", () => {
    expect(paragraphs("One.\n\nTwo,\nstill two.\n \nThree.")).toEqual(["One.", "Two,\nstill two.", "Three."]);
  });
});

describe("where a stop points", () => {
  it("prefers the marker", () => {
    expect(stopTarget({ ...stop("a"), marker: { x: 10, y: 20, r: 5 } })).toEqual({ x: 10, y: 20 });
  });

  it("falls back to the view center when zoomed in", () => {
    expect(stopTarget({ ...stop("a"), viewport: { x: 300, y: 40, z: 3 } })).toEqual({ x: 300, y: 40 });
  });

  it("marks nothing for a stop at the fit view", () => {
    expect(stopTarget({ ...stop("a"), viewport: { x: 500, y: 150, z: 1 } })).toBeNull();
  });
});

describe("camera flights (design.md 6.1)", () => {
  it("frames the whole image at z = 1, wide and tall", () => {
    const wide = viewBounds({ x: 21104, y: 4935, z: 1 }, ANDROMEDA, { width: 1440, height: 900 });
    expect(wide.width).toBeCloseTo(42208);
    expect(wide.x).toBeCloseTo(0);
    const tall = viewBounds({ x: 4211.5, y: 7294.5, z: 1 }, PILLARS, { width: 1040, height: 900 });
    expect(tall.height).toBeCloseTo(14589);
    expect(tall.y).toBeCloseTo(0);
  });

  it("never goes past native zoom, one screen pixel per image pixel", () => {
    // 2560 px wide fits Andromeda at 0.061 px per image px; z = 29 would be 1.76.
    const deep = viewBounds({ x: 26880, y: 3586, z: 29 }, ANDROMEDA, { width: 2560, height: 1440 });
    expect(deep.width).toBeCloseTo(2560);
    expect(deep.height).toBeCloseTo(1440);
    // Below native the stop's own zoom holds.
    const laptop = viewBounds({ x: 26880, y: 3586, z: 29 }, ANDROMEDA, { width: 1440, height: 900 });
    expect(laptop.width).toBeCloseTo(42208 / 29);
  });

  it("keeps a link's own zoom past native when asked to", () => {
    const deep = viewBounds({ x: 26880, y: 3586, z: 29 }, ANDROMEDA, { width: 2560, height: 1440 }, Infinity);
    expect(deep.width).toBeCloseTo(42208 / 29);
  });

  it("scales the duration by zoom distance within 1200 to 1800 ms", () => {
    expect(flightMs(1, 1, 29)).toBe(FLIGHT_MIN_MS);
    expect(flightMs(1, 29, 29)).toBe(FLIGHT_MAX_MS);
    expect(flightMs(29, 1, 29)).toBe(FLIGHT_MAX_MS);
    const mid = flightMs(1, Math.sqrt(29), 29);
    expect(mid).toBeGreaterThan(FLIGHT_MIN_MS);
    expect(mid).toBeLessThan(FLIGHT_MAX_MS);
    expect(flightMs(2, 4, 1)).toBe(FLIGHT_MIN_MS);
  });

  it("measures the span from the Journey's own stops", () => {
    const stops = [1, 6, 29].map((z, i) => ({ ...stop(String(i)), viewport: { x: 0, y: 0, z } }));
    expect(zoomSpan(stops)).toBe(29);
  });

  it("flies directly between overlapping views", () => {
    const viewer = { width: 1440, height: 900 };
    const from = viewBounds({ x: 21104, y: 4935, z: 1 }, ANDROMEDA, viewer);
    const plan = flightPlan(from, 1, { x: 17461, y: 5600, z: 6 }, ANDROMEDA, viewer, 29);
    expect(plan).toHaveLength(1);
    expect(plan[0].bounds).toEqual(viewBounds({ x: 17461, y: 5600, z: 6 }, ANDROMEDA, viewer));
  });

  it("zooms out to hold both views, then in, when they do not overlap", () => {
    const viewer = { width: 1440, height: 900 };
    const from = viewBounds({ x: 5330, y: 7260, z: 15 }, ANDROMEDA, viewer);
    const to = { x: 26880, y: 3586, z: 29 };
    const plan = flightPlan(from, 15, to, ANDROMEDA, viewer, 29);
    expect(plan).toHaveLength(2);
    const [out, back] = plan;
    const target = viewBounds(to, ANDROMEDA, viewer);
    expect(out.bounds.x).toBeCloseTo(from.x);
    expect(out.bounds.x + out.bounds.width).toBeCloseTo(target.x + target.width);
    expect(back.bounds).toEqual(target);
    expect(out.ms + back.ms).toBe(FLIGHT_MAX_MS);
  });
});

describe("clearStop", () => {
  // A 1000 x 1000 image at 1 screen pixel per image pixel in a 400 x 400 frame, a 40 px box
  // around the marker, and a card over the frame's top right quarter.
  const base = {
    center: { x: 500, y: 500 },
    view: { width: 400, height: 400 },
    scale: 1,
    frame: { x: 0, y: 0, width: 400, height: 400 },
    box: { x: -20, y: -20, width: 40, height: 40 },
    obstacles: [{ x: 200, y: 0, width: 200, height: 200 }],
    gap: 16,
    image: { width: 1000, height: 1000 },
  };

  it("keeps the stop's center when the marker is clear", () => {
    expect(clearStop({ ...base, mark: { x: 450, y: 550 } })).toEqual({ x: 500, y: 500, outside: 0 });
  });

  it("pans the least that brings the marker and its box clear of the card", () => {
    // The marker sits at screen (300, 100), under the card.
    const p = clearStop({ ...base, mark: { x: 600, y: 400 } });
    const sx = 200 + 600 - p.x;
    const sy = 200 + 400 - p.y;
    const box = { x: sx - 36, y: sy - 36, width: 72, height: 72 };
    expect(box.x + box.width <= 200 || box.y >= 200).toBe(true);
    expect(Math.hypot(p.x - 500, p.y - 500)).toBeLessThanOrEqual(144);
  });

  it("stays inside the data area when a clear view does", () => {
    // Data only in x 300 to 1000: the pan must not show x below 300.
    const area = [{ x: 300, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 300, y: 1000 }];
    const p = clearStop({ ...base, mark: { x: 600, y: 400 }, area });
    expect(p.x - 200).toBeGreaterThanOrEqual(300 - 1e-6);
    expect(p.outside).toBe(0);
    const sx = 200 + 600 - p.x;
    const sy = 200 + 400 - p.y;
    expect(sx + 36 <= 200 || sy - 36 >= 200).toBe(true);
  });

  it("never leaves the image", () => {
    const p = clearStop({ ...base, center: { x: 800, y: 200 }, mark: { x: 990, y: 10 } });
    expect(p.x).toBeLessThanOrEqual(800);
    expect(p.y).toBeGreaterThanOrEqual(200);
  });
});

describe("stopCompare", () => {
  const pairs = [{ pair: { id: "p" } }, { pair: { id: "q" } }];
  const stops = [stop("a"), { ...stop("b"), compare: { pairId: "q", split: 30 } }, { ...stop("c"), compare: { pairId: "gone", split: 50 } }];

  it("shows the stop's pair at the stop's split", () => {
    expect(stopCompare(stops, 1, pairs, null)).toEqual({ view: pairs[1], split: 30 });
  });
  it("shows nothing at a stop without a compare, an unknown pair or past the end", () => {
    expect(stopCompare(stops, 0, pairs, null)).toBeNull();
    expect(stopCompare(stops, 2, pairs, null)).toBeNull();
    expect(stopCompare(stops, 3, pairs, null)).toBeNull();
    expect(stopCompare(stops, 1, [], null)).toBeNull();
  });
  it("keeps a divider dragged at this stop, and only at this stop", () => {
    expect(stopCompare(stops, 1, pairs, { stop: 1, split: 72 })?.split).toBe(72);
    expect(stopCompare(stops, 1, pairs, { stop: 0, split: 72 })?.split).toBe(30);
  });
});
