import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Vips from "wasm-vips";
import { assertGrid, levelSize, tileCount } from "../src/content/pyramid";
import type { TilePyramid } from "../src/content/types";

type VipsImage = InstanceType<Awaited<ReturnType<typeof Vips>>["Image"]>;

const TILE_SIZE = 256;
const MAX_LEVEL = 6;
const THUMBNAIL_SIDE = 512;
const PREVIEW_SIDE = 2048;

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
  if (!input || !id || !/^[a-z0-9-]+$/.test(id)) {
    console.error("Usage: tsx scripts/generate-tiles.ts <input> <imageId> [--no-pyramid]");
    process.exit(1);
  }
  const manifestPath = join("data", "images", `${id}.json`);
  await readFile(manifestPath, "utf8").catch(() => {
    throw new Error(`${manifestPath} does not exist: the hand-written fields come first`);
  });

  const outDir = join("public", "tiles", id);
  const vips = await Vips();
  const image = vips.Image.newFromFile(input, { access: "sequential" });
  let maxLevel = MAX_LEVEL;
  if (noPyramid) maxLevel = await levelsOnDisk(outDir);
  else await cutPyramid(image, outDir, { tileSize: TILE_SIZE, maxLevel });
  const sizes = await writeThumbnails(image, outDir);
  updateManifestTiles(manifestPath, tilesBlock(image.width, image.height, TILE_SIZE, maxLevel, sizes));
  console.log(`Wrote ${manifestPath}`);
};

if (process.argv[1]?.endsWith("generate-tiles.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
