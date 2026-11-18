import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/content";
import { ContentError, contentFile, contentMode, loadContent, stagedImageIds } from "./load";

const roots: string[] = [];

const root = (files: { path: string; raw: unknown }[], text: Record<string, string> = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "solaria-load-"));
  roots.push(dir);
  const all = [...files.map((f) => [f.path, JSON.stringify(f.raw)] as const), ...Object.entries(text)];
  for (const [path, body] of all) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
};

afterEach(() => roots.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const mockFiles = () => {
  const s = { ...fx.source(), id: "m", mock: true };
  const i = { ...fx.image(), id: "m", sourceId: "m", mock: true };
  return [
    { path: "data/mock/sources/m.json", raw: s },
    { path: "data/mock/images/m.json", raw: i },
    // A band set's rail goes up in wavelength.
    { path: "data/mock/images/m2.json", raw: { ...i, id: "m2", bands: { ...i.bands, value: [{ id: "F814W", wavelength: { value: 814, unit: "nm" } }] } } },
    { path: "data/mock/pairs/mp.json", raw: { ...fx.pair(), id: "mp", imageIds: ["m", "m2"], reference: "m", mock: true } },
    { path: "data/mock/band-sets/mb.json", raw: { ...fx.bandSet(), id: "mb", imageIds: ["m", "m2"], mock: true } },
  ];
};

describe("loadContent", () => {
  it("reads sources, images and journeys", () => {
    const c = loadContent({ root: root(fx.files()), mode: "production" });
    expect([c.sources.length, c.images.length, c.journeys.length]).toEqual([1, 1, 1]);
  });

  it("treats a missing data directory as empty", () => {
    expect(loadContent({ root: root([]), mode: "production" })).toEqual({ sources: [], images: [], journeys: [], pairs: [], bandSets: [] });
  });

  it("reads data/mock only in development", () => {
    const dir = root([...fx.files(), ...mockFiles()]);
    expect(loadContent({ root: dir, mode: "development" }).images.map((i) => i.id)).toEqual(["demo", "m", "m2"]);
    expect(loadContent({ root: dir, mode: "production" }).images.map((i) => i.id)).toEqual(["demo"]);
  });

  it("reads data/staging only in development, as real content behind review", () => {
    const draft = { status: "draft", date: null, notes: "In review." };
    const dir = root([
      ...fx.files(),
      { path: "data/staging/sources/st.json", raw: { ...fx.source(), id: "st", validation: draft } },
      { path: "data/staging/images/st.json", raw: { ...fx.image(), id: "st", sourceId: "st", validation: draft } },
    ]);
    expect(loadContent({ root: dir, mode: "development" }).images.map((i) => i.id)).toEqual(["demo", "st"]);
    expect(loadContent({ root: dir, mode: "production" }).images.map((i) => i.id)).toEqual(["demo"]);
  });

  it("finds a record in data/ or data/staging/ for the scripts", () => {
    const dir = root([...fx.files(), { path: "data/staging/images/st.json", raw: {} }]);
    expect(contentFile(dir, "images", "demo")).toBe(join(dir, "data/images/demo.json"));
    expect(contentFile(dir, "images", "st")).toBe(join(dir, "data/staging/images/st.json"));
    expect(() => contentFile(dir, "images", "nope")).toThrow("no nope.json in data/images/ or data/staging/images/");
    expect(() => contentFile(dir, "images", "../images/demo")).toThrow("not a record id");
  });

  it("lists the staged image ids, and none when nothing is staged", () => {
    expect(stagedImageIds(root(fx.files()))).toEqual([]);
    expect(stagedImageIds(root([...fx.files(), { path: "data/staging/images/st.json", raw: {} }]))).toEqual(["st"]);
  });

  it("reads mock pairs and band sets only in development", () => {
    const dir = root([...fx.files(), ...mockFiles()]);
    const dev = loadContent({ root: dir, mode: "development" });
    expect([dev.pairs.map((p) => p.id), dev.bandSets.map((b) => b.id)]).toEqual([["mp"], ["mb"]]);
    const prod = loadContent({ root: dir, mode: "production" });
    expect([prod.pairs, prod.bandSets]).toEqual([[], []]);
  });

  it("throws on a mock pair that leaked into data/pairs", () => {
    const dir = root([
      ...fx.files(),
      { path: "data/images/demo-b.json", raw: { ...fx.image(), id: "demo-b" } },
      { path: "data/pairs/demo-pair.json", raw: { ...fx.pair(), mock: true } },
    ]);
    expect(() => loadContent({ root: dir, mode: "production" })).toThrow(/data\/pairs\/demo-pair\.json: mock/);
  });

  it("throws one error that names the file and field of a malformed record", () => {
    const bad = { ...fx.image(), sourceId: undefined };
    const dir = root([fx.files()[0], { path: "data/images/demo.json", raw: bad }]);
    const run = () => loadContent({ root: dir, mode: "production" });
    expect(run).toThrow(ContentError);
    expect(run).toThrow("data/images/demo.json: sourceId: missing");
  });

  it("throws with the path of a file that is not JSON", () => {
    const dir = root([], { "data/sources/broken.json": "{ not json" });
    expect(() => loadContent({ root: dir, mode: "production" })).toThrow(/data\/sources\/broken\.json: not valid JSON/);
  });

  it("lists every problem together", () => {
    const dir = root([
      { path: "data/sources/demo.json", raw: { ...fx.source(), credit: undefined } },
      { path: "data/images/demo.json", raw: { ...fx.image(), title: undefined } },
    ]);
    try {
      loadContent({ root: dir, mode: "production" });
      expect.unreachable();
    } catch (err) {
      expect((err as ContentError).problems.slice(0, 2)).toEqual([
        "data/sources/demo.json: credit: missing",
        "data/images/demo.json: title: missing",
      ]);
    }
  });

  describe("production gate", () => {
    it("passes an approved root", () => {
      expect(() => loadContent({ root: root(fx.files()), mode: "production" })).not.toThrow();
    });

    it("throws on a draft image, and development still loads it", () => {
      const files = fx.files();
      (files[1].raw as ReturnType<typeof fx.image>).validation.status = "draft";
      (files[1].raw as ReturnType<typeof fx.image>).validation.date = null;
      const dir = root(files);
      expect(() => loadContent({ root: dir, mode: "production" })).toThrow(
        'image demo: validation.status is "draft", expected "approved"',
      );
      expect(loadContent({ root: dir, mode: "development" }).images).toHaveLength(1);
    });

    it("throws on an unverified claim", () => {
      const files = fx.files();
      (files[1].raw as ReturnType<typeof fx.image>).observatory.status = "unverified";
      expect(() => loadContent({ root: root(files), mode: "production" })).toThrow("image demo: observatory is unverified");
    });

    it("throws on a mock leaked into data/images", () => {
      const files = fx.files();
      (files[1].raw as ReturnType<typeof fx.image>).mock = true;
      expect(() => loadContent({ root: root(files), mode: "production" })).toThrow(/data\/images\/demo\.json: mock/);
    });
  });
});

describe("contentMode", () => {
  it("is production for a production build unless the end-to-end build asks for development", () => {
    expect(contentMode({ NODE_ENV: "production" })).toBe("production");
    expect(contentMode({ NODE_ENV: "production", SOLARIA_CONTENT: "development" })).toBe("development");
    expect(contentMode({ NODE_ENV: "production", SOLARIA_CONTENT: "yes" })).toBe("production");
    expect(contentMode({ NODE_ENV: "development" })).toBe("development");
  });
});
