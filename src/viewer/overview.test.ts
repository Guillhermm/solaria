import { describe, expect, it } from "vitest";
import { overviewHeightRem, shapeOf } from "./overview";

describe("overview by aspect ratio (design.md 6.4)", () => {
  it("classifies wide, tall and near-square images", () => {
    expect(shapeOf({ width: 42208, height: 9870 })).toBe("wide");
    expect(shapeOf({ width: 1024, height: 512 })).toBe("wide");
    expect(shapeOf({ width: 8423, height: 14589 })).toBe("tall");
    expect(shapeOf({ width: 800, height: 1000 })).toBe("tall");
    expect(shapeOf({ width: 1000, height: 1000 })).toBe("square");
    expect(shapeOf({ width: 1999, height: 1000 })).toBe("square");
  });

  it("draws a wide image 21.5rem across", () => {
    expect(overviewHeightRem({ width: 42208, height: 9870 })).toBeCloseTo(21.5 * (9870 / 42208), 10);
  });

  it("draws a tall image 13rem across", () => {
    expect(overviewHeightRem({ width: 8423, height: 14589 })).toBeCloseTo(13 * (14589 / 8423), 10);
  });

  it("contains a near-square image in a 15rem square", () => {
    expect(overviewHeightRem({ width: 1500, height: 1000 })).toBe(10);
    expect(overviewHeightRem({ width: 900, height: 1000 })).toBe(15);
  });
});
