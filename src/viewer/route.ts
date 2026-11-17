import type { Stop } from "@/content/types";
import { stopTarget } from "./story";
import type { Point, Size } from "./view";

export interface Mark extends Point {
  index: number; // the stop's place in the Journey, from 0
}

// design.md 6.4: markers, route and view box sit at u = x / W, v = y / H of the drawn
// overview, whatever its shape. Stops keep image pixels.
export const toDrawn = (p: Point, image: Size, drawn: Size): Point => ({
  x: (p.x / image.width) * drawn.width,
  y: (p.y / image.height) * drawn.height,
});

export const routeMarks = (stops: Stop[], image: Size, drawn: Size): Mark[] =>
  stops.flatMap((stop, index) => {
    const target = stopTarget(stop);
    return target ? [{ index, ...toDrawn(target, image, drawn) }] : [];
  });

// The route up to the current stop is travelled, the rest lies ahead; they meet at the last
// marked stop reached. A current stop with no mark (the fit view) counts as reached.
export const splitRoute = (marks: Mark[], current: number) => {
  const reached = marks.filter((m) => m.index <= current).length;
  if (reached === 0) return { travelled: [] as Mark[], ahead: marks };
  return { travelled: marks.slice(0, reached), ahead: marks.slice(reached - 1) };
};

// design.md 6.4: a number tag sits right of its marker and flips to the left when it would
// leave the overview; vertically it stays inside. Returns the tag's top-left corner.
export const tagPlacement = (mark: Point, drawn: Size, half: number, tag: Size, gap: number): Point => {
  let x = mark.x + half + gap;
  if (x + tag.width > drawn.width) x = mark.x - half - gap - tag.width;
  const y = Math.min(Math.max(0, mark.y - tag.height / 2), Math.max(0, drawn.height - tag.height));
  return { x, y };
};

// An open square bracket centered on 0,0: four corners of `size`, each arm `arm` long.
export const bracketPath = (size: number, arm: number) => {
  const h = size / 2;
  return [
    `M${-h} ${-h + arm}V${-h}H${-h + arm}`,
    `M${h - arm} ${-h}H${h}V${-h + arm}`,
    `M${h} ${h - arm}V${h}H${h - arm}`,
    `M${-h + arm} ${h}H${-h}V${h - arm}`,
  ].join("");
};

// The current stop's bracket on the image: at least the reticle's size, and wide enough to
// frame the marker's radius at the present scale (screen px per image px).
export const reticleSide = (minPx: number, scale: number, r?: number) => Math.max(minPx, r ? 2 * r * scale : 0);

export const polyline = (points: Point[]) => points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
