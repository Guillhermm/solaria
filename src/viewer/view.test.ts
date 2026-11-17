import { describe, expect, it } from "vitest";
import {
  fitScale,
  formatInt,
  formatZoom,
  homeView,
  imageToViewport,
  osdFromView,
  osdHomeZoom,
  relativeZoom,
  viewFromOsd,
  viewportToImage,
  waitsForTiles,
} from "./view";

const ANDROMEDA = { width: 42208, height: 9870 };
const PILLARS = { width: 8423, height: 14589 };

describe("zoom relative to fit (design.md 6.3)", () => {
  it("fits a tall frame by its height", () => {
    expect(fitScale({ width: 1040, height: 900 }, PILLARS)).toBeCloseTo(0.0617, 4);
  });

  it("gives 13.0x for the tall frame at 0.8 screen px per image px", () => {
    const viewer = { width: 1040, height: 900 };
    const visibleWidth = viewer.width / 0.8;
    expect(formatZoom(relativeZoom(viewer, visibleWidth, PILLARS))).toBe("13.0×");
  });

  it("gives 14.3x for a 2 960 px wide view of Andromeda in a wide viewer", () => {
    const viewer = { width: 1440, height: 900 };
    expect(formatZoom(relativeZoom(viewer, 2960, ANDROMEDA))).toBe("14.3×");
  });

  it("is 1 when the whole image is visible across a wide viewer", () => {
    expect(relativeZoom({ width: 1440, height: 900 }, ANDROMEDA.width, ANDROMEDA)).toBe(1);
  });

  it("matches OpenSeadragon's getZoom / getHomeZoom", () => {
    const viewer = { width: 1040, height: 900 };
    const home = osdHomeZoom(viewer, PILLARS);
    // OpenSeadragon zoom counts viewer widths per image width, so the visible width in
    // image pixels is W / zoom.
    const zoom = 13 * home;
    expect(relativeZoom(viewer, PILLARS.width / zoom, PILLARS)).toBeCloseTo(13, 10);
  });

  it("puts OpenSeadragon's home zoom at 1 for an image wider than the viewer", () => {
    expect(osdHomeZoom({ width: 1440, height: 900 }, ANDROMEDA)).toBe(1);
    expect(osdHomeZoom({ width: 1040, height: 900 }, PILLARS)).toBeCloseTo((900 / 1040) * (8423 / 14589), 12);
  });
});

describe("center in image pixels", () => {
  it("converts both ways through OpenSeadragon viewport coordinates", () => {
    const p = imageToViewport({ x: 21104, y: 4935 }, ANDROMEDA);
    expect(p).toEqual({ x: 0.5, y: 4935 / 42208 });
    expect(viewportToImage(p, ANDROMEDA)).toEqual({ x: 21104, y: 4935 });
  });

  it("rounds the center to whole pixels and divides the zoom by the home zoom", () => {
    const view = viewFromOsd({ x: 0.45487, y: 0.11671 }, 7.4, 0.5, ANDROMEDA);
    expect(view).toEqual({ x: 19199, y: 4926, z: 14.8 });
  });

  it("round-trips a view through OpenSeadragon's terms", () => {
    const view = { x: 19199, y: 4926, z: 14.3 };
    const osd = osdFromView(view, 0.62, ANDROMEDA);
    const back = viewFromOsd(osd.center, osd.zoom, 0.62, ANDROMEDA);
    expect(back.x).toBe(19199);
    expect(back.y).toBe(4926);
    expect(back.z).toBeCloseTo(14.3, 10);
  });

  it("starts at the image center and fit", () => {
    expect(homeView(ANDROMEDA)).toEqual({ x: 21104, y: 4935, z: 1 });
  });
});

describe("number formats", () => {
  it("groups thousands with a narrow no-break space", () => {
    expect(formatInt(42208)).toBe("42 208");
    expect(formatInt(1234567)).toBe("1 234 567");
    expect(formatInt(999)).toBe("999");
    expect(formatInt(-4935.4)).toBe("-4 935");
  });

  it("shows zoom to one decimal with a times sign", () => {
    expect(formatZoom(1)).toBe("1.0×");
    expect(formatZoom(14.26)).toBe("14.3×");
  });
});

describe("waitsForTiles", () => {
  it("waits for a shown image that is not fully loaded, and ignores hidden ones", () => {
    expect(waitsForTiles([{ opacity: 1, loaded: false }])).toBe(true);
    expect(waitsForTiles([{ opacity: 1, loaded: true }, { opacity: 0, loaded: false }])).toBe(false);
  });

  it("waits while no image is shown yet", () => {
    expect(waitsForTiles([])).toBe(true);
    expect(waitsForTiles([{ opacity: 0, loaded: true }])).toBe(true);
  });
});
