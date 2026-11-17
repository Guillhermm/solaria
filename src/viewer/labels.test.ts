import { describe, expect, it } from "vitest";
import type { FeatureLabel, Stop } from "@/content/types";
import { type Box, type ChipSize, inside, intersects, labelView, markOf, parseLabelsParam, placeLabels, placePopover, readingOrder } from "./labels";

const FREE: Box = { x: 0, y: 0, width: 1000, height: 600 };
const size = (width: number): ChipSize => ({ width, height: 24, target: 44 });
const label = (id: string, x: number, y: number, r?: number): FeatureLabel => ({ id, text: id, x, y, ...(r ? { r } : {}), description: "d" });

describe("boxes", () => {
  it("intersect only past the 1px tolerance", () => {
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 0, width: 10, height: 10 })).toBe(false);
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 8, y: 8, width: 10, height: 10 })).toBe(true);
    expect(inside({ x: -1, y: 0, width: 10, height: 10 }, FREE)).toBe(true);
    expect(inside({ x: -2, y: 0, width: 10, height: 10 }, FREE)).toBe(false);
  });
});

describe("markOf", () => {
  it("draws a circle at 12px on screen or more, else a ring", () => {
    expect(markOf(label("a", 0, 0, 240), 5, 5, 0.05).circle).toBeCloseTo(12);
    expect(markOf(label("a", 0, 0, 240), 5, 5, 0.04).circle).toBeNull();
    expect(markOf(label("a", 0, 0), 5, 5, 10).circle).toBeNull();
  });
});

describe("placeLabels", () => {
  it("puts a chip right of its ring, a leader long, its button centered on the ring", () => {
    const { chips } = placeLabels([markOf(label("a", 0, 0), 100, 100, 1)], new Map([["a", size(80)]]), FREE, [], 16);
    expect(chips).toEqual([
      {
        id: "a",
        side: "right",
        chip: { x: 121, y: 88, width: 80, height: 24 },
        button: { x: 121, y: 78, width: 80, height: 44 },
        leader: [105, 100, 121, 100],
      },
    ]);
  });

  it("tries left, above, then below in turn, and hides a chip that fits nowhere", () => {
    const sizes = new Map([["a", size(80)]]);
    const at = (x: number, y: number, free = FREE) => placeLabels([markOf(label("a", 0, 0), x, y, 1)], sizes, free, [], 16).chips[0]?.side;
    expect(at(950, 100)).toBe("left");
    expect(at(500, 100, { x: 450, y: 0, width: 100, height: 600 })).toBe("above");
    expect(at(500, 20, { x: 450, y: 0, width: 100, height: 600 })).toBe("below");
    expect(at(500, 20, { x: 450, y: 0, width: 100, height: 60 })).toBeUndefined();
  });

  it("does not draw a marker in a blocked corner, and keeps chips out of it", () => {
    const corner = { x: 600, y: 400, width: 400, height: 200 };
    const p = placeLabels([markOf(label("a", 0, 0), 700, 500, 1), markOf(label("b", 0, 0), 510, 500, 1)], new Map([["a", size(80)], ["b", size(80)]]), FREE, [], 16, [corner]);
    expect(p.marks.map((m) => m.id)).toEqual(["b"]);
    expect(p.chips[0].side).toBe("left");
  });

  it("does not draw a marker outside the free area", () => {
    const p = placeLabels([markOf(label("a", 0, 0), -5, 100, 1)], new Map([["a", size(80)]]), FREE, [], 16);
    expect(p).toEqual({ marks: [], chips: [] });
  });

  it("gives way in data order: the first chip keeps its side, the next moves", () => {
    const sizes = new Map([["a", size(120)], ["b", size(120)]]);
    const marks = [markOf(label("a", 0, 0), 100, 120, 1), markOf(label("b", 0, 0), 100, 100, 1)];
    const { chips } = placeLabels(marks, sizes, FREE, [], 16);
    expect(chips.map((c) => [c.id, c.side])).toEqual([["a", "right"], ["b", "above"]]);
    expect(intersects(chips[0].button, chips[1].button)).toBe(false);
  });

  it("keeps chips off obstacles and off another feature's circle", () => {
    const sizes = new Map([["a", size(80)]]);
    const wall = { x: 110, y: 0, width: 200, height: 600 };
    expect(placeLabels([markOf(label("a", 0, 0), 100, 100, 1)], sizes, FREE, [wall], 16).chips[0].side).toBe("left");
    const circle = markOf(label("c", 0, 0, 100), 260, 100, 1);
    const p = placeLabels([markOf(label("a", 0, 0), 100, 100, 1), circle], new Map([["a", size(80)]]), FREE, [], 16);
    expect(p.chips[0].side).toBe("left");
  });

  it("starts a circle's leader at its edge, 45 degrees up and right, and keeps the chip off the disk", () => {
    const { chips } = placeLabels([markOf(label("a", 0, 0, 100), 500, 300, 1)], new Map([["a", size(140)]]), FREE, [], 16);
    expect(chips[0].side).toBe("right");
    expect(chips[0].leader[0]).toBeCloseTo(500 + 100 / Math.SQRT2);
    expect(chips[0].leader[1]).toBeCloseTo(300 - 100 / Math.SQRT2);
  });
});

describe("placePopover", () => {
  const anchor = { x: 100, y: 100, width: 80, height: 44 };
  it("sits right of its anchor, slid into the free area", () => {
    expect(placePopover(anchor, { width: 200, height: 300 }, FREE, [], [], 8)).toEqual({ x: 188, y: 0, width: 200, height: 300 });
  });
  it("avoids chips and markers, and gives up when nothing fits", () => {
    const blocker = { x: 190, y: 0, width: 10, height: 600 };
    expect(placePopover(anchor, { width: 90, height: 100 }, FREE, [blocker], [], 8)).toEqual({ x: 2, y: 72, width: 90, height: 100 });
    expect(placePopover(anchor, { width: 900, height: 900 }, FREE, [], [], 8)).toBeNull();
  });
});

describe("labelView", () => {
  const stop = (x: number, y: number, z: number) => ({ viewport: { x, y, z } }) as Stop;
  it("zooms a circle so its radius fills a third of the shorter side", () => {
    // Viewer 900 x 600 on a 4096 square: fit 600/4096; radius 240 -> 200px on screen.
    const v = labelView(label("s", 3020, 2508, 240), [], { width: 4096, height: 4096 }, { width: 900, height: 600 });
    expect(v.x).toBe(3020);
    expect((v.z * 600) / 4096 * 240).toBeCloseTo(200);
  });
  it("takes the zoom of the nearest stop for a point feature", () => {
    const v = labelView(label("p", 100, 100), [stop(0, 0, 3), stop(110, 90, 12)], { width: 1000, height: 300 }, { width: 900, height: 600 });
    expect(v).toEqual({ x: 100, y: 100, z: 12 });
  });
});

describe("readingOrder and the URL flag", () => {
  it("orders chips left to right, then top to bottom", () => {
    const c = (id: string, x: number, y: number) => ({ id, side: "right" as const, chip: { x, y, width: 1, height: 1 }, button: { x, y, width: 1, height: 1 }, leader: [0, 0, 0, 0] as [number, number, number, number] });
    expect(readingOrder([c("a", 50, 0), c("b", 10, 9), c("c", 10, 1)])).toEqual(["c", "b", "a"]);
  });
  it("reads labels=1 only", () => {
    expect(parseLabelsParam("?mode=explore&labels=1")).toBe(true);
    expect(parseLabelsParam("?labels=true")).toBe(false);
    expect(parseLabelsParam("")).toBe(false);
  });
});
