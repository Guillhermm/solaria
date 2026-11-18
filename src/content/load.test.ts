import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/content";
import { ContentError, loadContent } from "./load";

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
  ];
};

describe("loadContent", () => {
  it("reads sources, images and journeys", () => {
    const c = loadContent({ root: root(fx.files()), mode: "production" });
    expect([c.sources.length, c.images.length, c.journeys.length]).toEqual([1, 1, 1]);
  });

  it("treats a missing data directory as empty", () => {
    expect(loadContent({ root: root([]), mode: "production" })).toEqual({ sources: [], images: [], journeys: [] });
  });

  it("reads data/mock only in development", () => {
    const dir = root([...fx.files(), ...mockFiles()]);
    expect(loadContent({ root: dir, mode: "development" }).images.map((i) => i.id)).toEqual(["demo", "m"]);
    expect(loadContent({ root: dir, mode: "production" }).images.map((i) => i.id)).toEqual(["demo"]);
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
});
