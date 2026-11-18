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
