import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Vips from "wasm-vips";
import { contentFile } from "../src/content/load";
import { assertGrid, levelSize, posterLevel, tileCount } from "../src/content/pyramid";
import type { TilePyramid } from "../src/content/types";

type VipsImage = InstanceType<Awaited<ReturnType<typeof Vips>>["Image"]>;

const TILE_SIZE = 256;
const MAX_LEVEL = 6;
const THUMBNAIL_SIDE = 512;
const PREVIEW_SIDE = 2048;
const RANDOM_ACCESS_PIXELS = 100e6;

const toJpeg = (img: VipsImage) => Buffer.from(img.writeToBuffer(".jpg"));

// Resizes to exactly width x height; libvips rounds from the scale, so the size is checked.
const resizeTo = (img: VipsImage, width: number, height: number, label: string) => {
  const out = img.resize(width / img.width, { vscale: height / img.height });
  if (out.width !== width || out.height !== height) {
    throw new Error(`${label}: libvips returned ${out.width} x ${out.height}, expected ${width} x ${height}`);
  }
  return out;
};

export const cutPyramid = async (
  image: VipsImage,
  outDir: string,
  opts: { tileSize: number; maxLevel: number },
) => {
  const { tileSize, maxLevel } = opts;
  for (let level = 0; level <= maxLevel; level++) {
    const label = `level ${level}`;
    const size = levelSize(image.width, image.height, maxLevel, level);
    const grid = tileCount(image.width, image.height, tileSize, maxLevel, level);
    assertGrid(size, grid, tileSize, label);
    const resized = resizeTo(image, size.width, size.height, label);
    for (let x = 0; x < grid.cols; x++) {
      const dir = join(outDir, String(level), String(x));
      await mkdir(dir, { recursive: true });
      for (let y = 0; y < grid.rows; y++) {
        const left = x * tileSize;
        const top = y * tileSize;
        const tile = resized.extractArea(left, top, Math.min(tileSize, size.width - left), Math.min(tileSize, size.height - top));
        await writeFile(join(dir, `${y}.jpg`), toJpeg(tile));
      }
    }
    console.log(`${label}: ${size.width} x ${size.height}, ${grid.cols} x ${grid.rows} tiles`);
  }
};

const longSide = (image: VipsImage, side: number) => {
  const k = Math.min(1, side / Math.max(image.width, image.height));
  return { width: Math.max(1, Math.round(image.width * k)), height: Math.max(1, Math.round(image.height * k)) };
};

// The preview is cut first and held in memory, and the thumbnail comes from it: the original
// can be opened for sequential reads only, and a second pass over it fails.
export const writeThumbnails = async (image: VipsImage, outDir: string) => {
  await mkdir(outDir, { recursive: true });
  const sizes = { thumbnail: longSide(image, THUMBNAIL_SIDE), preview: longSide(image, PREVIEW_SIDE) };
  const same = sizes.preview.width === image.width && sizes.preview.height === image.height;
  const preview = same ? image : resizeTo(image, sizes.preview.width, sizes.preview.height, "preview").copyMemory();
  await writeFile(join(outDir, "preview.jpg"), toJpeg(preview));
  const { width, height } = sizes.thumbnail;
  await writeFile(join(outDir, "thumbnail.jpg"), toJpeg(resizeTo(preview, width, height, "thumbnail")));
  return sizes;
};

// Joins the tiles of one level already on disk into `poster.jpg`, so the phone poster is
// exactly that level of the pyramid, with no second pass over the original.
export const stitchPoster = async (vips: Awaited<ReturnType<typeof Vips>>, dir: string, tiles: TilePyramid, minWidth?: number) => {
  const level = posterLevel(tiles.width, tiles.height, tiles.maxLevel, minWidth);
  const { cols, rows } = tileCount(tiles.width, tiles.height, tiles.tileSize, tiles.maxLevel, level);
  const parts: VipsImage[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) parts.push(vips.Image.newFromBuffer(await readFile(join(dir, String(level), String(x), `${y}.jpg`))));
  }
  const size = levelSize(tiles.width, tiles.height, tiles.maxLevel, level);
  // arrayjoin lays every tile in a full-size cell, top-left aligned; the edge tiles are
  // smaller, so the joined image is cropped back to the level's size.
  const joined = vips.Image.arrayjoin(parts, { across: cols });
  if (joined.width < size.width || joined.height < size.height) {
    throw new Error(`poster: level ${level} joined to ${joined.width} x ${joined.height}, smaller than ${size.width} x ${size.height}`);
  }
  const poster = joined.extractArea(0, 0, size.width, size.height);
  await writeFile(join(dir, "poster.jpg"), toJpeg(poster));
  return { level, ...size };
};

export const tilesBlock = (
  width: number,
  height: number,
  tileSize: number,
  maxLevel: number,
  sizes: Pick<TilePyramid, "thumbnail" | "preview">,
): TilePyramid => ({
  format: "jpg",
  tileSize,
  overlap: 0,
  width,
  height,
  minLevel: 0,
  maxLevel,
  thumbnail: sizes.thumbnail,
  preview: sizes.preview,
});

export const updateManifestTiles = (manifestPath: string, tiles: TilePyramid) => {
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error(`${manifestPath} is missing or not JSON: the hand-written fields come first`);
  }
  manifest.tiles = tiles;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
};

const levelsOnDisk = async (dir: string) => {
  const levels = (await readdir(dir)).filter((n) => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b);
  if (levels.length === 0 || levels[0] !== 0 || levels.some((l, i) => l !== i)) {
    throw new Error(`${dir}: expected tile levels 0..n with no gap, found [${levels.join(", ")}]`);
  }
  return levels[levels.length - 1];
};

const main = async () => {
  const args = process.argv.slice(2);
  const noPyramid = args.includes("--no-pyramid");
  const [input, id] = args.filter((a) => !a.startsWith("--"));
  // `--poster-only <imageId>` stitches poster.jpg from the tiles on disk and nothing else.
  if (args.includes("--poster-only") && input && /^[a-z0-9-]+$/.test(input)) {
    const manifest = JSON.parse(await readFile(contentFile(process.cwd(), "images", input), "utf8"));
    const poster = await stitchPoster(await Vips(), join("public", "tiles", input), manifest.tiles);
    console.log(`Wrote poster.jpg (level ${poster.level}, ${poster.width} x ${poster.height})`);
    return;
  }
  if (!input || !id || !/^[a-z0-9-]+$/.test(id)) {
    console.error("Usage: tsx scripts/generate-tiles.ts <input> <imageId> [--no-pyramid], or <imageId> --poster-only");
    process.exit(1);
  }
  // The hand-written fields come first; contentFile throws when the manifest does not exist.
  const manifestPath = contentFile(process.cwd(), "images", id);

  const outDir = join("public", "tiles", id);
  const vips = await Vips();
  // Each pyramid level reads the original again, which a sequential TIFF reader refuses
  // ("out of order read"). Up to RANDOM_ACCESS_PIXELS the file is opened for random access,
  // which holds it in memory; larger originals stay sequential.
  const header = vips.Image.newFromFile(input);
  const access = header.width * header.height <= RANDOM_ACCESS_PIXELS ? "random" : "sequential";
  const image = vips.Image.newFromFile(input, { access });
  let maxLevel = MAX_LEVEL;
  if (noPyramid) maxLevel = await levelsOnDisk(outDir);
  else await cutPyramid(image, outDir, { tileSize: TILE_SIZE, maxLevel });
  const sizes = await writeThumbnails(image, outDir);
  const tiles = tilesBlock(image.width, image.height, TILE_SIZE, maxLevel, sizes);
  updateManifestTiles(manifestPath, tiles);
  const poster = await stitchPoster(vips, outDir, tiles);
  console.log(`Wrote ${manifestPath} and poster.jpg (level ${poster.level}, ${poster.width} x ${poster.height})`);
};

if (process.argv[1]?.endsWith("generate-tiles.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
