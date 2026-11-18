import { describe, expect, it } from "vitest";
import { applySimilarity, fitSimilarity, invertSimilarity, residuals } from "./registration";
import type { ControlPoint, Similarity } from "./types";

const TRUE: Similarity = { scale: 2.47, rotationDeg: 7.3, tx: 812.5, ty: -140.25 };

// A fixed pseudo-random sequence, so a failure reproduces.
const rng = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
};

const pointsFor = (s: Similarity, n: number, noise = 0, seed = 7): ControlPoint[] => {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const moving = { x: r() * 1500, y: r() * 1500 };
    const q = applySimilarity(s, moving);
    return { label: `star ${i}`, moving, reference: { x: q.x + (r() - 0.5) * 2 * noise, y: q.y + (r() - 0.5) * 2 * noise } };
  });
};

describe("applySimilarity", () => {
  it("turns clockwise on screen for a positive angle, with y down", () => {
    const q = applySimilarity({ scale: 1, rotationDeg: 90, tx: 0, ty: 0 }, { x: 1, y: 0 });
    expect(q.x).toBeCloseTo(0, 12);
    expect(q.y).toBeCloseTo(1, 12);
  });
});

describe("fitSimilarity", () => {
  it("recovers a known transform from exact points with zero residual", () => {
    const pts = pointsFor(TRUE, 8);
    const s = fitSimilarity(pts);
    expect(s.scale).toBeCloseTo(TRUE.scale, 10);
    expect(s.rotationDeg).toBeCloseTo(TRUE.rotationDeg, 10);
    expect(s.tx).toBeCloseTo(TRUE.tx, 7);
    expect(s.ty).toBeCloseTo(TRUE.ty, 7);
    expect(residuals(s, pts).max).toBeLessThan(1e-8);
  });

  it("leaves a residual near the noise on noisy points", () => {
    const pts = pointsFor(TRUE, 40, 1.5);
    const s = fitSimilarity(pts);
    const { rms } = residuals(s, pts);
    expect(s.rotationDeg).toBeCloseTo(TRUE.rotationDeg, 1);
    expect(Math.abs(s.scale / TRUE.scale - 1)).toBeLessThan(1e-3);
    // Uniform noise of half-width 1.5 on each axis has an RMS distance of sqrt(2 * 1.5^2 / 3).
    expect(rms).toBeGreaterThan(0.6);
    expect(rms).toBeLessThan(1.5);
  });

  it("does not depend on the order of the points", () => {
    const pts = pointsFor(TRUE, 10, 1);
    const a = fitSimilarity(pts);
    const b = fitSimilarity([...pts].reverse());
    expect(b.scale).toBeCloseTo(a.scale, 12);
    expect(b.rotationDeg).toBeCloseTo(a.rotationDeg, 10);
    expect(b.tx).toBeCloseTo(a.tx, 8);
    expect(b.ty).toBeCloseTo(a.ty, 8);
  });

  it("shows a mirrored set as a large residual, never as a fit", () => {
    const pts = pointsFor(TRUE, 8).map((c) => ({ ...c, moving: { x: -c.moving.x, y: c.moving.y } }));
    expect(residuals(fitSimilarity(pts), pts).rms).toBeGreaterThan(100);
  });

  it("refuses points that cannot fix a transform", () => {
    expect(() => fitSimilarity(pointsFor(TRUE, 1))).toThrow("at least 2");
    const same = { x: 3, y: 4 };
    expect(() => fitSimilarity([{ label: "a", moving: same, reference: same }, { label: "b", moving: same, reference: { x: 9, y: 9 } }])).toThrow("coincide");
  });
});

describe("invertSimilarity", () => {
  it("maps reference pixels back onto the moving image", () => {
    const back = invertSimilarity(TRUE);
    const p = { x: 123.4, y: 987.6 };
    const round = applySimilarity(back, applySimilarity(TRUE, p));
    expect(round.x).toBeCloseTo(p.x, 9);
    expect(round.y).toBeCloseTo(p.y, 9);
  });
});
