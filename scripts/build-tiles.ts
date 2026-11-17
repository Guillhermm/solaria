import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual, promisify } from "node:util";
import Vips from "wasm-vips";
import { contentFile } from "../src/content/load";
import { validateSource } from "../src/content/validate";
import type { ImageManifest, Source, TilePyramid } from "../src/content/types";
import { fetchSource } from "./fetch-source";
import { MAX_LEVEL, PREVIEW_SIDE, THUMBNAIL_SIDE, TILE_SIZE, longSide, tileImage, tilesBlock, updateManifestTiles } from "./generate-tiles";

const run_ = promisify(execFile);

// wasm-vips has no OpenJPEG, so a JP2 original is decoded to a lossless TIFF first. The binary
// comes from OpenJPEG (`brew install openjpeg`, or `libopenjp2-tools` on Ubuntu).
export const decodeJp2 = async (input: string) => {
  const out = `${input}.decoded.tif`;
  try {
    await run_("opj_decompress", ["-i", input, "-o", out], { maxBuffer: 1 << 24 });
  } catch (err) {
    rmSync(out, { force: true });
    throw new Error(`decoding ${input} with opj_decompress failed: ${err instanceof Error ? err.message : err}`);
  }
  return out;
};

const ID = /^[a-z0-9-]+$/;
const WORK_DIR = join(".cache", "tiles-build");

// What generate-tiles must produce for this image, worked out from the source record alone, so a
// new image gets its `tiles` block without downloading the original.
export const expectedTiles = (source: Source, crop: ImageManifest["crop"]): TilePyramid => {
  const size = crop ?? source.file;
  const { width, height } = size;
  return tilesBlock(width, height, TILE_SIZE, MAX_LEVEL, {
    thumbnail: longSide(size, THUMBNAIL_SIDE),
    preview: longSide(size, PREVIEW_SIDE),
  });
};

export const imageIds = (root: string) =>
  readdirSync(join(root, "data", "images")).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -".json".length)).sort();

// Tile sets already on R2 that this script must not cut again, with the reason.
export const NOT_REBUILT: Record<string, string> = {
  "andromeda-phat-phast-2025": "stays on R2 as cut; H-01 replaces it under a new id (architecture.md section 15)",
};

export const skipMessage = (id: string, reasons = NOT_REBUILT) => `${id}: not rebuilt, ${reasons[id]}`;

// "all" or ids separated by spaces or commas; anything else is an error, so a workflow input is never trusted.
export const parseTargets = (arg: string, known: string[], reasons = NOT_REBUILT) => {
  const tokens = arg.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('name image ids or "all"');
  if (tokens.includes("all") || tokens.includes("--all")) {
    return { ids: known.filter((id) => !(id in reasons)), skipped: known.filter((id) => id in reasons) };
  }
  for (const t of tokens) {
    if (!ID.test(t)) throw new Error(`not an image id: ${JSON.stringify(t)}`);
    if (!known.includes(t)) throw new Error(`${t}: no data/images/${t}.json (staged images are not built here)`);
    if (t in reasons) throw new Error(skipMessage(t, reasons));
  }
  return { ids: [...new Set(tokens)], skipped: [] as string[] };
};

const readRecords = (root: string, id: string) => {
  const manifestPath = contentFile(root, "images", id);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ImageManifest;
  const sourceFile = contentFile(root, "sources", manifest.sourceId);
  const parsed = validateSource(JSON.parse(readFileSync(sourceFile, "utf8")), sourceFile);
  if (!parsed.ok) throw new Error(parsed.errors.join("; "));
  return { manifestPath, manifest, source: parsed.value };
};

export interface BuildDeps {
  root: string;
  fetchSource: (src: Source) => Promise<{ path: string; cached: boolean }>;
  decode: (jp2: string) => Promise<string>;
  tile: (input: string, outDir: string, crop: ImageManifest["crop"]) => Promise<TilePyramid>;
  log: (line: string) => void;
}

// Cuts into a work directory and moves it to public/tiles/<id> only after the original passed its
// sha256 check and the cut matches the committed `tiles` block, so a failure leaves no tree behind.
export const buildImage = async (id: string, deps: BuildDeps) => {
  const { manifest, source } = readRecords(deps.root, id);
  const fetched = await deps.fetchSource(source);
  const decoded = source.file.format === "jp2" ? await deps.decode(fetched.path) : undefined;
  const path = decoded ?? fetched.path;
  const work = join(deps.root, WORK_DIR, id);
  rmSync(work, { recursive: true, force: true });
  try {
    const tiles = await deps.tile(path, work, manifest.crop);
    if (!isDeepStrictEqual(tiles, manifest.tiles)) {
      throw new Error(`${id}: the cut differs from the tiles block in data/images/${id}.json (cut ${JSON.stringify(tiles)})`);
    }
    const target = join(deps.root, "public", "tiles", id);
    rmSync(target, { recursive: true, force: true });
    mkdirSync(join(deps.root, "public", "tiles"), { recursive: true });
    renameSync(work, target);
    deps.log(`${id}: tiles in ${target}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
    if (decoded) rmSync(decoded, { force: true });
  }
};

// Writes the expected `tiles` block into the manifest of a new image; no download.
export const writeExpected = (id: string, root: string) => {
  const { manifestPath, manifest, source } = readRecords(root, id);
  updateManifestTiles(manifestPath, expectedTiles(source, manifest.crop));
};

export const run = async (ids: string[], deps: BuildDeps) => {
  const failed: string[] = [];
  for (const id of ids) {
    try {
      await buildImage(id, deps);
    } catch (err) {
      failed.push(id);
      deps.log(`${id}: FAILED, ${err instanceof Error ? err.message : err}`);
    }
  }
  deps.log(failed.length === 0 ? `Built ${ids.length} image(s)` : `${failed.length} of ${ids.length} failed: ${failed.join(", ")}`);
  return failed.length === 0 ? 0 : 1;
};

const main = async () => {
  const args = process.argv.slice(2);
  const writeManifest = args.includes("--write-manifest");
  const root = process.cwd();
  let ids: string[];
  try {
    let skipped: string[];
    ({ ids, skipped } = parseTargets(args.filter((a) => a !== "--write-manifest").join(" "), imageIds(root)));
    skipped.forEach((id) => console.log(skipMessage(id)));
  } catch (err) {
    console.error(`${err instanceof Error ? err.message : err}\nUsage: tsx scripts/build-tiles.ts <id ...|all> [--write-manifest]`);
    process.exit(1);
  }
  if (writeManifest) {
    ids.forEach((id) => writeExpected(id, root));
    console.log(`Wrote the tiles block of ${ids.join(", ")}`);
    return;
  }
  const vips = await Vips();
  process.exitCode = await run(ids, {
    root,
    fetchSource: (src) => fetchSource(src, { cacheDir: join(root, ".cache", "sources") }),
    decode: decodeJp2,
    tile: async (input, outDir, crop) => (await tileImage(vips, { input, outDir, crop })).tiles,
    log: (l) => console.log(l),
  });
};

if (process.argv[1]?.endsWith("build-tiles.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
