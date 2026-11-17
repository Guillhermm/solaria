import { describe, expect, it } from "vitest";
import { assertGrid, levelSize, tileCount } from "./pyramid";

describe("Andromeda 42208 x 9870, levels 0 to 6", () => {
  it("rounds level sizes to the nearest pixel, as libvips does", () => {
    const sizes = [0, 1, 2, 3, 4, 5, 6].map((l) => levelSize(42208, 9870, 6, l));
    expect(sizes).toEqual([
      { width: 660, height: 154 },
      { width: 1319, height: 308 },
      { width: 2638, height: 617 },
      { width: 5276, height: 1234 },
      { width: 10552, height: 2468 },
      { width: 21104, height: 4935 },
      { width: 42208, height: 9870 },
    ]);
  });

  it("counts the tiles OpenSeadragon requests", () => {
    const grids = [0, 1, 2, 3, 4, 5, 6].map((l) => {
      const { cols, rows } = tileCount(42208, 9870, 256, 6, l);
      return `${cols}x${rows}`;
    });
    expect(grids).toEqual(["3x1", "6x2", "11x3", "21x5", "42x10", "83x20", "165x39"]);
  });
});

describe("edge sizes", () => {
  it("keeps a 1 px image at 1 px on every level", () => {
    expect(levelSize(1, 1, 6, 0)).toEqual({ width: 1, height: 1 });
    expect(tileCount(1, 1, 256, 6, 0)).toEqual({ cols: 1, rows: 1 });
  });

  it("uses an exact multiple of the tile size without an extra tile", () => {
    expect(tileCount(512, 256, 256, 0, 0)).toEqual({ cols: 2, rows: 1 });
    expect(tileCount(513, 257, 256, 0, 0)).toEqual({ cols: 3, rows: 2 });
  });

  it("counts from the unrounded scale, like OpenSeadragon", () => {
    // 2^4 * 256 * 2 + 1: level 0 is 512.06 px wide, which needs a third tile.
    expect(tileCount(8193, 100, 256, 4, 4)).toEqual({ cols: 33, rows: 1 });
    expect(tileCount(8193, 100, 256, 4, 0)).toEqual({ cols: 3, rows: 1 });
    expect(levelSize(8193, 100, 4, 0).width).toBe(512);
  });
});

describe("assertGrid", () => {
  it("accepts a level that fills its grid", () => {
    expect(() => assertGrid({ width: 660, height: 154 }, { cols: 3, rows: 1 }, 256, "L0")).not.toThrow();
    expect(() => assertGrid({ width: 512, height: 256 }, { cols: 2, rows: 1 }, 256, "L0")).not.toThrow();
  });

  it("throws when the grid has a tile the level cannot fill", () => {
    expect(() => assertGrid({ width: 512, height: 100 }, { cols: 3, rows: 1 }, 256, "L0")).toThrow(/L0: a 512 x 100 level/);
  });

  it("throws when the grid is too small for the level", () => {
    expect(() => assertGrid({ width: 513, height: 100 }, { cols: 2, rows: 1 }, 256, "L1")).toThrow(/L1/);
  });
});
