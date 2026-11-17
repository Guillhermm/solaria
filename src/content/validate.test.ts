import { describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/content";
import { validateContent, validateImage, validateJourney, validateSource } from "./validate";

const clone = <T>(v: T): T => structuredClone(v);

const errorsOf = (r: { ok: boolean; errors?: string[] }) => (r.ok ? [] : r.errors!);

describe("valid fixtures", () => {
  it("pass", () => {
    expect(validateSource(fx.source(), "data/sources/demo.json").ok).toBe(true);
    expect(validateImage(fx.image(), "data/images/demo.json").ok).toBe(true);
    expect(validateJourney(fx.journey(), "data/journeys/demo.json").ok).toBe(true);
    expect(validateContent(fx.files()).ok).toBe(true);
  });

  it("accept optional fields and every color mapping kind", () => {
    const img = fx.image() as unknown as Record<string, unknown>;
    img.caveats = ["Not natural color."];
    img.fieldOfView = { value: "140 x 33 arcmin", source: "https://example.org/x", status: "verified" };
    img.colorMapping = { value: { kind: "grayscale" }, source: "https://example.org/x", status: "verified" };
    expect(validateImage(img, "data/images/demo.json").ok).toBe(true);
    img.colorMapping = { value: { kind: "standard-colortable", name: "viridis" }, source: "https://example.org/x", status: "verified" };
    expect(validateImage(img, "data/images/demo.json").ok).toBe(true);
  });
});

describe("source rules", () => {
  const run = (edit: (s: Record<string, any>) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const s = clone(fx.source()) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    edit(s);
    return errorsOf(validateSource(s, "data/sources/demo.json"));
  };

  it("names the path of a missing field", () => {
    expect(run((s) => delete s.credit)).toEqual(["data/sources/demo.json: credit: missing"]);
  });
  it("rejects an unknown key", () => {
    expect(run((s) => (s.crdit = "x"))).toEqual(["data/sources/demo.json: crdit: unknown key"]);
  });
  it("rejects a bad date", () => {
    expect(run((s) => (s.releasedAt = "2025-02-30"))).toEqual([
      'data/sources/demo.json: releasedAt: expected a date as YYYY-MM-DD, got "2025-02-30"',
    ]);
  });
  it("rejects a non-https URL", () => {
    expect(run((s) => (s.fileUrl = "http://example.org/x.tif"))[0]).toContain("fileUrl: expected an https URL");
    expect(run((s) => (s.pageUrl = "javascript:alert(1)"))[0]).toContain("pageUrl: expected an https URL");
  });
  it("rejects a bad hash", () => {
    expect(run((s) => (s.file.sha256 = "ABC"))[0]).toContain("file.sha256: expected 64 lowercase hex characters");
  });
  it("rejects a negative size", () => {
    expect(run((s) => (s.file.width = -3))).toEqual([
      "data/sources/demo.json: file.width: expected a positive integer, got -3",
    ]);
  });
  it("requires a date on an approved validation", () => {
    expect(run((s) => (s.validation.date = null))[0]).toContain("validation.date");
  });
  it("accepts a null date on a draft", () => {
    expect(run((s) => (s.validation = { status: "draft", date: null, notes: "" }))).toEqual([]);
  });
  it("rejects a non-object", () => {
    expect(errorsOf(validateSource(5, "x.json"))).toEqual(["x.json: : expected an object, got 5"]);
  });
});

describe("image rules", () => {
  const run = (edit: (s: Record<string, any>) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const s = clone(fx.image()) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    edit(s);
    return errorsOf(validateImage(s, "data/images/demo.json"));
  };

  it("rejects an empty color mapping", () => {
    expect(run((s) => (s.colorMapping.value = { kind: "per-band", entries: [] }))[0]).toContain(
      "colorMapping.value.entries: expected a non-empty array",
    );
  });
  it("rejects a claim without a source", () => {
    expect(run((s) => delete s.observatory.source)).toEqual(["data/images/demo.json: observatory.source: missing"]);
  });
  it("rejects a claim source that is neither a URL nor a repo path", () => {
    expect(run((s) => (s.observatory.source = "trust me"))[0]).toContain("observatory.source");
  });
  it("rejects an unknown claim status", () => {
    expect(run((s) => (s.observatory.status = "sure"))[0]).toContain("observatory.status: expected one of");
  });
  it("rejects an unknown product type", () => {
    expect(run((s) => (s.productType.value = "poster"))[0]).toContain("productType.value");
  });
  it("rejects overlap other than 0", () => {
    expect(run((s) => (s.tiles.overlap = 1))[0]).toContain("tiles.overlap");
  });
  it("rejects a key typo inside tiles", () => {
    expect(run((s) => (s.tiles.maxLevl = 1))).toContain("data/images/demo.json: tiles.maxLevl: unknown key");
  });
  it("rejects a non-positive wavelength", () => {
    expect(run((s) => (s.bands.value[0].wavelength.value = 0))[0]).toContain("wavelength.value");
  });
});

describe("journey rules", () => {
  const run = (edit: (s: Record<string, any>) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const s = clone(fx.journey()) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    edit(s);
    return errorsOf(validateJourney(s, "data/journeys/demo.json"));
  };

  it("rejects a stop without sources", () => {
    expect(run((s) => (s.stops[1].sources = []))[0]).toContain("stops[1].sources: expected a non-empty array");
  });
  it("rejects a malformed marker", () => {
    expect(run((s) => (s.stops[0].marker = { x: 1, y: 2 }))).toEqual(["data/journeys/demo.json: stops[0].marker.r: missing"]);
  });
});

describe("cross-file rules", () => {
  const run = (edit: (f: ReturnType<typeof fx.files>) => void) => {
    const f = clone(fx.files());
    edit(f);
    return errorsOf(validateContent(f));
  };

  it("rejects a viewport outside the image", () => {
    const e = run((f) => ((f[2].raw as ReturnType<typeof fx.journey>).stops[0].viewport.x = 1001));
    expect(e).toEqual(["data/journeys/demo.json: stops[0].viewport: (1001, 150) lies outside the image (1000 x 300)"]);
  });
  it("rejects a marker outside the image", () => {
    const e = run((f) => ((f[2].raw as ReturnType<typeof fx.journey>).stops[2].marker = { x: 5, y: 301, r: 4 }));
    expect(e[0]).toContain("stops[2].marker");
  });
  it("rejects a dangling sourceId", () => {
    const e = run((f) => ((f[1].raw as ReturnType<typeof fx.image>).sourceId = "nope"));
    expect(e).toEqual(['data/images/demo.json: sourceId: no source "nope" in data/sources/']);
  });
  it("rejects a dangling imageId", () => {
    const e = run((f) => ((f[2].raw as ReturnType<typeof fx.journey>).imageId = "nope"));
    expect(e).toEqual(['data/journeys/demo.json: imageId: no image "nope" in data/images/']);
  });
  it("rejects a size that differs from the source", () => {
    const e = run((f) => ((f[1].raw as ReturnType<typeof fx.image>).tiles.width = 999));
    expect(e).toEqual(["data/images/demo.json: tiles.width: expected 1000 (the source file), got 999"]);
  });
  it("rejects an id that differs from the file name", () => {
    const e = run((f) => (f[0].path = "data/sources/other.json"));
    expect(e.some((m) => m.includes('id: expected the file name "other"'))).toBe(true);
  });
  it("rejects mock true outside data/mock/", () => {
    const e = run((f) => ((f[0].raw as ReturnType<typeof fx.source>).mock = true));
    expect(e).toEqual(["data/sources/demo.json: mock: expected false for a file outside data/mock/, got true"]);
  });
  it("rejects mock false under data/mock/", () => {
    const e = run((f) => (f[0].path = "data/mock/sources/demo.json"));
    expect(e).toEqual(["data/mock/sources/demo.json: mock: expected true for a file under data/mock/, got false"]);
  });
  it("rejects a file in an unknown place", () => {
    expect(run((f) => f.push({ path: "data/other/x.json", raw: {} }))[0]).toContain("not a content file");
  });
  it("collects errors from every file", () => {
    const e = run((f) => {
      delete (f[0].raw as Partial<ReturnType<typeof fx.source>>).credit;
      delete (f[1].raw as Partial<ReturnType<typeof fx.image>>).title;
    });
    expect(e.slice(0, 2)).toEqual([
      "data/sources/demo.json: credit: missing",
      "data/images/demo.json: title: missing",
    ]);
  });
});
