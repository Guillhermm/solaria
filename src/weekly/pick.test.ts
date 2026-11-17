import { describe, expect, it } from "vitest";
import { buildDate, isoWeek, weeklyIndex } from "./pick";

describe("isoWeek", () => {
  it.each([
    ["2026-11-17", 2026, 47],
    ["2026-11-23", 2026, 48],
    ["2026-12-07", 2026, 50],
    // 2026 starts on a Thursday, so it has 53 weeks and its last runs into 2027.
    ["2026-12-28", 2026, 53],
    ["2026-12-31", 2026, 53],
    ["2027-01-03", 2026, 53],
    ["2027-01-04", 2027, 1],
    // Year boundaries the other way: 2024-12-30 is already week 1 of 2025.
    ["2024-12-29", 2024, 52],
    ["2024-12-30", 2025, 1],
    ["2021-01-03", 2020, 53],
    ["2021-01-04", 2021, 1],
    ["2020-02-29", 2020, 9],
  ])("%s is week %i-W%i", (date, year, week) => {
    expect(isoWeek(date)).toEqual({ year, week });
  });

  it("rejects what is not a calendar date", () => {
    expect(() => isoWeek("2026-02-30")).toThrow("2026-02-30");
    expect(() => isoWeek("17/11/2026")).toThrow();
  });
});

describe("weeklyIndex (design.md 15.3, W3)", () => {
  it("is (week - 1) mod n", () => {
    expect([1, 7, 8, 47, 48, 50, 53].map((w) => weeklyIndex(w, 7))).toEqual([0, 6, 0, 4, 5, 0, 3]);
    expect(weeklyIndex(53, 1)).toBe(0);
  });
});

describe("buildDate (W3)", () => {
  it("takes SOLARIA_BUILD_DATE when set, else today in UTC", () => {
    expect(buildDate({ SOLARIA_BUILD_DATE: "2027-01-04" }, new Date("2026-11-17T23:30:00-05:00"))).toBe("2027-01-04");
    expect(buildDate({}, new Date("2026-11-17T23:30:00-05:00"))).toBe("2026-11-18");
  });

  it("fails loudly on a malformed SOLARIA_BUILD_DATE", () => {
    expect(() => buildDate({ SOLARIA_BUILD_DATE: "2026-13-01" }, new Date())).toThrow("SOLARIA_BUILD_DATE");
  });
});
