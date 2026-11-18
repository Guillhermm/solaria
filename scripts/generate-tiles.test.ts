import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Vips from "wasm-vips";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { jpegSize } from "../src/content/__fixtures__/jpeg";
import { levelSize, tileCount } from "../src/content/pyramid";
import { cropTo, cutPyramid, openForCutting, stitchPoster, tilesBlock, updateManifestTiles, writeThumbnails } from "./generate-tiles";

const W = 1000;
const H = 300;
const TILE = 256;
const MAX_LEVEL = 3;

let vips: Awaited<ReturnType<typeof Vips>>;
let dir: string;

beforeAll(async () => {
  vips = await Vips();
  dir = mkdtempSync(join(tmpdir(), "solaria-tiles-"));
}, 60_000);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const image = (w: number, h: number) => vips.Image.black(w, h, { bands: 3 }).add(128);

const numeric = (d: string) =>
  readdirSync(d).filter((n) => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b);

describe("cutPyramid on a 1000 x 300 image", () => {
  const out = () => join(dir, "pyramid");

  beforeAll(async () => {
    await cutPyramid(image(W, H), out(), { tileSize: TILE, maxLevel: MAX_LEVEL });
  }, 60_000);

  it("writes the tile grid OpenSeadragon asks for at every level", () => {
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const { cols, rows } = tileCount(W, H, TILE, MAX_LEVEL, level);
      const levelDir = join(out(), String(level));
      expect(numeric(levelDir)).toEqual(Array.from({ length: cols }, (_, i) => i));
      for (let x = 0; x < cols; x++) {
        expect(numeric(join(levelDir, String(x))).length).toBe(0);
        const files = readdirSync(join(levelDir, String(x))).sort();
        expect(files).toEqual(Array.from({ length: rows }, (_, y) => `${y}.jpg`).sort());
      }
    }
  });

  it("has no tile beyond the grid", () => {
    expect(existsSync(join(out(), "0", "1"))).toBe(false);
    expect(numeric(join(out(), "3")).length).toBe(4);
  });

  it("sizes the edge tiles so the level adds up", () => {
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const { width, height } = levelSize(W, H, MAX_LEVEL, level);
      const { cols, rows } = tileCount(W, H, TILE, MAX_LEVEL, level);
      const base = join(out(), String(level));
      const lastCol = jpegSize(join(base, String(cols - 1), "0.jpg")).width;
      const lastRow = jpegSize(join(base, "0", `${rows - 1}.jpg`)).height;
      expect((cols - 1) * TILE + lastCol).toBe(width);
      expect((rows - 1) * TILE + lastRow).toBe(height);
    }
  });
});

describe("stitchPoster", () => {
  it("joins one level's tiles, edge tiles included, into a poster of that level's size", async () => {
    const out = join(dir, "poster");
    await cutPyramid(image(W, H), out, { tileSize: TILE, maxLevel: MAX_LEVEL });
    const tiles = tilesBlock(W, H, TILE, MAX_LEVEL, { thumbnail: { width: 1, height: 1 }, preview: { width: 1, height: 1 } });
    // Level 2 of 1000 x 300 is 500 x 150: two columns, the second one 244 px wide.
    const poster = await stitchPoster(vips, out, tiles, 400);
    expect(poster).toEqual({ level: 2, ...levelSize(W, H, MAX_LEVEL, 2) });
    expect(jpegSize(join(out, "poster.jpg"))).toEqual({ width: 500, height: 150 });
  }, 60_000);
});

describe("cutPyramid on a 1 px image", () => {
  it("writes one 1 x 1 tile per level", async () => {
    await cutPyramid(image(1, 1), join(dir, "tiny"), { tileSize: TILE, maxLevel: 2 });
    for (const level of [0, 1, 2]) {
      expect(jpegSize(join(dir, "tiny", String(level), "0", "0.jpg"))).toEqual({ width: 1, height: 1 });
    }
  });
});

describe("writeThumbnails", () => {
  it("writes a thumbnail and a preview without enlarging a small image", async () => {
    const out = join(dir, "thumbs");
    const sizes = await writeThumbnails(image(W, H), out);
    expect(sizes).toEqual({ thumbnail: { width: 512, height: 154 }, preview: { width: W, height: H } });
    expect(jpegSize(join(out, "thumbnail.jpg"))).toEqual({ width: 512, height: 154 });
    expect(jpegSize(join(out, "preview.jpg"))).toEqual({ width: W, height: H });
  });
});

describe("manifest", () => {
  it("builds the tiles block", () => {
    expect(tilesBlock(W, H, TILE, MAX_LEVEL, { thumbnail: { width: 512, height: 154 }, preview: { width: W, height: H } })).toEqual({
      format: "jpg",
      tileSize: TILE,
      overlap: 0,
      width: W,
      height: H,
      minLevel: 0,
      maxLevel: MAX_LEVEL,
      thumbnail: { width: 512, height: 154 },
      preview: { width: W, height: H },
    });
  });

  it("replaces only the tiles key and keeps the rest", () => {
    const file = join(dir, "manifest.json");
    writeFileSync(file, JSON.stringify({ id: "x", title: "T", tiles: { old: true }, mock: false }, null, 2) + "\n");
    const block = tilesBlock(W, H, TILE, MAX_LEVEL, { thumbnail: { width: 512, height: 154 }, preview: { width: W, height: H } });
    updateManifestTiles(file, block);
    const text = readFileSync(file, "utf8");
    expect(text.endsWith("}\n")).toBe(true);
    expect(JSON.parse(text)).toEqual({ id: "x", title: "T", tiles: block, mock: false });
    expect(Object.keys(JSON.parse(text))).toEqual(["id", "title", "tiles", "mock"]);
  });

  it("stops when the manifest does not exist", () => {
    expect(() => updateManifestTiles(join(dir, "missing.json"), {} as never)).toThrow(/hand-written fields come first/);
  });
});

describe("cropTo", () => {
  it("keeps the record's box of the source file", () => {
    // Each pixel holds its own x.
    const source = vips.Image.xyz(10, 8).extractBand(0);
    const out = cropTo(source, { x: 3, y: 2, width: 5, height: 4 });
    expect([out.width, out.height]).toEqual([5, 4]);
    expect(out.getpoint(0, 0)).toEqual([3]);
    expect(out.getpoint(4, 3)).toEqual([7]);
  });

  it("leaves an image without a crop whole", () => {
    const source = image(10, 8);
    expect(cropTo(source, undefined)).toBe(source);
  });

  it("refuses a box past the input's edge", () => {
    expect(() => cropTo(image(10, 8), { x: 6, y: 0, width: 5, height: 8 })).toThrow("crop: (6, 0) + 5 x 8 lies outside the input (10 x 8)");
  });
});

describe("openForCutting", () => {
  let path: string;
  beforeAll(() => {
    path = join(dir, "open.tif");
    // 200 x 120 = 24 kpx; each pixel holds its own x.
    vips.Image.xyz(200, 120).extractBand(0).writeToFile(path);
  });

  it("opens a file under the limit for random access and crops it", () => {
    const out = openForCutting(vips, path, { x: 3, y: 2, width: 5, height: 4 });
    expect([out.width, out.height]).toEqual([5, 4]);
    expect(out.getpoint(4, 3)).toEqual([7]);
  });

  it("copies the crop of a file over the limit into memory, readable more than once", () => {
    const out = openForCutting(vips, path, { x: 10, y: 20, width: 50, height: 40 }, 10_000);
    expect([out.width, out.height]).toEqual([50, 40]);
    expect(out.getpoint(0, 0)).toEqual([10]);
    expect(out.getpoint(49, 39)).toEqual([59]);
    expect(out.getpoint(0, 0)).toEqual([10]);
  });

  it("reads the bottom of a tall crop before its top, which a sequential reader refuses", () => {
    // Tall enough that the sequential reader's line cache no longer holds row 0; each pixel holds its own y.
    const tall = join(dir, "tall.tif");
    vips.Image.xyz(64, 4000).extractBand(1).cast("ushort").writeToFile(tall);
    const out = openForCutting(vips, tall, { x: 0, y: 0, width: 2, height: 4000 }, 10_000);
    expect(out.getpoint(0, 3999)).toEqual([3999]);
    expect(out.getpoint(0, 0)).toEqual([0]);
  });

  it("refuses a file over the limit without a crop", () => {
    expect(() => openForCutting(vips, path, undefined, 10_000)).toThrow(/give its manifest a crop/);
  });

  it("refuses a crop that is itself over the limit", () => {
    expect(() => openForCutting(vips, path, { x: 0, y: 0, width: 200, height: 100 }, 10_000)).toThrow(/crop 200 x 100 is over/);
  });
});
