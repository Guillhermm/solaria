import { describe, expect, it } from "vitest";
import { coverCrop } from "./thumbnail";

const NILI = [[{ x: 3308, y: 0 }, { x: 3934, y: 5337 }, { x: 633, y: 5747 }, { x: 0, y: 406 }]];

describe("coverCrop", () => {
  it("returns null without a footprint", () => {
    expect(coverCrop(undefined, { width: 100, height: 100 }, 2)).toBeNull();
  });

  it("finds the largest box of the slot's shape inside a slanted footprint, centered on it", () => {
    const crop = coverCrop(NILI, { width: 3934, height: 5747 }, 10.5 / 4)!;
    expect(crop.width / crop.height).toBeCloseTo(10.5 / 4, 2);
    expect(crop.x + crop.width / 2).toBeCloseTo((3308 + 3934 + 633) / 4, -1);
    expect(crop.y + crop.height / 2).toBeCloseTo((5337 + 5747 + 406) / 4, -1);
    // Every corner lies inside the footprint: left of the right edge, right of the left edge.
    const rightEdge = (y: number) => 3308 + (626 * y) / 5337;
    const leftEdge = (y: number) => (633 * (y - 406)) / 5341;
    for (const y of [crop.y, crop.y + crop.height]) {
      expect(crop.x + crop.width).toBeLessThanOrEqual(rightEdge(y) + 1);
      expect(crop.x).toBeGreaterThanOrEqual(leftEdge(y) - 1);
    }
    expect(crop.width).toBeGreaterThan(2800);
  });

  it("covers the whole image when the footprint is the whole image of the slot's shape", () => {
    const crop = coverCrop([[{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }]], { width: 200, height: 100 }, 2)!;
    expect(crop.width).toBeGreaterThanOrEqual(199);
    expect(crop.height).toBeGreaterThanOrEqual(99);
  });
});
