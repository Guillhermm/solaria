import { applySimilarity, fitSimilarity, residuals } from "../registration";
import type { BandSet, ComparePair, ControlPoint, ImageManifest, Journey, Registration, Source, Stop } from "../types";

const approved = { status: "approved", date: "2026-11-17", notes: "fixture" } as const;
const SHA = "a".repeat(64);

export const source = (): Source => ({
  id: "demo",
  title: "Demo",
  pageUrl: "https://example.org/demo",
  fileUrl: "https://example.org/demo.tif",
  releaseId: "demo01",
  releasedAt: "2025-01-16",
  credit: "Demo credit",
  terms: { name: "CC BY 4.0", url: "https://example.org/terms" },
  retrievedAt: "2026-11-17",
  file: { format: "tif", bytes: 1000, sha256: SHA, width: 1000, height: 300 },
  validation: { ...approved },
  mock: false,
});

const claim = <T>(value: T) => ({ value, source: "docs/science/sources.md#1", status: "supported" as const });

export const image = (): ImageManifest => ({
  id: "demo",
  sourceId: "demo",
  title: "Demo image",
  target: claim({ name: "M31", type: "galaxy" }),
  observatory: claim("Hubble"),
  instruments: claim(["ACS"]),
  bands: claim([{ id: "F475W", wavelength: { value: 475, unit: "nm" as const }, kind: "broadband" as const }]),
  colorMapping: claim({ kind: "per-band" as const, entries: [{ bandId: "F475W", color: "blue" }] }),
  releasedAt: claim("2025-01-16"),
  productType: claim("mosaic" as const),
  tiles: {
    format: "jpg",
    tileSize: 256,
    overlap: 0,
    width: 1000,
    height: 300,
    minLevel: 0,
    maxLevel: 2,
    thumbnail: { width: 512, height: 154 },
    preview: { width: 1000, height: 300 },
  },
  validation: { ...approved },
  mock: false,
});

export const stop = (id: string): Stop => ({
  id,
  title: `Stop ${id}`,
  body: "Text.",
  viewport: { x: 500, y: 150, z: 2 },
  sources: [{ label: "Source", url: "https://example.org/demo" }],
  validation: { ...approved },
});

export const journey = (): Journey => ({
  slug: "demo-tour",
  imageId: "demo",
  title: "Demo journey",
  summary: "Summary.",
  stops: ["a", "b", "c", "d", "e"].map(stop),
  validation: { ...approved },
  mock: false,
});

// demo-b, 1000 x 300 like demo, lands on demo at half scale turned 10 degrees.
export const DEMO_SIMILARITY = { scale: 0.5, rotationDeg: 10, tx: 300, ty: 40 };

export const controlPoints = (): ControlPoint[] =>
  [[100, 50], [900, 50], [500, 150], [100, 250], [900, 250], [300, 200]].map(([x, y], i) => ({
    label: `star ${i + 1}`,
    moving: { x, y },
    reference: applySimilarity(DEMO_SIMILARITY, { x, y }),
  }));

export const similarityRegistration = (points = controlPoints()): Registration => {
  const similarity = fitSimilarity(points);
  const r = residuals(similarity, points);
  return { method: "similarity, least squares on star control points", transform: "similarity", controlPoints: points, similarity, residualPx: r.rms, maxResidualPx: r.max };
};

const group = () => ({
  differs: { instrument: false, band: false, date: true, illumination: false, geometry: false, processing: false },
  registration: { method: "none, same grid", transform: "none", residualPx: 0 } as Registration,
  whatDiffers: "Only the date differs.",
  validation: { ...approved },
  mock: false,
});

export const pair = (): ComparePair => ({
  id: "demo-pair",
  title: "Demo pair",
  imageIds: ["demo", "demo-b"],
  reference: "demo",
  headline: "Same field, years apart",
  labels: [{ full: "2014, demo camera", short: "2014" }, { full: "1995, demo camera", short: "1995" }],
  ...group(),
  registration: similarityRegistration(),
});

export const bandSet = (): BandSet => ({
  id: "demo-bands",
  title: "Demo bands",
  imageIds: ["demo", "demo-b", "demo-c"],
  ...group(),
});

export const files = (): { path: string; raw: unknown }[] => [
  { path: "data/sources/demo.json", raw: source() },
  { path: "data/images/demo.json", raw: image() },
  { path: "data/journeys/demo-tour.json", raw: journey() },
];
