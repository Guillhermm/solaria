import type { Stop, TilePyramid } from "@/content/types";
import { levelSize } from "@/content/pyramid";
import { rulerTicks } from "@/viewer/ruler";
import { stopTarget } from "@/viewer/story";
import type { Point, Size } from "@/viewer/view";

export interface Field {
  x: number; // center, image pixels
  y: number;
  side: number; // image pixels across and down
  zoom: number;
}

// design.md 6.3 and 6.5: the lens is square and the whole image fits it at its width (or
// height, for a tall image). A field `side` image pixels across is then
// zoom = fitSide / side times closer. The lens takes the stop's own zoom, so its readout
// matches the Journey: side = fitSide / z.
export const lensField = (stop: Stop, image: Size): Field => {
  const fitSide = Math.max(image.width, image.height);
  const { x, y, z } = stop.viewport;
  return { x, y, side: fitSide / z, zoom: z };
};

// Stops the lens can aim at: those with a single place on the image (story.ts stopTarget).
// A stop at the fit view shows the whole image, which the strip already does.
export const aimableStops = (stops: Stop[]) => stops.flatMap((stop, index) => (stopTarget(stop) ? [index] : []));

export interface LensTile {
  key: string;
  level: number;
  col: number;
  row: number;
  // Placement inside the lens, in percent of its side.
  left: number;
  top: number;
  width: number;
  height: number;
}

// The coarsest pyramid level that still gives `devicePx` pixels across the field, so the lens
// loads as few tiles as it can and stays sharp (design.md 6.5: same pyramid as the viewer).
export const lensLevel = (tiles: TilePyramid, side: number, devicePx: number) => {
  for (let level = tiles.minLevel; level < tiles.maxLevel; level++) {
    if (side / 2 ** (tiles.maxLevel - level) >= devicePx) return level;
  }
  return tiles.maxLevel;
};

export const lensTiles = (tiles: TilePyramid, field: Field, devicePx: number, level = lensLevel(tiles, field.side, devicePx)): LensTile[] => {
  const d = 2 ** (tiles.maxLevel - level);
  const size = levelSize(tiles.width, tiles.height, tiles.maxLevel, level);
  const x0 = field.x - field.side / 2;
  const y0 = field.y - field.side / 2;
  const t = tiles.tileSize;
  const first = (v: number) => Math.max(0, Math.floor(v / d / t));
  const last = (v: number, limit: number) => Math.min(Math.ceil(limit / t) - 1, Math.floor(v / d / t));
  const out: LensTile[] = [];
  for (let row = first(y0); row <= last(y0 + field.side, size.height); row++) {
    for (let col = first(x0); col <= last(x0 + field.side, size.width); col++) {
      const w = Math.min(t, size.width - col * t);
      const h = Math.min(t, size.height - row * t);
      out.push({
        key: `${level}/${col}/${row}`,
        level,
        col,
        row,
        left: ((col * t * d - x0) / field.side) * 100,
        top: ((row * t * d - y0) / field.side) * 100,
        width: ((w * d) / field.side) * 100,
        height: ((h * d) / field.side) * 100,
      });
    }
  }
  return out;
};

// The field's square on the whole image, in percent of the image's width and height.
export const fieldBox = (field: Field, image: Size) => ({
  left: ((field.x - field.side / 2) / image.width) * 100,
  top: ((field.y - field.side / 2) / image.height) * 100,
  width: (field.side / image.width) * 100,
  height: (field.side / image.height) * 100,
});

// Ruler ticks along one edge of the lens, placed in percent of its side. `sidePx` is the
// lens side in CSS pixels at the default root size; ticks are placed by ratio, so the result
// holds at any font size.
export const lensTicks = (center: number, side: number, limit: number, sidePx: number, minGapPx: number) => {
  const start = center - side / 2;
  const ticks = rulerTicks(start, sidePx / side, sidePx, limit, minGapPx);
  return {
    major: ticks.major.map(({ value, at }) => ({ value, at: (at / sidePx) * 100 })),
    minor: ticks.minor.map((at) => (at / sidePx) * 100),
  };
};

// The polite announcement when the lens settles on a stop: "Stop 3, zoom 14.3×".
export const lensAnnouncement = (index: number, zoom: number) => `Stop ${index + 1}, zoom ${zoom.toFixed(1)}×`;

// Next stop along the route for Left and Right, stopping at both ends.
export const stepAim = (aimable: number[], current: number, direction: 1 | -1) => {
  const at = aimable.indexOf(current);
  if (at < 0) return aimable[0];
  return aimable[Math.min(aimable.length - 1, Math.max(0, at + direction))];
};

// A leader line from the lens (above) to the view box (on the strip), cut where it meets the
// strip's top edge `edgeY`: the part above is drawn on the page, the part below over the image.
export const splitLeader = (from: Point, to: Point, edgeY: number) => {
  if (to.y <= edgeY) return { above: [from, to], over: null };
  if (from.y >= edgeY) return { above: null, over: [from, to] };
  const t = (edgeY - from.y) / (to.y - from.y);
  const cut = { x: from.x + (to.x - from.x) * t, y: edgeY };
  return { above: [from, cut], over: [cut, to] };
};

// "Stops 01 and 07 show the whole image." for the stops the strip has no marker for.
export const wholeStopsNote = (numbers: string[]) => {
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return `Stop ${numbers[0]} shows the whole image.`;
  return `Stops ${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]} show the whole image.`;
};
