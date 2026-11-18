import { describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/content";
import { validateBandSet, validateContent, validateImage, validateJourney, validatePair, validateSource } from "./validate";

const clone = <T>(v: T): T => structuredClone(v);

const errorsOf = (r: { ok: boolean; errors?: string[] }) => (r.ok ? [] : r.errors!);

describe("valid fixtures", () => {
  it("pass", () => {
    expect(validateSource(fx.source(), "data/sources/demo.json").ok).toBe(true);
    expect(validateImage(fx.image(), "data/images/demo.json").ok).toBe(true);
    expect(validateJourney(fx.journey(), "data/journeys/demo-tour.json").ok).toBe(true);
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

describe("footprint", () => {
  const withFootprint = (footprint: unknown) => {
    const f = fx.files();
    (f[1].raw as Record<string, unknown>).footprint = footprint;
    return errorsOf(validateContent(f));
  };
  it("accepts polygons inside the image", () => {
    expect(withFootprint([[{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 300 }, { x: 0, y: 300 }]])).toEqual([]);
  });
  it("rejects a vertex outside the image, with its path", () => {
    expect(withFootprint([[{ x: 0, y: 0 }, { x: 1001, y: 0 }, { x: 0, y: 300 }]])).toEqual([
      "data/images/demo.json: footprint[0][1]: (1001, 0) lies outside the image (1000 x 300)",
    ]);
  });
  it("rejects a polygon of fewer than 3 points and an empty list", () => {
    expect(withFootprint([[{ x: 0, y: 0 }, { x: 1, y: 0 }]])[0]).toContain("footprint[0]: expected a polygon of at least 3 points");
    expect(withFootprint([])[0]).toContain("footprint: expected a non-empty array");
  });
});

describe("bands", () => {
  it("accept a filter id with no wavelength or kind", () => {
    const img = clone(fx.image()) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    img.bands.value = [{ id: "F475W" }];
    const r = validateImage(img, "data/images/demo.json");
    expect(r.ok && r.value.bands.value).toEqual([{ id: "F475W" }]);
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
    expect(errorsOf(validateSource(5, "x.json"))).toEqual(["x.json: expected an object, got 5"]);
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
  it("rejects a color mapping with no kind", () => {
    expect(run((s) => (s.colorMapping.value = {}))).toEqual(["data/images/demo.json: colorMapping.value.kind: missing"]);
  });
  it("accepts an observation range in days or in months", () => {
    const at = (start: string, end: string) => ({ value: { start, end }, source: "https://example.org/x", status: "verified" });
    expect(run((s) => (s.observedAt = at("2010-07-01", "2022-12-31")))).toEqual([]);
    expect(run((s) => (s.observedAt = at("2010-07", "2022-12")))).toEqual([]);
  });
  it("rejects an observation range with mixed precision, a bad month or start after end", () => {
    const at = (start: string, end: string) => ({ value: { start, end }, source: "https://example.org/x", status: "verified" });
    expect(run((s) => (s.observedAt = at("2010-07", "2022-12-31")))[0]).toContain("observedAt.value.end: expected a month as YYYY-MM");
    expect(run((s) => (s.observedAt = at("2010-13", "2022-12")))[0]).toContain("observedAt.value.start: expected a month as YYYY-MM");
    expect(run((s) => (s.observedAt = at("2022-12", "2010-07")))).toEqual([
      "data/images/demo.json: observedAt.value: start 2022-12 is after end 2010-07",
    ]);
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
    return errorsOf(validateJourney(s, "data/journeys/demo-tour.json"));
  };

  it("rejects a stop without sources", () => {
    expect(run((s) => (s.stops[1].sources = []))[0]).toContain("stops[1].sources: expected a non-empty array");
  });
  it("rejects a malformed marker", () => {
    expect(run((s) => (s.stops[0].marker = { x: 1, y: 2 }))).toEqual(["data/journeys/demo-tour.json: stops[0].marker.r: missing"]);
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
    expect(e).toEqual(["data/journeys/demo-tour.json: stops[0].viewport: (1001, 150) lies outside the image (1000 x 300)"]);
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
    expect(e).toEqual(['data/journeys/demo-tour.json: imageId: no image "nope" in data/images/']);
  });
  it("rejects a Journey slug that is also an image id", () => {
    const e = run((f) => {
      (f[2].raw as ReturnType<typeof fx.journey>).slug = "demo";
      f[2].path = "data/journeys/demo.json";
    });
    expect(e).toEqual(['data/journeys/demo.json: slug: "demo" is also an image id; the two share one URL space']);
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

describe("pairs and band sets", () => {
  const run = (kind: "pair" | "set", edit: (g: Record<string, any>) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const g = clone(kind === "pair" ? fx.pair() : fx.bandSet()) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    edit(g);
    return errorsOf(kind === "pair" ? validatePair(g, "data/pairs/demo-pair.json") : validateBandSet(g, "data/band-sets/demo-bands.json"));
  };

  it("accept the fixtures", () => {
    expect(run("pair", () => {})).toEqual([]);
    expect(run("set", () => {})).toEqual([]);
  });
  it("accept a zero residual", () => {
    expect(run("pair", (g) => (g.registration.residualPx = 0))).toEqual([]);
  });
  it("reject a negative residual", () => {
    expect(run("pair", (g) => (g.registration.residualPx = -1))[0]).toContain("registration.residualPx: expected a number of zero or more");
  });
  it("reject a missing differs flag and an unknown transform", () => {
    expect(run("pair", (g) => delete g.differs.geometry)).toEqual(["data/pairs/demo-pair.json: differs.geometry: missing"]);
    expect(run("pair", (g) => (g.registration.transform = "warp"))[0]).toContain("registration.transform: expected one of none, similarity");
    expect(run("pair", (g) => (g.registration.transform = "affine"))[0]).toContain("registration.transform: expected one of none, similarity");
  });
  it("need a zero residual when nothing was registered", () => {
    expect(run("set", (g) => (g.registration.residualPx = 0.5))).toEqual(["data/band-sets/demo-bands.json: registration.residualPx: expected 0, got 0.5"]);
  });
  it("need at least 6 control points", () => {
    const e = run("pair", (g) => {
      g.registration = fx.similarityRegistration(fx.controlPoints().slice(0, 5));
    });
    expect(e).toEqual(['data/pairs/demo-pair.json: registration.controlPoints: expected at least 6 control points, got "5 points"']);
  });
  it("reject a stored transform or residual that the points do not give", () => {
    expect(run("pair", (g) => (g.registration.similarity.rotationDeg += 1e-6))[0]).toMatch(
      /registration\.similarity\.rotationDeg: .* does not match the refit .*; run scripts\/register-pair\.ts/,
    );
    expect(run("pair", (g) => (g.registration.residualPx = 0.01))[0]).toContain("registration.residualPx: 0.01 does not match the refit");
    expect(run("pair", (g) => (g.registration.maxResidualPx = 0.01))[0]).toContain("registration.maxResidualPx: 0.01 does not match the refit");
  });
  it("accept a refit that differs only by rounding", () => {
    expect(run("pair", (g) => (g.registration.similarity.tx *= 1 + 1e-12))).toEqual([]);
  });
  it("need a reference among the pair's images and a headline", () => {
    expect(run("pair", (g) => (g.reference = "other"))).toEqual([
      'data/pairs/demo-pair.json: reference: expected one of imageIds (demo, demo-b), got "other"',
    ]);
    expect(run("pair", (g) => delete g.headline)).toEqual(["data/pairs/demo-pair.json: headline: missing"]);
  });
  it("accept pair caveats and an alignment line, and refuse empty ones", () => {
    expect(run("pair", (g) => {
      g.caveats = ["Aligned to about 0.1 arcsecond."];
      g.alignment = "Alignment: about 0.1 arcsecond.";
    })).toEqual([]);
    expect(run("pair", (g) => (g.alignment = ""))[0]).toContain("alignment: expected a non-empty string");
    expect(run("pair", (g) => (g.caveats = [""]))[0]).toContain("caveats[0]: expected a non-empty string");
  });
  it("need a full and a short label for each image", () => {
    expect(run("pair", (g) => g.labels.pop())[0]).toContain("labels: expected two labels, in imageIds order");
    expect(run("pair", (g) => (g.labels[1].short = "")))
      .toEqual(['data/pairs/demo-pair.json: labels[1].short: expected a non-empty string, got ""']);
  });
  it("reject an empty or missing note", () => {
    expect(run("pair", (g) => (g.whatDiffers = " "))[0]).toContain("whatDiffers: expected a non-empty string");
    expect(run("pair", (g) => delete g.whatDiffers)).toEqual(["data/pairs/demo-pair.json: whatDiffers: missing"]);
    expect(run("set", (g) => delete g.whatDiffers)).toEqual(["data/band-sets/demo-bands.json: whatDiffers: missing"]);
  });
  it("need exactly two distinct images in a pair", () => {
    expect(run("pair", (g) => (g.imageIds = ["demo"]))[0]).toContain("imageIds: expected exactly two image ids");
    expect(run("pair", (g) => (g.imageIds = ["demo", "demo"]))[0]).toContain("imageIds: expected distinct image ids");
  });
  it("need at least two distinct images in a band set", () => {
    expect(run("set", (g) => (g.imageIds = ["demo"]))[0]).toContain("imageIds: expected at least two image ids");
    expect(run("set", (g) => (g.imageIds = ["demo", "demo"]))[0]).toContain("expected distinct image ids");
  });
  it("reject an unknown key", () => {
    expect(run("set", (g) => (g.bands = []))).toEqual(["data/band-sets/demo-bands.json: bands: unknown key"]);
  });

  describe("in validateContent", () => {
    const withGroups = () => {
      const second = { ...fx.image(), id: "demo-b" };
      return [
        ...fx.files(),
        { path: "data/images/demo-b.json", raw: second },
        { path: "data/pairs/demo-pair.json", raw: fx.pair() },
      ];
    };
    it("collect pairs and band sets", () => {
      const r = validateContent([
        ...withGroups(),
        { path: "data/images/demo-c.json", raw: { ...fx.image(), id: "demo-c" } },
        { path: "data/band-sets/demo-bands.json", raw: fx.bandSet() },
      ]);
      expect(r.ok && [r.value.pairs.length, r.value.bandSets.length]).toEqual([1, 1]);
    });
    it("reject an image id that does not resolve", () => {
      const f = withGroups();
      (f[4].raw as ReturnType<typeof fx.pair>).imageIds = ["demo", "nope"];
      expect(errorsOf(validateContent(f))).toEqual(['data/pairs/demo-pair.json: imageIds[1]: no image "nope" in data/images/']);
    });
    it("keep control points inside their images", () => {
      const f = withGroups();
      const pair = f[4].raw as ReturnType<typeof fx.pair>;
      const points = fx.controlPoints();
      points[2] = { ...points[2], moving: { x: 1200, y: 10 } };
      pair.registration = fx.similarityRegistration(points);
      expect(errorsOf(validateContent(f))).toEqual([
        'data/pairs/demo-pair.json: registration.controlPoints[2].moving: (1200, 10) lies outside image "demo-b"',
      ]);
    });
    it("keep registration notes and refuse an empty one", () => {
      const f = withGroups();
      const pair = f[4].raw as ReturnType<typeof fx.pair>;
      pair.registration = { ...fx.similarityRegistration(), notes: "Per-chip offsets up to 0.3 arcsec." } as typeof pair.registration;
      const r = validateContent(f);
      expect(r.ok && r.value.pairs[0].registration).toMatchObject({ notes: "Per-chip offsets up to 0.3 arcsec." });
      (pair.registration as { notes?: string }).notes = "";
      expect(errorsOf(validateContent(f))[0]).toContain("registration.notes: expected a non-empty string");
    });
    it("accept staged content as real, not mock", () => {
      const f = withGroups();
      f[4].path = "data/staging/pairs/demo-pair.json";
      expect(errorsOf(validateContent(f))).toEqual([]);
    });
    it("tie mock to data/mock/", () => {
      const f = withGroups();
      f[4].path = "data/mock/pairs/demo-pair.json";
      expect(errorsOf(validateContent(f))).toEqual([
        "data/mock/pairs/demo-pair.json: mock: expected true for a file under data/mock/, got false",
      ]);
    });
  });
});
