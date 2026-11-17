import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Vips from "wasm-vips";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as fx from "../src/content/__fixtures__/content";
import { loadContent } from "../src/content/load";
import { type BuildDeps, buildImage, expectedTiles, imageIds, parseTargets, run, writeExpected } from "./build-tiles";
import { tileImage } from "./generate-tiles";

describe("expectedTiles", () => {
  it("matches the fixture block for a plain source", () => {
    expect(expectedTiles(fx.source(), undefined)).toMatchObject({ width: 1000, height: 300, maxLevel: 6, thumbnail: { width: 512, height: 154 }, preview: { width: 1000, height: 300 } });
  });

  it("takes its size from the crop when there is one", () => {
    const t = expectedTiles(fx.source(), { x: 10, y: 20, width: 400, height: 3000 });
    expect(t).toMatchObject({ width: 400, height: 3000, thumbnail: { width: 68, height: 512 }, preview: { width: 273, height: 2048 } });
  });

  it("reproduces the committed tiles block of every manifest in data/images", () => {
    const content = loadContent({ root: process.cwd(), mode: "production" });
    for (const image of content.images) {
      const source = content.sources.find((s) => s.id === image.sourceId)!;
      expect(expectedTiles(source, image.crop), image.id).toEqual(image.tiles);
    }
  });
});

describe("parseTargets", () => {
  const known = ["a-1", "b-2", "c-3"];
  it("expands all", () => expect(parseTargets("all", known, {})).toEqual({ ids: known, skipped: [] }));
  it("expands --all", () => expect(parseTargets("--all", known, {}).ids).toEqual(known));
  it("splits on spaces and commas and drops repeats", () => expect(parseTargets("b-2, a-1  b-2", known, {}).ids).toEqual(["b-2", "a-1"]));
  it("leaves a not-rebuilt id out of all and reports it", () =>
    expect(parseTargets("all", known, { "b-2": "kept" })).toEqual({ ids: ["a-1", "c-3"], skipped: ["b-2"] }));
  it("refuses a not-rebuilt id named explicitly, with its reason", () =>
    expect(() => parseTargets("a-1 b-2", known, { "b-2": "kept on R2" })).toThrow("b-2: not rebuilt, kept on R2"));
  it("never rebuilds the quarter Andromeda by default", () => {
    expect(parseTargets("all", imageIds(process.cwd())).skipped).toEqual(["andromeda-phat-phast-2025"]);
    expect(() => parseTargets("andromeda-phat-phast-2025", imageIds(process.cwd()))).toThrow(/H-01/);
  });
  it("rejects an unknown id", () => expect(() => parseTargets("zzz", known)).toThrow(/no data\/images\/zzz.json/));
  it("rejects anything that is not an id", () => expect(() => parseTargets("a-1;rm", known)).toThrow(/not an image id/));
  it("rejects an empty input", () => expect(() => parseTargets("  ", known)).toThrow(/all/));
});

describe("buildImage", () => {
  let root: string;
  let vips: Awaited<ReturnType<typeof Vips>>;
  let png: string;
  const logs: string[] = [];

  beforeAll(async () => {
    vips = await Vips();
  }, 60_000);

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "solaria-build-"));
    for (const d of ["data/images", "data/sources", "data/staging/images"]) mkdirSync(join(root, d), { recursive: true });
    png = join(root, "original.png");
    writeFileSync(png, Buffer.from(vips.Image.black(600, 200, { bands: 3 }).add(90).writeToBuffer(".png")));
    const source = fx.source();
    source.file = { ...source.file, format: "png", width: 600, height: 200 };
    const image = fx.image();
    image.tiles = expectedTiles(source, undefined);
    writeFileSync(join(root, "data/sources/demo.json"), JSON.stringify(source));
    writeFileSync(join(root, "data/images/demo.json"), JSON.stringify(image));
    logs.length = 0;
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const deps = (over: Partial<BuildDeps> = {}): BuildDeps => ({
    root,
    fetchSource: async () => ({ path: png, cached: true }),
    decode: async () => {
      throw new Error("decode must not be called for a png");
    },
    tile: async (input, outDir, crop) => (await tileImage(vips, { input, outDir, crop })).tiles,
    log: (l) => logs.push(l),
    ...over,
  });
  const target = () => join(root, "public", "tiles", "demo");

  it("cuts the original into public/tiles/<id> and leaves no work directory", async () => {
    await buildImage("demo", deps());
    expect(readdirSync(target()).sort()).toEqual(["0", "1", "2", "3", "4", "5", "6", "poster.jpg", "preview.jpg", "thumbnail.jpg"]);
    expect(existsSync(join(root, ".cache", "tiles-build", "demo"))).toBe(false);
  }, 60_000);

  it("decodes a jp2 source first, cuts the decoded file and removes it", async () => {
    const source = JSON.parse(readFileSync(join(root, "data/sources/demo.json"), "utf8"));
    source.file.format = "jp2";
    writeFileSync(join(root, "data/sources/demo.json"), JSON.stringify(source));
    const jp2 = join(root, "original.jp2");
    writeFileSync(jp2, "not decoded by vips");
    const decoded = join(root, "decoded.png");
    const decode = vi.fn(async () => {
      writeFileSync(decoded, readFileSync(png));
      return decoded;
    });
    const tile = vi.fn(async (input: string, outDir: string, crop: unknown) => (await tileImage(vips, { input, outDir, crop: crop as undefined })).tiles);
    await buildImage("demo", deps({ fetchSource: async () => ({ path: jp2, cached: true }), decode, tile }));
    expect(decode).toHaveBeenCalledWith(jp2);
    expect(tile.mock.calls[0][0]).toBe(decoded);
    expect(existsSync(decoded)).toBe(false);
    expect(existsSync(join(target(), "6"))).toBe(true);
  }, 60_000);

  it("fails and leaves nothing when the decoder fails", async () => {
    const source = JSON.parse(readFileSync(join(root, "data/sources/demo.json"), "utf8"));
    source.file.format = "jp2";
    writeFileSync(join(root, "data/sources/demo.json"), JSON.stringify(source));
    await expect(buildImage("demo", deps({ decode: async () => { throw new Error("opj_decompress: not found"); } }))).rejects.toThrow("not found");
    expect(existsSync(target())).toBe(false);
  });

  it("fails and leaves nothing when the fetch fails", async () => {
    const tile = vi.fn();
    await expect(buildImage("demo", deps({ fetchSource: async () => { throw new Error("HTTP 503"); }, tile }))).rejects.toThrow("HTTP 503");
    expect(tile).not.toHaveBeenCalled();
    expect(existsSync(target())).toBe(false);
  });

  it("keeps a tree that is already there when the fetch fails", async () => {
    mkdirSync(target(), { recursive: true });
    writeFileSync(join(target(), "keep"), "x");
    await expect(buildImage("demo", deps({ fetchSource: async () => { throw new Error("sha256 mismatch"); } }))).rejects.toThrow("sha256 mismatch");
    expect(readFileSync(join(target(), "keep"), "utf8")).toBe("x");
  });

  it("fails and leaves nothing when the cut differs from the committed block", async () => {
    const image = fx.image();
    image.tiles = { ...expectedTiles(fx.source(), undefined), width: 601 };
    writeFileSync(join(root, "data/images/demo.json"), JSON.stringify(image));
    await expect(buildImage("demo", deps())).rejects.toThrow(/differs from the tiles block/);
    expect(existsSync(target())).toBe(false);
    expect(existsSync(join(root, ".cache", "tiles-build", "demo"))).toBe(false);
  }, 60_000);

  it("run builds the rest after one id fails and exits 1", async () => {
    const second = fx.image();
    second.id = "other";
    second.tiles = JSON.parse(readFileSync(join(root, "data/images/demo.json"), "utf8")).tiles;
    writeFileSync(join(root, "data/images/other.json"), JSON.stringify(second));
    let calls = 0;
    const code = await run(["demo", "other"], deps({ fetchSource: async () => (calls++ === 0 ? Promise.reject(new Error("HTTP 500")) : { path: png, cached: true }) }));
    expect(code).toBe(1);
    expect(existsSync(target())).toBe(false);
    expect(existsSync(join(root, "public", "tiles", "other", "0"))).toBe(true);
    expect(logs.at(-1)).toBe("1 of 2 failed: demo");
  }, 60_000);

  it("writeExpected fills the tiles block from the source record, with no download", () => {
    const image = fx.image();
    image.tiles = { ...image.tiles, width: 1 };
    writeFileSync(join(root, "data/images/demo.json"), JSON.stringify(image));
    writeExpected("demo", root);
    expect(JSON.parse(readFileSync(join(root, "data/images/demo.json"), "utf8")).tiles).toEqual(expectedTiles(JSON.parse(readFileSync(join(root, "data/sources/demo.json"), "utf8")), undefined));
  });

  it("imageIds skips data/staging", () => {
    writeFileSync(join(root, "data/staging/images/waiting.json"), "{}");
    expect(imageIds(root)).toEqual(["demo"]);
  });
});

describe("ignore rules for public/tiles", () => {
  const ignored = (path: string) => {
    try {
      execFileSync("git", ["check-ignore", "-q", path], { cwd: process.cwd() });
      return true;
    } catch {
      return false;
    }
  };
  it("ignores a new tile tree", () => {
    expect(ignored("public/tiles/new-image-2026/0/0/0.jpg")).toBe(true);
    expect(ignored("public/tiles/new-image-2026/poster.jpg")).toBe(true);
  });
  it("keeps the mock trees trackable", () => {
    expect(ignored("public/tiles/mock-light-a/0/0/0.jpg")).toBe(false);
  });
});
