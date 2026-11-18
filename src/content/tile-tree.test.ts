import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { jpegSize } from "./__fixtures__/jpeg";
import { loadContent } from "./load";
import { tileCount } from "./pyramid";

const TILES = join(process.cwd(), "public", "tiles");
const images = loadContent({ root: process.cwd(), mode: "development" }).images;

// Since R-03 a new image's tiles live on R2, or here after `npm run build-tiles`, so a tree
// that git does not track may be absent. A tracked tree is always checked, present or not.
const tracked = new Set(
  execFileSync("git", ["ls-files", "public/tiles"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((p) => p.split("/")[2]),
);
const onDisk = images.filter((i) => tracked.has(i.id) || existsSync(join(TILES, i.id)));
const absent = images.filter((i) => !onDisk.includes(i));

const numeric = (d: string) =>
  readdirSync(d).filter((n) => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b);

// At the deepest level the tiles are the full-resolution image cut in squares.
const sizeFromTiles = (id: string, level: number) => {
  const dir = join(TILES, id, String(level));
  const cols = numeric(dir).length;
  const rows = readdirSync(join(dir, "0")).filter((f) => f.endsWith(".jpg")).length;
  const tile = 256;
  return {
    width: (cols - 1) * tile + jpegSize(join(dir, String(cols - 1), "0.jpg")).width,
    height: (rows - 1) * tile + jpegSize(join(dir, "0", `${rows - 1}.jpg`)).height,
  };
};

describe("every manifest matches its tile tree", () => {
  it("has at least one image", () => {
    expect(images.length).toBeGreaterThan(0);
  });

  if (absent.length) it.skip.each(absent.map((i) => [i.id] as const))("%s: no tile tree on disk (untracked since R-03; run npm run build-tiles)", () => {});

  it.each(onDisk.map((i) => [i.id, i] as const))("%s", (id, image) => {
    const { tiles } = image;
    const levels = numeric(join(TILES, id));
    expect(levels).toEqual(Array.from({ length: tiles.maxLevel - tiles.minLevel + 1 }, (_, i) => tiles.minLevel + i));
    expect(sizeFromTiles(id, tiles.maxLevel)).toEqual({ width: tiles.width, height: tiles.height });
    for (const level of levels) {
      const { cols, rows } = tileCount(tiles.width, tiles.height, tiles.tileSize, tiles.maxLevel, level);
      expect(numeric(join(TILES, id, String(level)))).toHaveLength(cols);
      expect(readdirSync(join(TILES, id, String(level), "0")).filter((f) => f.endsWith(".jpg"))).toHaveLength(rows);
    }
    expect(jpegSize(join(TILES, id, "thumbnail.jpg"))).toEqual(tiles.thumbnail);
    expect(jpegSize(join(TILES, id, "preview.jpg"))).toEqual(tiles.preview);
  });

  it("carries the Andromeda numbers checked in docs/science/andromeda.md", () => {
    const a = images.find((i) => i.id === "andromeda-phat-phast-2025")!;
    expect(a.tiles).toMatchObject({ width: 42208, height: 9870, tileSize: 256, minLevel: 0, maxLevel: 6 });
    expect(a.releasedAt?.value).toBe("2025-01-16");
    expect(a.instruments.value).toEqual(["Advanced Camera for Surveys (ACS)"]);
    expect(a.pixelScale?.status).toBe("supported");
    expect(a.caveats).toHaveLength(5);
  });
});
