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

  it("loads the mock pair and band set in development", () => {
    const c = loadContent({ root: process.cwd(), mode: "development" });
    expect(c.pairs.map((p) => p.id)).toEqual(["mock-compare"]);
    expect(c.bandSets.map((b) => b.id)).toEqual(["mock-light"]);
    expect([...c.pairs, ...c.bandSets].every((g) => g.mock)).toBe(true);
  });

  it("leaves the mock pair and band set out of a production load", () => {
    const c = loadContent({ root: process.cwd(), mode: "production" });
    expect([c.pairs.length, c.bandSets.length]).toEqual([0, 0]);
    expect(c.images.some((i) => i.mock)).toBe(false);
  });
});
