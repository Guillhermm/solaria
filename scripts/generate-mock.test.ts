import { describe, expect, it } from "vitest";
import { validateContent } from "../src/content/validate";
import { publishProblems } from "../src/content/gate";
import { MOCK_BAND_SET, MOCK_PAIR, SPECS, mockImage, mockSource, synthPixels } from "./generate-mock";

const tiles = {
  format: "jpg" as const, tileSize: 256, overlap: 0 as const, width: 1024, height: 512,
  minLevel: 0 as const, maxLevel: 2, thumbnail: { width: 512, height: 256 }, preview: { width: 1024, height: 512 },
};

describe("synthPixels", () => {
  const disc = { x: 100, y: 100, r: 10, value: 200 };
  const at = (px: Uint8Array, x: number, y: number) => px[(y * 1024 + x) * 3];

  it("fills the frame with three bands", () => {
    expect(synthPixels(disc, [255, 255, 255])).toHaveLength(1024 * 512 * 3);
  });
  it("draws the disc, the grid and the background apart", () => {
    const px = synthPixels(disc, [255, 255, 255]);
    expect(at(px, 100, 100)).toBe(200);
    expect(at(px, 64, 300)).toBe(90);
    expect(at(px, 65, 300)).toBeLessThan(60);
  });
  it("applies the tint per band", () => {
    const px = synthPixels(disc, [255, 0, 0]);
    expect([px[(100 * 1024 + 100) * 3], px[(100 * 1024 + 100) * 3 + 1]]).toEqual([200, 0]);
  });
});

describe("mock records", () => {
  const files = [
    ...SPECS.flatMap((s) => [
      { path: `data/mock/sources/${s.id}.json`, raw: mockSource(s, { bytes: 10, sha256: "a".repeat(64) }) },
      { path: `data/mock/images/${s.id}.json`, raw: mockImage(s, tiles) },
    ]),
    { path: `data/mock/pairs/${MOCK_PAIR.id}.json`, raw: MOCK_PAIR },
    { path: `data/mock/band-sets/${MOCK_BAND_SET.id}.json`, raw: MOCK_BAND_SET },
  ];

  it("validate together", () => {
    const r = validateContent(files);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });
  it("are all blocked by the production gate", () => {
    const r = validateContent(files);
    const problems = r.ok ? publishProblems(r.value) : [];
    expect(problems.filter((p) => p.endsWith("mock content cannot be published"))).toHaveLength(SPECS.length * 2 + 2);
  });
});
