// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import type OpenSeadragon from "openseadragon";
import { applySimilarity } from "@/content/registration";
import { clipHalfPlane, movingCrop, overlapBounds, placement, referenceClip, sides, splitToReferenceX, wholeImage } from "./compare";

const S = { scale: 2.48041, rotationDeg: 7.3167, tx: 1922.68, ty: 290.55 };
const MOVING = { width: 1518, height: 1497 };
const REFERENCE = { width: 6780, height: 7071 };

let OSD: typeof OpenSeadragon;
beforeAll(async () => {
  // jsdom has no canvas; OpenSeadragon only probes it while loading.
  vi.spyOn(console, "error").mockImplementation(() => {});
  OSD = (await import("openseadragon")).default;
});

// A TiledImage built by OpenSeadragon itself, placed as the viewer will place it.
const osdImage = (moving = MOVING) => {
  const p = placement(S, moving, REFERENCE);
  const source = new OSD.TileSource({ width: moving.width, height: moving.height, tileSize: 256, tileOverlap: 0, minLevel: 0, maxLevel: 6 } as never);
  const Tiled = (OSD as unknown as { TiledImage: new (o: object) => OpenSeadragon.TiledImage }).TiledImage;
  return new Tiled({ source, viewer: {}, tileCache: {}, drawer: {}, imageLoader: {}, ...p });
};

describe("placement", () => {
  it("lands every moving pixel where the similarity says, by OpenSeadragon's own mapping", () => {
    const item = osdImage();
    let seed = 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) {
      const p = { x: rand() * MOVING.width, y: rand() * MOVING.height };
      const v = item.imageToViewportCoordinates(p.x, p.y);
      const q = applySimilarity(S, p);
      expect(v.x * REFERENCE.width).toBeCloseTo(q.x, 6);
      expect(v.y * REFERENCE.width).toBeCloseTo(q.y, 6);
    }
  });
  it("maps the moving image's corners, wide or tall", () => {
    const tall = { width: 300, height: 900 };
    const item = osdImage(tall);
    const p = { x: tall.width, y: tall.height };
    const v = item.imageToViewportCoordinates(p.x, p.y);
    const q = applySimilarity(S, p);
    expect(v.x * REFERENCE.width).toBeCloseTo(q.x, 6);
    expect(v.y * REFERENCE.width).toBeCloseTo(q.y, 6);
  });
  it("keeps the rotation in OpenSeadragon's degrees", () => {
    expect(placement(S, MOVING, REFERENCE).degrees).toBe(7.3167);
  });
});

describe("splitToReferenceX", () => {
  const host = { width: 1000, marginLeft: 0, marginRight: 0 };
  it("puts split 0 and 100 on the view's edges", () => {
    expect(splitToReferenceX(0, host, { x: 0.2, width: 0.5 }, REFERENCE)).toBeCloseTo(0.2 * 6780, 9);
    expect(splitToReferenceX(100, host, { x: 0.2, width: 0.5 }, REFERENCE)).toBeCloseTo(0.7 * 6780, 9);
  });
  it("counts from the host's edge when a ruler takes a margin", () => {
    const ruled = { width: 1044, marginLeft: 44, marginRight: 0 };
    // Screen x 44 is where the image area begins.
    expect(splitToReferenceX((44 / 1044) * 100, ruled, { x: 0, width: 1 }, REFERENCE)).toBeCloseTo(0, 9);
    expect(splitToReferenceX(100, ruled, { x: 0, width: 1 }, REFERENCE)).toBeCloseTo(6780, 9);
  });
});

describe("clipHalfPlane", () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const area = (poly: { x: number; y: number }[]) =>
    Math.abs(poly.reduce((a, p, i) => a + p.x * poly[(i + 1) % poly.length].y - poly[(i + 1) % poly.length].x * p.y, 0)) / 2;

  it("cuts a square at a line through it", () => {
    expect(area(clipHalfPlane(square, 4, "right"))).toBeCloseTo(60, 9);
    expect(area(clipHalfPlane(square, 4, "left"))).toBeCloseTo(40, 9);
  });
  it("keeps a polygon wholly on the kept side and drops one wholly on the other", () => {
    expect(clipHalfPlane(square, -5, "right")).toEqual(square);
    expect(clipHalfPlane(square, 15, "right")).toEqual([]);
  });
  it("cuts the WFPC2 staircase into the parts on each side", () => {
    const stairs = [
      { x: 0, y: 0 }, { x: 766, y: 0 }, { x: 766, y: 407 }, { x: 1113, y: 407 }, { x: 1113, y: 746 },
      { x: 1518, y: 746 }, { x: 1518, y: 1497 }, { x: 0, y: 1497 },
    ];
    const whole = area(stairs);
    const right = clipHalfPlane(stairs, 900, "right");
    const left = clipHalfPlane(stairs, 900, "left");
    expect(area(right) + area(left)).toBeCloseTo(whole, 6);
    // Right of x = 900: the PC step from y 407 and the WF chips below 746.
    expect(area(right)).toBeCloseTo((1113 - 900) * (1497 - 407) + (1518 - 1113) * (1497 - 746), 6);
  });
});

describe("crops", () => {
  it("shows the moving image only right of the divider, mapped back into its pixels", () => {
    const crop = movingCrop(wholeImage(MOVING), S, 3000);
    expect(crop).toHaveLength(1);
    for (const p of crop[0]) expect(applySimilarity(S, p).x).toBeGreaterThanOrEqual(3000 - 1e-6);
  });
  it("hides the moving image at split 100 and shows its whole footprint at split 0", () => {
    expect(movingCrop(wholeImage(MOVING), S, REFERENCE.width)).toEqual([]);
    const all = movingCrop(wholeImage(MOVING), S, 0)[0];
    expect(all).toHaveLength(4);
    all.forEach((p, i) => {
      expect(p.x).toBeCloseTo(wholeImage(MOVING)[0][i].x, 6);
      expect(p.y).toBeCloseTo(wholeImage(MOVING)[0][i].y, 6);
    });
  });
  it("clips the reference left of the divider, inside its frame", () => {
    expect(referenceClip(2000, REFERENCE)).toEqual({ x: 0, y: 0, width: 2000, height: 7071 });
    expect(referenceClip(-5, REFERENCE).width).toBe(0);
    expect(referenceClip(9000, REFERENCE).width).toBe(6780);
  });
});

describe("overlapBounds", () => {
  it("is the moving image's box on the reference when it lies inside", () => {
    const b = overlapBounds(wholeImage(MOVING), S, REFERENCE)!;
    // Corners from the mathematician's record: x from 1449.8 to 5657.3, y from 290.5 to 4453.0.
    expect(b.x).toBeCloseTo(1449.8, 0);
    expect(b.y).toBeCloseTo(290.5, 0);
    expect(b.x + b.width).toBeCloseTo(5657.3, 0);
    expect(b.y + b.height).toBeCloseTo(4453.0, 0);
  });
  it("is cut to the reference frame when the moving image reaches past it", () => {
    const b = overlapBounds(wholeImage({ width: 100, height: 100 }), { scale: 1, rotationDeg: 0, tx: -50, ty: 20 }, { width: 200, height: 100 })!;
    expect(b).toEqual({ x: 0, y: 20, width: 50, height: 80 });
  });
  it("is null when they do not overlap", () => {
    expect(overlapBounds(wholeImage({ width: 10, height: 10 }), { scale: 1, rotationDeg: 0, tx: 500, ty: 0 }, { width: 200, height: 100 })).toBeNull();
  });
});

describe("sides", () => {
  it("puts the reference's label on the left, whatever the order of imageIds", () => {
    const labels: [string, string] = ["1995", "2014"];
    expect(sides({ imageIds: ["a", "b"], reference: "b", labels })).toEqual({ left: "2014", right: "1995" });
    expect(sides({ imageIds: ["a", "b"], reference: "a", labels })).toEqual({ left: "1995", right: "2014" });
  });
});
