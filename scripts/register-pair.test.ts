import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applySimilarity } from "../src/content/registration";
import type { ControlPoint } from "../src/content/types";
import { register, updatePair } from "./register-pair";

const TRUE = { scale: 2.4, rotationDeg: 7.3, tx: 1900, ty: 300 };

const synthetic = (noise: number[]): ControlPoint[] =>
  [[100, 100], [1400, 120], [700, 700], [80, 1400], [1450, 1300], [900, 1100], [300, 900], [1200, 500]].map(([x, y], i) => {
    const q = applySimilarity(TRUE, { x, y });
    return { label: `star ${i + 1}`, moving: { x, y }, reference: { x: q.x + noise[i % noise.length], y: q.y - noise[i % noise.length] } };
  });

describe("register", () => {
  it("recovers the transform from exact synthetic points", () => {
    const r = register(synthetic([0]));
    expect(r.similarity.scale).toBeCloseTo(2.4, 10);
    expect(r.similarity.rotationDeg).toBeCloseTo(7.3, 10);
    expect(r.residualPx).toBeLessThan(1e-9);
    expect(r.lines).toHaveLength(10);
    expect(r.lines.at(-2)).toBe("scale 2.40000  rotation 7.3000 deg  translation (1900.00, 300.00)");
  });
  it("reports one line per point with its residual in both images' pixels", () => {
    const r = register(synthetic([1, -1, 0.5, 0]));
    expect(r.lines[0]).toMatch(/^star 1 +dx +-?\d+\.\d\d +dy +-?\d+\.\d\d +residual \d+\.\d\d reference px, \d+\.\d\d moving px$/);
    expect(r.residualPx).toBeGreaterThan(0.3);
  });
  it("refuses fewer than 6 points", () => {
    expect(() => register(synthetic([0]).slice(0, 5))).toThrow("at least 6");
  });
});

describe("updatePair", () => {
  it("replaces only the fitted fields", () => {
    const raw: Record<string, unknown> = {
      id: "p",
      registration: { method: "m", transform: "similarity", controlPoints: synthetic([0]), similarity: { scale: 1, rotationDeg: 0, tx: 0, ty: 0 }, residualPx: 9, maxResidualPx: 9 },
    };
    updatePair(raw);
    const reg = raw.registration as Record<string, number | object | string>;
    expect(Object.keys(reg)).toEqual(["method", "transform", "controlPoints", "similarity", "residualPx", "maxResidualPx"]);
    expect(reg.method).toBe("m");
    expect(reg.residualPx as number).toBeLessThan(1e-9);
  });
  it("refuses a pair that is not registered by similarity", () => {
    expect(() => updatePair({ registration: { transform: "none" } })).toThrow('must be "similarity"');
  });
});

describe("the Hubble 1995 and 2014 pair", () => {
  const pair = JSON.parse(readFileSync("data/pairs/pillars-hubble-1995-2014.json", "utf8"));

  it("reproduces the science review's fit from the stored control points", () => {
    const r = register(pair.registration.controlPoints);
    // docs/science/pillars.md, part 2: s = 2.48041, rotation +7.3167, t = (1922.68, 290.55),
    // RMS 2.50 px and worst 6.07 px in 2014 pixels.
    expect(r.similarity.scale).toBeCloseTo(2.48041, 5);
    expect(r.similarity.rotationDeg).toBeCloseTo(7.3167, 4);
    expect(r.similarity.tx).toBeCloseTo(1922.68, 2);
    expect(r.similarity.ty).toBeCloseTo(290.55, 2);
    expect(r.residualPx).toBeCloseTo(2.5, 2);
    expect(r.maxResidualPx).toBeCloseTo(6.07, 2);
    expect(pair.registration.similarity).toEqual(r.similarity);
  });

  it("lands the three held-out stars within the review's residuals", () => {
    const s = register(pair.registration.controlPoints).similarity;
    const holdouts = [
      { moving: { x: 486.44, y: 195.24 }, reference: { x: 3057.02, y: 922.66 }, residual: 2.02 },
      { moving: { x: 264.62, y: 1179.22 }, reference: { x: 2203.6, y: 3276.26 }, residual: 2.59 },
      { moving: { x: 1193.62, y: 1330.51 }, reference: { x: 4439.43, y: 3940.82 }, residual: 0.5 },
    ];
    for (const h of holdouts) {
      const q = applySimilarity(s, h.moving);
      expect(Math.hypot(q.x - h.reference.x, q.y - h.reference.y)).toBeCloseTo(h.residual, 2);
    }
  });

  it("agrees with the published orientation: within 0.5 degree and 2 % of the page values", () => {
    const s = register(pair.registration.controlPoints).similarity;
    // ESA pages: north 42.3 degrees left of vertical in 1995, 35.0 in 2014; fields 2.51 arcmin
    // over 1518 px and 4.53 arcmin over 6780 px.
    expect(Math.abs(s.rotationDeg - (42.3 - 35.0))).toBeLessThan(0.5);
    expect(Math.abs(s.scale / (2.51 / 1518 / (4.53 / 6780)) - 1)).toBeLessThan(0.02);
  });
});
