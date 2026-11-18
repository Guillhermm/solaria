import { describe, expect, it } from "vitest";
import { stop } from "@/content/__fixtures__/content";
import type { Stop } from "@/content/types";
import { bracketPath, chipText, flipTags, mergeMarks, polyline, reticleSide, routeMarks, splitRoute, tagPlacement, toDrawn } from "./route";

const ANDROMEDA = { width: 42208, height: 9870 };
const PILLARS = { width: 8423, height: 14589 };

const at = (id: string, x: number, y: number, z: number, marker?: Stop["marker"]): Stop => ({
  ...stop(id),
  viewport: { x, y, z },
  ...(marker ? { marker } : {}),
});

// The validated Andromeda stops' places (data/journeys/andromeda.json).
const andromeda = [
  at("whole", 21104, 4935, 1),
  at("core", 17461, 5600, 6, { x: 17461, y: 6482, r: 300 }),
  at("dust", 13190, 7935, 10),
  at("m32", 11412, 2448, 12, { x: 11412, y: 2448, r: 250 }),
  at("ngc206", 5330, 7260, 15, { x: 5330, y: 7260, r: 250 }),
  at("stars", 26880, 3586, 29),
  at("turn", 21104, 4935, 1),
];

describe("overview geometry for any shape (design.md 6.4)", () => {
  it("places a point by its fraction of the image on a wide strip", () => {
    const drawn = { width: 344, height: 344 / (42208 / 9870) };
    const p = toDrawn({ x: 21104, y: 4935 }, ANDROMEDA, drawn);
    expect(p.x).toBeCloseTo(172);
    expect(p.y).toBeCloseTo(drawn.height / 2);
  });

  it("places a point by its fraction of the image on a tall rail", () => {
    const drawn = { width: 208, height: 208 * (14589 / 8423) };
    const p = toDrawn({ x: 8423, y: 14589 / 4 }, PILLARS, drawn);
    expect(p.x).toBeCloseTo(208);
    expect(p.y).toBeCloseTo(drawn.height / 4);
  });

  it("marks only the stops that point somewhere, keeping their numbers", () => {
    const drawn = { width: 344, height: 80 };
    const marks = routeMarks(andromeda, ANDROMEDA, drawn);
    expect(marks.map((m) => m.index)).toEqual([1, 2, 3, 4, 5]);
    expect(marks[0].y).toBeCloseTo((6482 / 9870) * 80);
    for (const m of marks) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThanOrEqual(drawn.width);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeLessThanOrEqual(drawn.height);
    }
  });

  it("keeps every mark inside a tall overview too", () => {
    const tallStops = [at("a", 4000, 2000, 4), at("b", 8000, 14000, 8), at("c", 100, 7000, 1)];
    const drawn = { width: 208, height: 360 };
    const marks = routeMarks(tallStops, PILLARS, drawn);
    expect(marks.map((m) => m.index)).toEqual([0, 1]);
    expect(marks[1].x).toBeCloseTo((8000 / 8423) * 208);
    expect(marks[1].y).toBeCloseTo((14000 / 14589) * 360);
  });
});

describe("the route", () => {
  const marks = routeMarks(andromeda, ANDROMEDA, { width: 344, height: 80 });

  it("lies all ahead at the first stop, which has no mark", () => {
    const { travelled, ahead } = splitRoute(marks, 0);
    expect(travelled).toEqual([]);
    expect(ahead).toEqual(marks);
  });

  it("meets at the current marked stop", () => {
    const { travelled, ahead } = splitRoute(marks, 3);
    expect(travelled.map((m) => m.index)).toEqual([1, 2, 3]);
    expect(ahead.map((m) => m.index)).toEqual([3, 4, 5]);
  });

  it("is all travelled at the last stop", () => {
    const { travelled, ahead } = splitRoute(marks, 6);
    expect(travelled).toEqual(marks);
    expect(ahead.map((m) => m.index)).toEqual([5]);
  });

  it("serializes points for an SVG polyline", () => {
    expect(polyline([{ x: 1, y: 2 }, { x: 3.456, y: 4 }])).toBe("1.0,2.0 3.5,4.0");
  });
});

describe("markers", () => {
  const tag = { width: 20, height: 12 };

  it("puts the tag right of the marker", () => {
    expect(tagPlacement({ x: 100, y: 40 }, { width: 344, height: 80 }, 10, tag, 3)).toEqual({ x: 113, y: 34 });
  });

  it("flips the tag left when it would leave the overview", () => {
    expect(tagPlacement({ x: 330, y: 40 }, { width: 344, height: 80 }, 10, tag, 3)).toEqual({ x: 297, y: 34 });
  });

  it("keeps the tag inside vertically, on a wide strip and a tall rail", () => {
    expect(tagPlacement({ x: 100, y: 2 }, { width: 344, height: 80 }, 10, tag, 3).y).toBe(0);
    expect(tagPlacement({ x: 100, y: 359 }, { width: 208, height: 360 }, 10, tag, 3).y).toBe(348);
  });

  it("draws an open bracket of four corners", () => {
    const d = bracketPath(20, 7);
    expect(d.match(/M/g)).toHaveLength(4);
    expect(d.startsWith("M-10 -3V-10H-3")).toBe(true);
  });

  it("frames the marker radius once it is bigger than the reticle", () => {
    expect(reticleSide(88, 0.05, 300)).toBe(88);
    expect(reticleSide(88, 0.2, 300)).toBe(120);
    expect(reticleSide(88, 0.2)).toBe(88);
  });
});

describe("mergeMarks", () => {
  const num = (i: number) => String(i + 1).padStart(2, "0");
  // A chip 10 px per character, 14 px tall, to the right of its marker.
  const chip = (m: { x: number; y: number }, text: string) => ({ x: m.x + 12, y: m.y - 7, width: text.length * 10, height: 14 });

  it("merges markers closer than the minimum, in chains, and keeps the others apart", () => {
    const marks = [
      { index: 4, x: 100, y: 100 },
      { index: 1, x: 300, y: 300 },
      { index: 3, x: 100, y: 100 },
      { index: 2, x: 120, y: 110 },
      { index: 5, x: 300, y: 340 },
    ];
    expect(mergeMarks(marks, 24, chip, num)).toEqual([[1], [2, 3, 4], [5]]);
    expect(mergeMarks([], 24, chip, num)).toEqual([]);
  });

  it("merges markers far apart whose chips would overlap", () => {
    // 27 px apart: the markers stay separate by distance, but the first chip (x 112 to 142,
    // y 93 to 107) runs into the second (x 137 on, y 103 to 117).
    const wide = (m: { x: number; y: number }, text: string) => ({ ...chip(m, text), width: text.length * 10 + 10 });
    const two = [
      { index: 0, x: 100, y: 100 },
      { index: 1, x: 125, y: 110 },
    ];
    expect(mergeMarks(two, 24, wide, num)).toEqual([[0, 1]]);
    const apart = [
      { index: 0, x: 100, y: 100 },
      { index: 1, x: 100, y: 130 },
    ];
    expect(mergeMarks(apart, 24, chip, num)).toEqual([[0], [1]]);
  });

  it("merges again when a merged chip grows into a third", () => {
    const three = [
      { index: 0, x: 100, y: 100 },
      { index: 1, x: 100, y: 100 },
      { index: 2, x: 150, y: 100 },
    ];
    // "01·02" spans x 112 to 162 and meets the third chip's marker area at 162.
    expect(mergeMarks(three, 24, (m, t) => ({ x: m.x + 12, y: m.y - 7, width: t.length * 10 + 30, height: 14 }), num)).toEqual([[0, 1, 2]]);
  });

  it("writes a merged chip in stop order", () => {
    expect(chipText([2, 3], num)).toBe("03·04");
  });
});

describe("flipTags", () => {
  const box = (x: number, y: number, width = 30, height = 16) => ({ x, y, width, height });
  const tag = (index: number, x: number, y: number) => ({ index, right: box(x + 10, y), left: box(x - 40, y) });

  it("moves nothing when nothing is covered", () => {
    expect(flipTags(tag(2, 100, 100), [tag(6, 300, 100)], [box(500, 0, 100)])).toEqual(new Set());
  });
  it("moves the current chip off another marker's chip", () => {
    expect(flipTags(tag(2, 100, 100), [tag(6, 120, 100)], [])).toEqual(new Set([2]));
  });
  it("moves another marker's chip from under a side label, and the current chip off the moved one", () => {
    expect(flipTags(null, [tag(1, 100, 100)], [box(105, 95, 60)])).toEqual(new Set([1]));
    expect(flipTags(tag(3, 30, 100), [tag(1, 100, 100)], [box(105, 95, 60)])).toEqual(new Set([1, 3]));
  });
  it("stays put when the other corner is covered too", () => {
    expect(flipTags(null, [tag(1, 100, 100)], [box(40, 95, 140)])).toEqual(new Set());
  });
});
