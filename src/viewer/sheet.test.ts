import { describe, expect, it } from "vitest";
import { dragDirection, stepSheet } from "./sheet";

describe("phone sheet", () => {
  it("steps up and down through min, peek and full, stopping at the ends", () => {
    expect(stepSheet("min", "up")).toBe("peek");
    expect(stepSheet("peek", "up")).toBe("full");
    expect(stepSheet("full", "up")).toBe("full");
    expect(stepSheet("full", "down")).toBe("peek");
    expect(stepSheet("peek", "down")).toBe("min");
    expect(stepSheet("min", "down")).toBe("min");
  });

  it("reads a drag past the threshold as a direction and anything shorter as a tap", () => {
    expect(dragDirection(-48, 40)).toBe("up");
    expect(dragDirection(40, 40)).toBe("down");
    expect(dragDirection(-39, 40)).toBeNull();
    expect(dragDirection(5, 40)).toBeNull();
  });
});
