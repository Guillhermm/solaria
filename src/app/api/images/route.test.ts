import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { GET, images } from "./route";

const TILES = join(process.cwd(), "public", "tiles");

describe("GET /api/images", () => {
  it("returns the image list as JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(images);
  });
});

const TILE_SIZE = 256;

const levelsOnDisk = (id: string) =>
  readdirSync(join(TILES, id))
    .filter((d) => /^\d+$/.test(d))
    .map(Number)
    .sort((a, b) => a - b);

// Reads the pixel size from a JPEG start-of-frame marker.
const jpegSize = (file: string) => {
  const buf = readFileSync(file);
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error(`bad JPEG marker in ${file}`);
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error(`no frame header in ${file}`);
};

// At the deepest level the tiles are the full-resolution image cut in squares.
const sizeFromTiles = (id: string, level: number) => {
  const dir = join(TILES, id, String(level));
  const cols = readdirSync(dir).filter((d) => /^\d+$/.test(d)).length;
  const rows = readdirSync(join(dir, "0")).filter((f) => f.endsWith(".jpg")).length;
  return {
    width: (cols - 1) * TILE_SIZE + jpegSize(join(dir, String(cols - 1), "0.jpg")).width,
    height: (rows - 1) * TILE_SIZE + jpegSize(join(dir, "0", `${rows - 1}.jpg`)).height,
  };
};

describe("Andromeda metadata", () => {
  it.each(images.map((m) => [m.id, m] as const))("%s matches the tile tree", (id, meta) => {
    const levels = levelsOnDisk(id);
    expect(meta.tileSize).toBe(TILE_SIZE);
    expect(meta.minLevel).toBe(levels[0]);
    expect(meta.maxLevel).toBe(levels[levels.length - 1]);
    expect(sizeFromTiles(id, meta.maxLevel)).toEqual({ width: meta.width, height: meta.height });
  });

  it("carries the sizes, date and credit checked in docs/science/sources.md", () => {
    const byId = Object.fromEntries(images.map((m) => [m.id, m]));
    expect(byId["hubble-mosaic-high"]).toMatchObject({ width: 42208, height: 9870 });
    expect(byId["hubble-mosaic"]).toMatchObject({ width: 10552, height: 2468 });
    for (const m of images) {
      expect(m.timestamp).toBe("2025-01-16");
      expect(m.credit).toBe(
        "NASA, ESA, Benjamin Williams (UWashington), Zhuo Chen (UWashington), L. Clifton Johnson (Northwestern); Image Processing: Joseph DePasquale (STScI)"
      );
    }
  });
});
