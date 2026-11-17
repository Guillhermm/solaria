import { describe, expect, it } from "vitest";
import { image, stop } from "@/content/__fixtures__/content";
import type { Stop, TilePyramid } from "@/content/types";
import {
  aimableStops,
  fieldBox,
  lensAnnouncement,
  lensField,
  lensLevel,
  lensTicks,
  lensTiles,
  stepAim,
} from "./lens";

const ANDROMEDA = { width: 42208, height: 9870 };
const PILLARS = { width: 8423, height: 14589 };

const pyramid = (over: Partial<TilePyramid> = {}): TilePyramid => ({ ...image().tiles, ...over });
const ANDROMEDA_TILES = pyramid({ width: 42208, height: 9870, tileSize: 256, maxLevel: 6 });

const at = (x: number, y: number, z: number, marker?: Stop["marker"]): Stop => ({ ...stop("s"), viewport: { x, y, z }, marker });

describe("lensField", () => {
  it("takes the stop's center and zoom, and the field the fit width divided by the zoom", () => {
    // design.md 6.3: 42 208 / 2 960 = 14.3x.
    const f = lensField(at(19199, 4926, 42208 / 2960), ANDROMEDA);
    expect(f.x).toBe(19199);
    expect(f.y).toBe(4926);
    expect(f.side).toBeCloseTo(2960, 6);
    expect(f.zoom.toFixed(1)).toBe("14.3");
  });

  it("fits a tall image by its height", () => {
    expect(lensField(at(4000, 7000, 2), PILLARS).side).toBe(14589 / 2);
  });
});

describe("aimableStops", () => {
  it("leaves out stops at the fit view and keeps marked ones", () => {
    const stops = [at(1, 1, 1), at(5, 5, 6), at(1, 1, 1, { x: 3, y: 3, r: 1 }), at(1, 1, 1)];
    expect(aimableStops(stops)).toEqual([1, 2]);
  });
});

describe("lensLevel", () => {
  it("picks the coarsest level with enough pixels across the field", () => {
    // 2 960 image px at level 4 (1/4) is 740 px: enough for 680, level 3 (370 px) is not.
    expect(lensLevel(ANDROMEDA_TILES, 2960, 680)).toBe(4);
    // 42 208 px is 659 px at level 0, short of 680, so level 1.
    expect(lensLevel(ANDROMEDA_TILES, 42208, 680)).toBe(1);
    expect(lensLevel(ANDROMEDA_TILES, 42208, 600)).toBe(0);
  });

  it("stops at full resolution", () => {
    expect(lensLevel(ANDROMEDA_TILES, 300, 680)).toBe(6);
  });
});

describe("lensTiles", () => {
  it("covers the whole field with tiles that touch, and nothing outside it", () => {
    const field = { x: 19199, y: 4926, side: 2960, zoom: 14.3 };
    const tiles = lensTiles(ANDROMEDA_TILES, field, 680);
    expect(tiles.every((t) => t.level === 4)).toBe(true);
    const left = Math.min(...tiles.map((t) => t.left));
    const top = Math.min(...tiles.map((t) => t.top));
    const right = Math.max(...tiles.map((t) => t.left + t.width));
    const bottom = Math.max(...tiles.map((t) => t.top + t.height));
    expect(left).toBeLessThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(100);
    expect(bottom).toBeGreaterThanOrEqual(100);
    // A tile at level 4 spans 256 * 4 = 1 024 image px, a third of the field.
    expect(tiles[0].width).toBeCloseTo((1024 / 2960) * 100, 6);
    for (const t of tiles) {
      expect(t.left).toBeLessThan(100);
      expect(t.left + t.width).toBeGreaterThan(0);
    }
    expect(new Set(tiles.map((t) => t.key)).size).toBe(tiles.length);
  });

  it("asks only for tiles that exist at an image edge, and sizes the last one to the image", () => {
    // A field hanging over the bottom-right corner.
    const field = { x: 42208, y: 9870, side: 2000, zoom: 21 };
    const tiles = lensTiles(ANDROMEDA_TILES, field, 680);
    const level = tiles[0].level;
    const d = 2 ** (6 - level);
    const cols = Math.ceil(Math.round(42208 / d) / 256);
    const rows = Math.ceil(Math.round(9870 / d) / 256);
    expect(Math.max(...tiles.map((t) => t.col))).toBe(cols - 1);
    expect(Math.max(...tiles.map((t) => t.row))).toBe(rows - 1);
    const corner = tiles.find((t) => t.col === cols - 1 && t.row === rows - 1)!;
    // The image ends at the field's center, so the last tile ends at 50 %.
    expect(corner.left + corner.width).toBeCloseTo(50, 0);
    expect(corner.top + corner.height).toBeCloseTo(50, 0);
  });

  it("starts at tile 0 when the field hangs over the top-left corner", () => {
    const tiles = lensTiles(ANDROMEDA_TILES, { x: 0, y: 0, side: 2000, zoom: 21 }, 680);
    expect(Math.min(...tiles.map((t) => t.col))).toBe(0);
    expect(Math.min(...tiles.map((t) => t.row))).toBe(0);
    expect(tiles.find((t) => t.col === 0 && t.row === 0)!.left).toBe(50);
  });
});

describe("fieldBox", () => {
  it("places the field in percent of the image, square in image pixels", () => {
    const box = fieldBox({ x: 21104, y: 4935, side: 4935, zoom: 8.55 }, ANDROMEDA);
    expect(box.left).toBeCloseTo(((21104 - 2467.5) / 42208) * 100, 9);
    expect(box.top).toBeCloseTo(25, 9);
    expect(box.height).toBeCloseTo(50, 9);
    expect((box.width / 100) * ANDROMEDA.width).toBeCloseTo((box.height / 100) * ANDROMEDA.height, 6);
  });
});

describe("lensTicks", () => {
  it("labels image pixels across the field, in percent of the lens", () => {
    // 2 960 px over 340 px: a 7rem gap (112 px) needs 975 px, so the step is 1 000.
    const ticks = lensTicks(19199, 2960, 42208, 340, 112);
    expect(ticks.major.map((t) => t.value)).toEqual([18000, 19000, 20000]);
    expect(ticks.major[0].at).toBeCloseTo(((18000 - (19199 - 1480)) / 2960) * 100, 9);
    for (const at of [...ticks.minor, ...ticks.major.map((t) => t.at)]) {
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(100);
    }
  });

  it("leaves out ticks past the image edge", () => {
    const ticks = lensTicks(9870, 2000, 9870, 340, 112);
    expect(ticks.major.every((t) => t.value <= 9870)).toBe(true);
    expect(Math.max(...ticks.major.map((t) => t.at))).toBeLessThanOrEqual(50);
  });
});

describe("lensAnnouncement", () => {
  it("counts stops from 1 and gives the zoom to one decimal", () => {
    expect(lensAnnouncement(2, 14.27)).toBe("Stop 3, zoom 14.3×");
  });
});

describe("stepAim", () => {
  it("moves along the route and stops at both ends", () => {
    expect(stepAim([1, 2, 4], 2, 1)).toBe(4);
    expect(stepAim([1, 2, 4], 4, 1)).toBe(4);
    expect(stepAim([1, 2, 4], 1, -1)).toBe(1);
    expect(stepAim([1, 2, 4], 9, 1)).toBe(1);
  });
});
