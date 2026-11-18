import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Vips from "wasm-vips";
import { contentFile } from "../src/content/load";
import { assertGrid, levelSize, posterLevel, tileCount } from "../src/content/pyramid";
import type { ImageManifest, TilePyramid } from "../src/content/types";

type VipsImage = InstanceType<Awaited<ReturnType<typeof Vips>>["Image"]>;

export const TILE_SIZE = 256;
export const MAX_LEVEL = 6;
export const THUMBNAIL_SIDE = 512;
export const PREVIEW_SIDE = 2048;
const RANDOM_ACCESS_PIXELS = 200e6;

const toJpeg = (img: VipsImage) => Buffer.from(img.writeToBuffer(".jpg"));

// Resizes to exactly width x height; libvips rounds from the scale, so the size is checked.
const resizeTo = (img: VipsImage, width: number, height: number, label: string) => {
  const out = img.resize(width / img.width, { vscale: height / img.height });
  if (out.width !== width || out.height !== height) {
    throw new Error(`${label}: libvips returned ${out.width} x ${out.height}, expected ${width} x ${height}`);
  }
  return out;
};

// The input is the whole source file; an image record with a `crop` tiles only that box of it.
export const cropTo = (image: VipsImage, crop: ImageManifest["crop"]) => {
  if (!crop) return image;
  if (crop.x + crop.width > image.width || crop.y + crop.height > image.height) {
    throw new Error(`crop: (${crop.x}, ${crop.y}) + ${crop.width} x ${crop.height} lies outside the input (${image.width} x ${image.height})`);
  }
  return image.extractArea(crop.x, crop.y, crop.width, crop.height);
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

export const longSide = (image: { width: number; height: number }, side: number) => {
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

// Each pyramid level reads the original again, which a sequential reader refuses ("out of order
// read"), so the cutter needs random access. Up to `limit` pixels the file is opened that way,
// which holds it in memory. A larger original needs a crop: one sequential pass copies the crop
// into memory, and that copy is what gets cut.
export const openForCutting = (
  vips: Awaited<ReturnType<typeof Vips>>,
  input: string,
  crop: ImageManifest["crop"],
  limit = RANDOM_ACCESS_PIXELS,
) => {
  const header = vips.Image.newFromFile(input);
  if (header.width * header.height <= limit) return cropTo(vips.Image.newFromFile(input, { access: "random" }), crop);
  if (!crop) {
    throw new Error(`${input} is ${header.width} x ${header.height}, over the ${limit / 1e6} Mpx the cutter holds in memory: give its manifest a crop`);
  }
  if (crop.width * crop.height > limit) {
    throw new Error(`crop ${crop.width} x ${crop.height} is over the ${limit / 1e6} Mpx the cutter holds in memory`);
  }
  return cropTo(vips.Image.newFromFile(input, { access: "sequential" }), crop).copyMemory();
};

// Cuts one original into `outDir` (pyramid, preview, thumbnail, poster) and returns the `tiles` block.
export const tileImage = async (
  vips: Awaited<ReturnType<typeof Vips>>,
  opts: { input: string; outDir: string; crop: ImageManifest["crop"]; noPyramid?: boolean },
) => {
  const { input, outDir, crop } = opts;
  const image = openForCutting(vips, input, crop);
  let maxLevel = MAX_LEVEL;
  if (opts.noPyramid) maxLevel = await levelsOnDisk(outDir);
  else await cutPyramid(image, outDir, { tileSize: TILE_SIZE, maxLevel });
  const sizes = await writeThumbnails(image, outDir);
  const tiles = tilesBlock(image.width, image.height, TILE_SIZE, maxLevel, sizes);
  const poster = await stitchPoster(vips, outDir, tiles);
  return { tiles, poster };
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
  const { crop } = JSON.parse(readFileSync(manifestPath, "utf8")) as Pick<ImageManifest, "crop">;
  const { tiles, poster } = await tileImage(await Vips(), { input, outDir, crop, noPyramid });
  updateManifestTiles(manifestPath, tiles);
  console.log(`Wrote ${manifestPath} and poster.jpg (level ${poster.level}, ${poster.width} x ${poster.height})`);
};

if (process.argv[1]?.endsWith("generate-tiles.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
