import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadContent } from "./load";
import { validateContent } from "./validate";

const DATA = join(process.cwd(), "data");

const readKind = (kind: string) => {
  const dir = join(DATA, kind);
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ path: `data/${kind}/${f}`, raw: JSON.parse(readFileSync(join(dir, f), "utf8")) as unknown }));
  } catch {
    return [];
  }
};

describe("the real data directory", () => {
  it("validates", () => {
    const files = ["sources", "images", "journeys", "pairs", "band-sets", "labels"].flatMap(readKind);
    const r = validateContent(files);
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(files.length).toBeGreaterThan(0);
  });

  it("carries the Andromeda source checked in docs/science/andromeda.md", () => {
    const [src] = readKind("sources").filter((f) => f.path.endsWith("andromeda-phat-phast-2025.json"));
    expect(src.raw).toMatchObject({
      releaseId: "heic2501a",
      releasedAt: "2025-01-16",
      credit:
        "NASA, ESA, Benjamin Williams (UWashington), Zhuo Chen (UWashington), L. Clifton Johnson (Northwestern); Image Processing: Joseph DePasquale (STScI)",
      file: { width: 42208, height: 9870 },
    });
  });

  it("passes the production gate", () => {
    expect(() => loadContent({ root: process.cwd(), mode: "production" })).not.toThrow();
  });

  it("loads the mock and the Hubble pairs and both band sets in development", () => {
    const c = loadContent({ root: process.cwd(), mode: "development" });
    expect(c.pairs.map((p) => p.id)).toEqual(["pillars-hubble-1995-2014", "mock-compare"]);
    expect(c.bandSets.map((b) => [b.id, b.mock, b.validation.status])).toEqual([
      ["sun-sdo-2024-05-10", false, "approved"],
      ["mock-light", true, "draft"],
    ]);
  });

  // G-02 and G-03: docs/science/sun-sdo.md.
  it("publishes the SDO set with a note per band, its kind, and no release date", () => {
    const c = loadContent({ root: process.cwd(), mode: "production" });
    const sun = c.bandSets.find((b) => b.id === "sun-sdo-2024-05-10")!;
    expect(sun.whatDiffers).toContain("NOAA active region 13664 is on the disk, lower right.");
    expect(sun.differs).toEqual({ instrument: true, band: true, date: false, illumination: false, geometry: false, processing: false });
    expect(sun.registration).toMatchObject({ transform: "none", residualPx: 2.05 });
    const images = sun.imageIds.map((id) => c.images.find((i) => i.id === id)!);
    expect(images.map((i) => [i.bands.value[0].wavelength?.value, i.bands.value[0].region])).toEqual([
      [94, "extreme ultraviolet"], [171, "extreme ultraviolet"], [193, "extreme ultraviolet"], [211, "extreme ultraviolet"],
      [304, "extreme ultraviolet"], [1700, "ultraviolet"], [6173, "visible"],
    ]);
    expect(images[0].bands.value[0].shows).toContain("about 6.3 million K");
    // HMI's continuum is computed from 12 filtergrams; each AIA frame is one exposure.
    expect(images.map((i) => [i.productType.value, i.productType.status])).toEqual([
      ...Array(6).fill(["single exposure", "supported"]),
      ["stack", "supported"],
    ]);
    expect(images[6].processing?.value).toBe("Continuum intensity computed from 12 filtergrams over 45 s (Couvidat et al. 2016)");
    expect(images[6].bands.value[0].shows).not.toContain("beside");
    expect(images[5].bands.value[0].shows).not.toContain("just above");
    for (const i of images) {
      expect(i.bands.value[0].shows).toBeTruthy();
      expect(i.releasedAt).toBeUndefined();
      expect([i.tiles.width, i.tiles.height]).toEqual([4096, 4096]);
      const src = c.sources.find((s) => s.id === i.sourceId)!;
      expect([src.releasedAt, src.credit]).toEqual([null, "Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams."]);
    }
  });

  it("publishes the Sun Journey through that set, each stop's band one of its images", () => {
    const c = loadContent({ root: process.cwd(), mode: "production" });
    const sun = c.journeys.find((j) => j.slug === "sun")!;
    const set = c.bandSets.find((b) => b.id === sun.bandSetId)!;
    expect(sun.imageId).toBe(set.imageIds[0]);
    expect(sun.stops.map((s) => s.band?.replace("sun-sdo-2024-05-10-", "") ?? null)).toEqual([
      "hmi-6173", "hmi-6173", "aia-304", "aia-171", "aia-211", "aia-193", null,
    ]);
  });

  it("publishes the approved Hubble pair and its images", () => {
    const prod = loadContent({ root: process.cwd(), mode: "production" });
    expect(prod.pairs.map((p) => [p.id, p.validation.status])).toEqual([["pillars-hubble-1995-2014", "approved"]]);
    expect(prod.images.map((i) => i.id)).toEqual(expect.arrayContaining(["pillars-hubble-1995", "pillars-hubble-2014"]));
  });

  it("leaves the mock pair and band set out of a production load", () => {
    const c = loadContent({ root: process.cwd(), mode: "production" });
    expect([c.pairs.some((p) => p.mock), c.bandSets.map((b) => b.id)]).toEqual([false, ["sun-sdo-2024-05-10"]]);
    expect(c.images.some((i) => i.mock)).toBe(false);
  });
});

// design.md 14.2: exactly the validated set of 2026-11-17 (docs/science/feature-labels.md).
describe("feature labels", () => {
  it("are the four validated labels, at their checked positions", () => {
    const { labels } = loadContent({ root: process.cwd(), mode: "production" });
    const all = labels.flatMap((set) => set.labels.map((l) => [set.id, l.id, l.text, l.x, l.y, l.r ?? null]));
    expect(all).toEqual([
      ["andromeda-phat-phast-2025", "andromeda-core", "Andromeda core", 17461, 6482, null],
      ["andromeda-phat-phast-2025", "andromeda-m32", "Satellite galaxy M32", 11412, 2448, null],
      ["andromeda-phat-phast-2025", "andromeda-ngc206", "NGC 206", 5330, 7260, null],
      ["sun-sdo-2024-05-10", "sun-ar-13664", "Active region 13664", 3020, 2508, 240],
    ]);
  });
});
