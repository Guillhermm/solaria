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
    const files = ["sources", "images", "journeys", "pairs", "band-sets"].flatMap(readKind);
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

  it("loads the mock and the Hubble pairs, the mock band set and the staged SDO set in development", () => {
    const c = loadContent({ root: process.cwd(), mode: "development" });
    expect(c.pairs.map((p) => p.id)).toEqual(["pillars-hubble-1995-2014", "mock-compare"]);
    expect(c.bandSets.map((b) => [b.id, b.mock, b.validation.status])).toEqual([
      ["mock-light", true, "draft"],
      ["sun-sdo-2024-05-10", false, "draft"],
    ]);
  });

  // G-02: drafts only; every note and caption waits for G-03.
  it("stages the SDO set with no note, caveat or band region written", () => {
    const c = loadContent({ root: process.cwd(), mode: "development" });
    const sun = c.bandSets.find((b) => b.id === "sun-sdo-2024-05-10")!;
    expect(sun.whatDiffers).toBe("");
    expect(sun.registration).toMatchObject({ transform: "none", residualPx: 2.05 });
    const images = sun.imageIds.map((id) => c.images.find((i) => i.id === id)!);
    expect(images.map((i) => i.bands.value[0].wavelength?.value)).toEqual([94, 171, 193, 211, 304, 1700, 6173]);
    for (const i of images) {
      expect(i.caveats).toBeUndefined();
      expect(i.bands.value[0].region).toBeUndefined();
      expect([i.tiles.width, i.tiles.height]).toEqual([4096, 4096]);
      expect(c.sources.find((s) => s.id === i.sourceId)!.credit).toBe("Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams.");
    }
  });

  it("publishes the approved Hubble pair and its images", () => {
    const prod = loadContent({ root: process.cwd(), mode: "production" });
    expect(prod.pairs.map((p) => [p.id, p.validation.status])).toEqual([["pillars-hubble-1995-2014", "approved"]]);
    expect(prod.images.map((i) => i.id)).toEqual(expect.arrayContaining(["pillars-hubble-1995", "pillars-hubble-2014"]));
  });

  it("leaves the mock pair and band set out of a production load", () => {
    const c = loadContent({ root: process.cwd(), mode: "production" });
    expect([c.pairs.some((p) => p.mock), c.bandSets.length]).toEqual([false, 0]);
    expect(c.images.some((i) => i.mock)).toBe(false);
  });
});
