import { describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/content";
import { resolveTileBase, tileSource, tileUrl } from "./tiles";

describe("resolveTileBase", () => {
  it("defaults to /tiles when unset or empty", () => {
    expect(resolveTileBase(undefined)).toBe("/tiles");
    expect(resolveTileBase("")).toBe("/tiles");
  });

  it("accepts a root-relative path", () => {
    expect(resolveTileBase("/assets/tiles")).toBe("/assets/tiles");
  });

  it("accepts an https URL", () => {
    expect(resolveTileBase("https://tiles.example.org/solaria")).toBe("https://tiles.example.org/solaria");
  });

  it("strips one trailing slash", () => {
    expect(resolveTileBase("/tiles/")).toBe("/tiles");
    expect(resolveTileBase("https://tiles.example.org/")).toBe("https://tiles.example.org");
  });

  it.each([
    "http://tiles.example.org",
    "javascript:alert(1)",
    "data:text/plain,x",
    "//tiles.example.org",
    "tiles",
    "ftp://tiles.example.org",
    "https://user:pw@tiles.example.org",
    "https://tiles.example.org/?a=1",
    "/tiles?x",
    "/ti les",
    "https://",
  ])("rejects %s", (bad) => {
    expect(() => resolveTileBase(bad)).toThrow(/TILE_BASE_URL/);
  });
});

describe("tileUrl", () => {
  it("builds level/x/y.jpg under the base", () => {
    expect(tileUrl("/tiles", "andromeda", 6, 164, 38)).toBe("/tiles/andromeda/6/164/38.jpg");
  });

  it("encodes the id", () => {
    expect(tileUrl("/tiles", "a b/../c", 0, 0, 0)).toBe("/tiles/a%20b%2F..%2Fc/0/0/0.jpg");
  });
});

describe("tileSource", () => {
  it("describes the pyramid from the manifest", () => {
    const img = fx.image();
    const src = tileSource(img, "https://t.example.org");
    expect(src).toMatchObject({ width: 1000, height: 300, tileSize: 256, tileOverlap: 0, minLevel: 0, maxLevel: 2 });
    expect(src.getTileUrl(2, 3, 1)).toBe("https://t.example.org/demo/2/3/1.jpg");
  });
});
