import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { stripMockTiles } from "./strip-mock-tiles";

describe("stripMockTiles", () => {
  let dir = "";
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("removes mock tile trees and keeps real ones", () => {
    dir = mkdtempSync(join(tmpdir(), "strip-"));
    for (const id of ["mock-light-a", "pillars", "mockery"]) {
      mkdirSync(join(dir, "tiles", id, "0", "0"), { recursive: true });
      writeFileSync(join(dir, "tiles", id, "0", "0", "0.jpg"), "x");
    }
    expect(stripMockTiles(dir)).toEqual(["mock-light-a"]);
    expect(existsSync(join(dir, "tiles", "mock-light-a"))).toBe(false);
    expect(existsSync(join(dir, "tiles", "pillars", "0", "0", "0.jpg"))).toBe(true);
    expect(existsSync(join(dir, "tiles", "mockery"))).toBe(true);
  });

  it("removes the tile trees of staged images too", () => {
    dir = mkdtempSync(join(tmpdir(), "strip-"));
    for (const id of ["pillars-hubble-1995", "andromeda"]) mkdirSync(join(dir, "tiles", id), { recursive: true });
    expect(stripMockTiles(dir, ["pillars-hubble-1995"])).toEqual(["pillars-hubble-1995"]);
    expect(existsSync(join(dir, "tiles", "andromeda"))).toBe(true);
  });

  it("does nothing when the output has no tiles", () => {
    dir = mkdtempSync(join(tmpdir(), "strip-"));
    expect(stripMockTiles(dir)).toEqual([]);
  });
});
