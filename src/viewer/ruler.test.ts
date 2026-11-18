import { describe, expect, it } from "vitest";
import { rulerStep, rulerTicks } from "./ruler";

describe("ruler step (design.md 6.2)", () => {
  it("picks the smallest 1, 2 or 5 times a power of ten that keeps labels apart", () => {
    // 112 px is 7rem at a 16 px root.
    expect(rulerStep(0.35, 112)).toBe(500);
    expect(rulerStep(0.0341, 112)).toBe(5000);
    expect(rulerStep(1, 112)).toBe(200);
    expect(rulerStep(0.112, 112)).toBe(1000);
    expect(rulerStep(0.1119, 112)).toBe(2000);
  });
});

describe("ruler ticks", () => {
  it("labels every step and puts 4 minor ticks between labels for a step of 500", () => {
    const t = rulerTicks(17_950, 0.35, 1040, 42208, 112);
    expect(t.step).toBe(500);
    expect(t.major.map((m) => m.value)).toEqual([18000, 18500, 19000, 19500, 20000, 20500]);
    expect(t.major[0].at).toBeCloseTo(17.5, 10);
    // 17 950 + 1 040 / 0.35 reaches 20 921, so the minor ticks run to 20 900.
    expect(t.minor.length).toBe(4 * 6);
  });

  it("uses 4 minor intervals for a step of 2 times a power of ten", () => {
    const t = rulerTicks(0, 1, 500, 10_000, 112);
    expect(t.step).toBe(200);
    expect(t.major.map((m) => m.value)).toEqual([0, 200, 400]);
    expect(t.minor.map((m) => Math.round(m))).toEqual([50, 100, 150, 250, 300, 350, 450, 500]);
  });

  it("leaves out ticks beyond the image edges", () => {
    const t = rulerTicks(-1000, 0.1, 2000, 9870, 112);
    expect(t.major[0].value).toBe(0);
    expect(t.major.at(-1)!.value).toBeLessThanOrEqual(9870);
    expect(Math.min(...t.minor)).toBeGreaterThan(0);
  });
});
