import { describe, expect, it } from "vitest";
import { stop } from "@/content/__fixtures__/content";
import {
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
