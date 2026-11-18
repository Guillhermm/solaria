import { describe, expect, it } from "vitest";
import { validateContent } from "../src/content/validate";
import { publishProblems } from "../src/content/gate";
import { fitSimilarity, residuals } from "../src/content/registration";
import {
  COMPARE_SPECS,
  MOCK_BAND_SET,
  MOCK_FOOTPRINT,
  MOCK_PAIR,
  MOCK_SIMILARITY,
  MOVING,
  SPECS,
  mockControlPoints,
  mockImage,
  mockSource,
  movingPixels,
  referencePixels,
  synthPixels,
} from "./generate-mock";

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

describe("the rotated Compare mock", () => {
  const moving = movingPixels();
  const at = (x: number, y: number) => {
    const o = (Math.floor(y) * MOVING.width + Math.floor(x)) * 3;
    return [moving[o], moving[o + 1], moving[o + 2]];
  };

  it("refits its own control points to the transform it was drawn with", () => {
    const points = mockControlPoints();
    const fit = fitSimilarity(points);
    expect(residuals(fit, points).max).toBeLessThan(1e-6);
    expect(fit.scale).toBeCloseTo(MOCK_SIMILARITY.scale, 12);
    expect(fit.rotationDeg).toBeCloseTo(7.3, 12);
    expect(MOCK_PAIR.registration.transform === "similarity" && MOCK_PAIR.registration.residualPx).toBeLessThan(1e-6);
  });
  it("draws each star where its control point says, in both images", () => {
    const ref = referencePixels();
    for (const cp of mockControlPoints()) {
      expect(ref[(Math.floor(cp.reference.y) * 1024 + Math.floor(cp.reference.x)) * 3]).toBe(255);
      // The moving image is cool: a star there is bright in blue.
      expect(at(cp.moving.x, cp.moving.y)[2]).toBeGreaterThan(200);
    }
  });
  it("leaves the stepped corner black and keeps the footprint inside the data", () => {
    expect(at(MOVING.width - 1, 0)).toEqual([0, 0, 0]);
    expect(at(210, 5)).toEqual([0, 0, 0]);
    for (const v of MOCK_FOOTPRINT[0]) {
      const near = at(Math.min(v.x, MOVING.width - 1), Math.min(v.y, MOVING.height - 1));
      expect(near.some((c) => c > 0)).toBe(true);
    }
  });
  it("tints the two images apart: warm reference, cool moving image", () => {
    const ref = referencePixels();
    expect(ref[0]).toBeGreaterThan(ref[2]);
    const [r, , b] = at(20, 200);
    expect(b).toBeGreaterThan(r * 1.5);
  });
});

describe("mock records", () => {
  const files = [
    ...[...COMPARE_SPECS, ...SPECS].flatMap((s) => [
      { path: `data/mock/sources/${s.id}.json`, raw: mockSource(s, { bytes: 10, sha256: "a".repeat(64) }) },
      { path: `data/mock/images/${s.id}.json`, raw: mockImage(s, { ...tiles, width: s.width ?? 1024, height: s.height ?? 512 }) },
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
    expect(problems.filter((p) => p.endsWith("mock content cannot be published"))).toHaveLength((SPECS.length + COMPARE_SPECS.length) * 2 + 2);
  });
});
