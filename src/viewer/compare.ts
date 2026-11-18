import { applySimilarity, invertSimilarity } from "@/content/registration";
import type { Similarity } from "@/content/types";
import type { Point, Size } from "./view";

export type Polygon = Point[];

// Where OpenSeadragon puts the moving image so that it lands on the reference, which spans
// 0 to 1 in viewport x. OpenSeadragon maps moving pixel p to c + (scale / Wr) R (p - pc),
// pivoting on the center of the unrotated bounds, which is applySimilarity(s, p) / Wr.
export const placement = (s: Similarity, moving: Size, reference: Size) => {
  const width = (s.scale * moving.width) / reference.width;
  const height = (s.scale * moving.height) / reference.width;
  const c = applySimilarity(s, { x: moving.width / 2, y: moving.height / 2 });
  return {
    x: c.x / reference.width - width / 2,
    y: c.y / reference.width - height / 2,
    width,
    degrees: s.rotationDeg,
  };
};

// The divider sits at `split` percent of the host's width; the image area starts after the
// left margin (the ruler). `bounds` is OpenSeadragon's view inside the margins, in viewport
// units, where the reference is 1 wide.
export const splitToReferenceX = (
  split: number,
  host: { width: number; marginLeft: number; marginRight: number },
  bounds: { x: number; width: number },
  reference: Size,
) => {
  const inner = host.width - host.marginLeft - host.marginRight;
  const screenX = (split / 100) * host.width - host.marginLeft;
  return (bounds.x + (screenX / inner) * bounds.width) * reference.width;
};

// Sutherland-Hodgman against one line: keeps the part where side(p) >= 0. `side` must be
// affine (a signed distance), so the crossing is found by linear interpolation.
export const clipPolygon = (poly: Polygon, side: (p: Point) => number): Polygon => {
  const out: Polygon = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  });
  return out.length >= 3 ? out : [];
};

// The half-plane right (or left) of x = at.
export const clipHalfPlane = (poly: Polygon, at: number, keep: "right" | "left") =>
  clipPolygon(poly, keep === "right" ? (p) => p.x - at : (p) => at - p.x);

export const wholeImage = (size: Size): Polygon[] => [
  [{ x: 0, y: 0 }, { x: size.width, y: 0 }, { x: size.width, y: size.height }, { x: 0, y: size.height }],
];

// The moving image's crop for a wipe: its data area right of the divider, in its own pixels.
// An empty list means none of it shows.
export const movingCrop = (footprint: Polygon[], s: Similarity, referenceX: number): Polygon[] => {
  const back = invertSimilarity(s);
  return footprint
    .map((poly) => clipHalfPlane(poly.map((p) => applySimilarity(s, p)), referenceX, "right"))
    .filter((poly) => poly.length > 0)
    .map((poly) => poly.map((q) => applySimilarity(back, q)));
};

// The part of the reference's data area left of the divider, in its pixels. An empty list
// means none of it shows.
export const referenceCrop = (footprint: Polygon[], referenceX: number): Polygon[] =>
  footprint.map((poly) => clipHalfPlane(poly, referenceX, "left")).filter((poly) => poly.length > 0);

// Where the two images overlap, as a box in reference pixels: the moving footprint, placed,
// cut to the reference frame. The camera fits it when a link carries no view.
export const overlapBounds = (footprint: Polygon[], s: Similarity, reference: Size) => {
  const sides = [
    (p: Point) => p.x,
    (p: Point) => reference.width - p.x,
    (p: Point) => p.y,
    (p: Point) => reference.height - p.y,
  ];
  const points = footprint.flatMap((poly) => sides.reduce((acc, side) => clipPolygon(acc, side), poly.map((p) => applySimilarity(s, p))));
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

// The reference sits left of the divider, the moving image right; labels follow imageIds.
export const sides = <L>(pair: { imageIds: [string, string]; reference: string; labels: [L, L] }) => {
  const ref = pair.imageIds.indexOf(pair.reference);
  return { left: pair.labels[ref], right: pair.labels[1 - ref] };
};

// Two images from one telescope often share a caveat word for word; the note lists it once.
export const pairCaveats = (...lists: (string[] | undefined)[]) => [...new Set(lists.flatMap((l) => l ?? []))];
