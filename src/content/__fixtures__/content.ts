import type { ImageManifest, Journey, Source, Stop } from "../types";

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
  slug: "demo",
  imageId: "demo",
  title: "Demo journey",
  summary: "Summary.",
  stops: ["a", "b", "c", "d", "e"].map(stop),
  validation: { ...approved },
  mock: false,
});

export const files = (): { path: string; raw: unknown }[] => [
  { path: "data/sources/demo.json", raw: source() },
  { path: "data/images/demo.json", raw: image() },
  { path: "data/journeys/demo.json", raw: journey() },
];
