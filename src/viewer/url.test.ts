import { describe, expect, it } from "vitest";
import { maxZoom, parseViewerParams, serializeViewerParams } from "./url";

const IMAGE = { width: 42208, height: 9870 };

describe("parseViewerParams", () => {
  it("reads mode, center and zoom", () => {
    expect(parseViewerParams("?mode=explore&x=19199&y=4926&z=14.3", IMAGE)).toEqual({
      mode: "explore",
      view: { x: 19199, y: 4926, z: 14.3 },
    });
  });

  it("gives the fit view with no parameters", () => {
    expect(parseViewerParams("", IMAGE)).toEqual({ mode: "explore", view: null });
  });

  it("falls back to an available mode", () => {
    expect(parseViewerParams("?mode=story", IMAGE).mode).toBe("explore");
    expect(parseViewerParams("?mode=<script>", IMAGE).mode).toBe("explore");
    expect(parseViewerParams("?mode=story", IMAGE, ["explore", "story"]).mode).toBe("story");
  });

  it("needs all three numbers", () => {
    expect(parseViewerParams("?x=10&y=10", IMAGE).view).toBeNull();
    expect(parseViewerParams("?x=10&y=10&z=", IMAGE).view).toBeNull();
  });

  it("rejects anything that is not a plain decimal", () => {
    for (const bad of ["NaN", "Infinity", "1e3", "0x10", "12px", " 5", "--1", "1.", ".5"]) {
      expect(parseViewerParams(`?x=${encodeURIComponent(bad)}&y=1&z=2`, IMAGE).view).toBeNull();
    }
  });

  it("clamps the center to the image and rounds it to whole pixels", () => {
    expect(parseViewerParams("?x=-50&y=99999&z=2", IMAGE).view).toEqual({ x: 0, y: 9870, z: 2 });
    expect(parseViewerParams("?x=10.6&y=3.2&z=2", IMAGE).view).toEqual({ x: 11, y: 3, z: 2 });
  });

  it("clamps the zoom between the fit and the image's largest side", () => {
    expect(parseViewerParams("?x=1&y=1&z=0.2", IMAGE).view?.z).toBe(1);
    expect(parseViewerParams("?x=1&y=1&z=-3", IMAGE).view?.z).toBe(1);
    expect(parseViewerParams("?x=1&y=1&z=999999999", IMAGE).view?.z).toBe(maxZoom(IMAGE));
    expect(maxZoom(IMAGE)).toBe(42208);
  });
});

describe("serializeViewerParams", () => {
  it("writes whole pixels and a two-decimal zoom", () => {
    expect(serializeViewerParams({ mode: "explore", view: { x: 19199.4, y: 4926.6, z: 14.3333 } })).toBe(
      "?mode=explore&x=19199&y=4927&z=14.33",
    );
  });

  it("writes only the mode for the fit view", () => {
    expect(serializeViewerParams({ mode: "explore", view: null })).toBe("?mode=explore");
  });

  it("round-trips through the parser", () => {
    const state = { mode: "explore" as const, view: { x: 100, y: 200, z: 3.5 } };
    expect(parseViewerParams(serializeViewerParams(state), IMAGE)).toEqual(state);
  });
});

describe("compare parameters", () => {
  const OPTS = { pairs: ["hubble", "webb"], side: true };
  const ALL = ["explore", "compare"] as const;
  const parse = (q: string, opts = OPTS) => parseViewerParams(q, IMAGE, ALL, opts);

  it("read pair, layout and split", () => {
    expect(parse("?mode=compare&pair=webb&layout=side&split=30").compare).toEqual({ pair: "webb", layout: "side", split: 30 });
  });
  it("default to the first pair, wipe and 50", () => {
    expect(parse("?mode=compare").compare).toEqual({ pair: "hubble", layout: "wipe", split: 50 });
  });
  it("fall back on anything unknown or malformed", () => {
    expect(parse("?mode=compare&pair=nope&layout=flip&split=-3").compare).toEqual({ pair: "hubble", layout: "wipe", split: 50 });
    for (const bad of ["1.5", "abc", "", "1e2", " 4", "1000"]) {
      expect(parse(`?mode=compare&split=${encodeURIComponent(bad)}`).compare?.split).toBe(50);
    }
  });
  it("clamp the split to 0..100", () => {
    expect(parse("?mode=compare&split=0").compare?.split).toBe(0);
    expect(parse("?mode=compare&split=100").compare?.split).toBe(100);
    expect(parse("?mode=compare&split=250").compare?.split).toBe(100);
  });
  it("turn Side by side into Wipe where it does not fit", () => {
    expect(parse("?mode=compare&layout=side", { ...OPTS, side: false }).compare?.layout).toBe("wipe");
    expect(parse("?mode=compare&layout=blink", { ...OPTS, side: false }).compare?.layout).toBe("blink");
  });
  it("are absent outside compare mode, and compare needs a pair", () => {
    expect(parse("?mode=explore&split=30").compare).toBeUndefined();
    expect(parseViewerParams("?mode=compare", IMAGE, ALL, { pairs: [], side: true }).mode).toBe("explore");
    expect(parseViewerParams("?mode=compare", IMAGE, ALL).mode).toBe("explore");
  });
  it("keep the view in reference pixels", () => {
    expect(parse("?mode=compare&split=20&x=100&y=200&z=3")).toEqual({
      mode: "compare",
      compare: { pair: "hubble", layout: "wipe", split: 20 },
      view: { x: 100, y: 200, z: 3 },
    });
  });
  it("serialize without defaults and round-trip", () => {
    expect(serializeViewerParams({ mode: "compare", view: null, compare: { pair: "hubble", layout: "wipe", split: 50 } }, "hubble")).toBe("?mode=compare");
    const state = { mode: "compare" as const, view: { x: 100, y: 200, z: 3.25 }, compare: { pair: "webb", layout: "blink" as const, split: 7 } };
    const q = serializeViewerParams(state, "hubble");
    expect(q).toBe("?mode=compare&pair=webb&layout=blink&split=7&x=100&y=200&z=3.25");
    expect(parse(q)).toEqual(state);
  });
});

describe("light mode in the URL", () => {
  const LIGHT = { sets: [{ id: "sun", imageIds: ["a", "b", "c"] }] };

  it("is offered only with a band set", () => {
    expect(parseViewerParams("?mode=light", IMAGE, ["explore", "light"]).mode).toBe("explore");
    expect(parseViewerParams("?mode=light", IMAGE, ["explore", "light"], undefined, { sets: [] }).mode).toBe("explore");
    expect(parseViewerParams("?mode=light&band=b", IMAGE, ["explore", "light"], undefined, LIGHT)).toEqual({
      mode: "light",
      view: null,
      light: { set: "sun", band: 1 },
    });
  });

  it("serializes the band with the view and round-trips", () => {
    const state = { mode: "light" as const, view: { x: 10, y: 20, z: 2 }, light: { set: "sun", band: 2 } };
    const search = serializeViewerParams(state, undefined, LIGHT);
    expect(search).toBe("?mode=light&band=c&x=10&y=20&z=2");
    expect(parseViewerParams(search, IMAGE, ["explore", "light"], undefined, LIGHT)).toEqual(state);
    expect(serializeViewerParams({ ...state, light: { set: "sun", band: 0 } }, undefined, LIGHT)).toBe("?mode=light&x=10&y=20&z=2");
  });
});

describe("labels in the URL", () => {
  const view = { x: 1, y: 2, z: 3 };
  it("writes labels=1 in Explore and Light only", () => {
    expect(serializeViewerParams({ mode: "explore", view, labels: true })).toBe("?mode=explore&labels=1&x=1&y=2&z=3");
    expect(serializeViewerParams({ mode: "explore", view: null, labels: false })).toBe("?mode=explore");
    expect(serializeViewerParams({ mode: "story", view: null, labels: true })).toBe("?mode=story");
  });
});
