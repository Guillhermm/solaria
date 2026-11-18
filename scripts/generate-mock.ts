import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Vips from "wasm-vips";
import { applySimilarity, fitSimilarity, invertSimilarity, residuals } from "../src/content/registration";
import type { BandSet, ComparePair, ImageManifest, Similarity, Source } from "../src/content/types";
import { cutPyramid, tilesBlock, writeThumbnails } from "./generate-tiles";

const W = 1024;
const H = 512;
const TILE = 256;
const MAX_LEVEL = 2;

// A grid with one disc. Only the disc changes between images, so a wipe or a crossfade shows it.
interface Disc {
  x: number;
  y: number;
  r: number;
  value: number;
}

export const synthPixels = (disc: Disc, tint: [number, number, number]) => {
  const px = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const grid = x % 64 === 0 || y % 64 === 0;
      const inside = (x - disc.x) ** 2 + (y - disc.y) ** 2 <= disc.r ** 2;
      const v = inside ? disc.value : grid ? 90 : 30 + Math.round((x / W) * 20);
      const o = (y * W + x) * 3;
      px[o] = Math.round((v * tint[0]) / 255);
      px[o + 1] = Math.round((v * tint[1]) / 255);
      px[o + 2] = Math.round((v * tint[2]) / 255);
    }
  }
  return px;
};

interface Spec {
  id: string;
  title: string;
  disc: Disc;
  tint: [number, number, number];
  band: string;
  color: string;
  // Synthetic numbers so the Light rail has wavelengths and regions to show; not real bands.
  wavelength?: { value: number; unit: "Å" };
  region?: string;
  width?: number; // default W x H
  height?: number;
  maxLevel?: number; // default MAX_LEVEL
}

// The Compare mock mirrors the Hubble pair's geometry: the moving image has coarser pixels
// (scale 2), is turned 7.3 degrees, and misses a stepped corner, as the WFPC2 mosaic does.
// It also reaches past the top and bottom of the reference frame, as Webb will.
// The scene is drawn in units of a 1024 x 512 grid; the reference renders it K times larger,
// so OpenSeadragon lets a viewer zoom in past the fit (its pixel-ratio limit is 1.1).
const K = 4;
export const REFERENCE = { width: W * K, height: H * K };
const REFERENCE_MAX_LEVEL = 4;
export const MOVING = { width: 400, height: 240 };
const MOVING_CENTER_ON_REFERENCE = { x: 560 * K, y: 250 * K };
const ROTATION = 7.3;
const SCALE = 2 * K;
const turn = applySimilarity({ scale: SCALE, rotationDeg: ROTATION, tx: 0, ty: 0 }, { x: MOVING.width / 2, y: MOVING.height / 2 });
export const MOCK_SIMILARITY: Similarity = {
  scale: SCALE,
  rotationDeg: ROTATION,
  tx: MOVING_CENTER_ON_REFERENCE.x - turn.x,
  ty: MOVING_CENTER_ON_REFERENCE.y - turn.y,
};

// The empty corner, stepped: the moving image is black where x >= from and y < depth.
const NOTCH = [
  { from: 200, depth: 60 },
  { from: 270, depth: 90 },
  { from: 340, depth: 120 },
];
const inNotch = (x: number, y: number) => NOTCH.some((n) => x >= n.from && y < n.depth);

// The data area, inset 2 px from the black, in moving pixels.
export const MOCK_FOOTPRINT = [[
  { x: 2, y: 2 }, { x: 198, y: 2 }, { x: 198, y: 62 }, { x: 268, y: 62 }, { x: 268, y: 92 },
  { x: 338, y: 92 }, { x: 338, y: 122 }, { x: MOVING.width - 2, y: 122 },
  { x: MOVING.width - 2, y: MOVING.height - 2 }, { x: 2, y: MOVING.height - 2 },
]];

// Stars in reference pixels; every one lands inside the moving image's data area.
const STARS = [
  { x: 260, y: 120 }, { x: 330, y: 360 }, { x: 470, y: 90 }, { x: 520, y: 400 },
  { x: 640, y: 300 }, { x: 730, y: 300 }, { x: 820, y: 380 }, { x: 410, y: 250 },
];
const STAR_R = 5;

// The sky both images show, in scene units: a gradient, a grid, stars and a disc.
export const scene = (x: number, y: number, disc: Disc) => {
  if (STARS.some((s) => (x - s.x) ** 2 + (y - s.y) ** 2 <= STAR_R ** 2)) return 255;
  if ((x - disc.x) ** 2 + (y - disc.y) ** 2 <= disc.r ** 2) return disc.value;
  const mod = (v: number) => ((v % 64) + 64) % 64;
  if (mod(x) < 3 || mod(y) < 3) return 110;
  return 30 + Math.round((x / W) * 20);
};

const BEFORE_DISC: Disc = { x: 400, y: 250, r: 110, value: 200 };
const AFTER_DISC: Disc = { x: 470, y: 280, r: 150, value: 240 };
// Warm reference, cool moving image: a pixel probe tells them apart by color.
const WARM: [number, number, number] = [255, 235, 210];
const COOL: [number, number, number] = [140, 190, 255];

const tinted = (px: Uint8Array, o: number, v: number, tint: [number, number, number]) => {
  for (let k = 0; k < 3; k++) px[o + k] = Math.round((v * tint[k]) / 255);
};

export const referencePixels = () => {
  const { width, height } = REFERENCE;
  const px = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) tinted(px, (y * width + x) * 3, scene((x + 0.5) / K, (y + 0.5) / K, BEFORE_DISC), WARM);
  }
  return px;
};

// Each moving pixel averages 3 x 3 samples of the scene where the similarity puts it.
export const movingPixels = () => {
  const { width, height } = MOVING;
  const px = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (inNotch(x, y)) continue;
      let sum = 0;
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const q = applySimilarity(MOCK_SIMILARITY, { x: x + (i + 0.5) / 3, y: y + (j + 0.5) / 3 });
          sum += scene(q.x / K, q.y / K, AFTER_DISC);
        }
      }
      tinted(px, (y * width + x) * 3, sum / 9, COOL);
    }
  }
  return px;
};

export const mockControlPoints = () => {
  const back = invertSimilarity(MOCK_SIMILARITY);
  return STARS.map((s, i) => {
    const reference = { x: s.x * K, y: s.y * K };
    return { label: `star ${String.fromCharCode(65 + i)}`, moving: applySimilarity(back, reference), reference };
  });
};

export const COMPARE_SPECS: Spec[] = [
  { id: "mock-compare-before", title: "Mock Compare, before", disc: BEFORE_DISC, tint: WARM, band: "mock-gray", color: "gray", ...REFERENCE, maxLevel: REFERENCE_MAX_LEVEL },
  { id: "mock-compare-after", title: "Mock Compare, after", disc: AFTER_DISC, tint: COOL, band: "mock-gray", color: "gray", ...MOVING },
];

export const SPECS: Spec[] = [
  { id: "mock-light-a", title: "Mock Light, band A", disc: { x: 512, y: 256, r: 60, value: 230 }, tint: [255, 80, 80], band: "mock-a", color: "red", wavelength: { value: 171, unit: "Å" }, region: "extreme ultraviolet" },
  { id: "mock-light-b", title: "Mock Light, band B", disc: { x: 512, y: 256, r: 130, value: 230 }, tint: [80, 255, 80], band: "mock-b", color: "green", wavelength: { value: 1700, unit: "Å" }, region: "ultraviolet" },
  { id: "mock-light-c", title: "Mock Light, band C", disc: { x: 512, y: 256, r: 200, value: 230 }, tint: [80, 80, 255], band: "mock-c", color: "blue", wavelength: { value: 6173, unit: "Å" }, region: "visible" },
];

const DRAFT = { status: "draft", date: null, notes: "Synthetic test content, never validated." } as const;
const claim = <T>(value: T) => ({ value, source: "docs/science/compare-and-light.md#3", status: "unverified" as const });

export const mockSource = (spec: Spec, file: { bytes: number; sha256: string }): Source => ({
  id: spec.id,
  title: spec.title,
  pageUrl: "https://example.org/mock",
  fileUrl: `https://example.org/mock/${spec.id}.png`,
  releaseId: null,
  releasedAt: "2026-11-17",
  credit: "Synthetic test image generated by scripts/generate-mock.ts. Not NASA data.",
  terms: { name: "Not for publication", url: "https://example.org/mock" },
  retrievedAt: "2026-11-17",
  file: { format: "png", ...file, width: spec.width ?? W, height: spec.height ?? H },
  validation: { ...DRAFT },
  mock: true,
});

export const mockImage = (spec: Spec, tiles: ImageManifest["tiles"]): ImageManifest => ({
  id: spec.id,
  sourceId: spec.id,
  title: spec.title,
  target: claim({ name: "Synthetic grid", type: "test pattern" }),
  observatory: claim("None (synthetic)"),
  instruments: claim(["None"]),
  bands: claim([{ id: spec.band, ...(spec.wavelength ? { wavelength: spec.wavelength } : {}), ...(spec.region ? { region: spec.region } : {}) }]),
  colorMapping: claim({ kind: "per-band" as const, entries: [{ bandId: spec.band, color: spec.color }] }),
  releasedAt: claim("2026-11-17"),
  productType: claim("single exposure" as const),
  caveats: ["Synthetic test pattern. It shows nothing about the sky."],
  ...(spec.id === "mock-compare-after" ? { footprint: MOCK_FOOTPRINT } : {}),
  tiles,
  validation: { ...DRAFT },
  mock: true,
});

const registration = { method: "none, same synthetic grid", transform: "none" as const, residualPx: 0 as const };

const mockRegistration = (): ComparePair["registration"] => {
  const controlPoints = mockControlPoints();
  const similarity = fitSimilarity(controlPoints);
  const r = residuals(similarity, controlPoints);
  return {
    method: "similarity, least squares on exact synthetic star positions",
    transform: "similarity",
    controlPoints,
    similarity,
    residualPx: r.rms,
    maxResidualPx: r.max,
  };
};

export const MOCK_PAIR: ComparePair = {
  id: "mock-compare",
  title: "Mock Compare pair",
  imageIds: ["mock-compare-before", "mock-compare-after"],
  reference: "mock-compare-before",
  headline: "Synthetic: the disc grows",
  labels: [{ full: "Before, synthetic", short: "Before" }, { full: "After, synthetic", short: "After" }],
  differs: { instrument: false, band: false, date: true, illumination: false, geometry: true, processing: false },
  registration: mockRegistration(),
  whatDiffers:
    "Synthetic. The second image has pixels twice as coarse, is turned 7.3 degrees and misses a stepped corner. The disc is larger and shifted; the stars and the grid do not move.",
  validation: { ...DRAFT },
  mock: true,
};

export const MOCK_BAND_SET: BandSet = {
  id: "mock-light",
  title: "Mock Light band set",
  imageIds: ["mock-light-a", "mock-light-b", "mock-light-c"],
  differs: { instrument: false, band: true, date: false, illumination: false, geometry: false, processing: false },
  registration,
  whatDiffers: "Synthetic. Each band shows a disc of a different radius in its own color; nothing else changes.",
  validation: { ...DRAFT },
  mock: true,
};

const writeJson = (path: string, value: unknown) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const main = async () => {
  const vips = await Vips();
  const pixels = (spec: Spec) =>
    spec.id === "mock-compare-before" ? referencePixels() : spec.id === "mock-compare-after" ? movingPixels() : synthPixels(spec.disc, spec.tint);
  for (const spec of [...COMPARE_SPECS, ...SPECS]) {
    const width = spec.width ?? W;
    const height = spec.height ?? H;
    const image = vips.Image.newFromMemory(pixels(spec), width, height, 3, vips.BandFormat.uchar);
    const png = Buffer.from(image.writeToBuffer(".png"));
    const outDir = join("public", "tiles", spec.id);
    const maxLevel = spec.maxLevel ?? MAX_LEVEL;
    await cutPyramid(image, outDir, { tileSize: TILE, maxLevel });
    const sizes = await writeThumbnails(image, outDir);
    const sha256 = createHash("sha256").update(png).digest("hex");
    writeJson(join("data", "mock", "sources", `${spec.id}.json`), mockSource(spec, { bytes: png.length, sha256 }));
    writeJson(join("data", "mock", "images", `${spec.id}.json`), mockImage(spec, tilesBlock(width, height, TILE, maxLevel, sizes)));
  }
  writeJson(join("data", "mock", "pairs", `${MOCK_PAIR.id}.json`), MOCK_PAIR);
  writeJson(join("data", "mock", "band-sets", `${MOCK_BAND_SET.id}.json`), MOCK_BAND_SET);
  console.log("Wrote the mock sources, images, pair, band set and tiles");
};

if (process.argv[1]?.endsWith("generate-mock.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
