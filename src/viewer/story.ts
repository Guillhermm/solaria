import type { Stop, Viewport } from "@/content/types";
import { fitScale, type Point, type Size } from "./view";

// design.md 4 and 7.2: ?mode=story&stop=N, N counted from 1 as the stop list shows it.
// Anything missing or malformed opens the first stop; numbers past the end open the last.
export const parseStop = (search: string, count: number): number => {
  const raw = new URLSearchParams(search).get("stop");
  if (raw === null || !/^\d+$/.test(raw)) return 0;
  return Math.min(count, Math.max(1, Number(raw))) - 1;
};

export const storySearch = (index: number) => `?mode=story&stop=${index + 1}`;

export const stepStop = (index: number, direction: 1 | -1, count: number) =>
  Math.min(count - 1, Math.max(0, index + direction));

export const stopNumber = (index: number) => String(index + 1).padStart(2, "0");

// "Stop 3 of 7, back to the story" (design.md 7.2) and the arrival announcement.
export const stopOf = (index: number, count: number) => `Stop ${index + 1} of ${count}`;

// Plain text; blank lines separate paragraphs (types.ts).
export const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// The place a stop points at: its marker, else the center of its view. A stop at the fit
// view shows the whole image and has no single place to mark.
export const stopTarget = (stop: Stop): Point | null => {
  if (stop.marker) return { x: stop.marker.x, y: stop.marker.y };
  return stop.viewport.z > 1 ? { x: stop.viewport.x, y: stop.viewport.y } : null;
};

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The part of the image (in image pixels) a view shows in a viewer of the given size in screen
// pixels. A Journey's camera never goes past one screen pixel per image pixel (`maxScale` 1, or the
// image's maxPixelRatio, design.md D19), so on a large screen a deep stop shows more around it
// rather than magnified pixels. A link's own view
// (a URL, a search row) is kept exactly: maxScale Infinity.
export const viewBounds = (view: Viewport, image: Size, viewer: Size, maxScale = 1): Bounds => {
  const scale = Math.min(fitScale(viewer, image) * view.z, maxScale);
  const width = viewer.width / scale;
  const height = viewer.height / scale;
  return { x: view.x - width / 2, y: view.y - height / 2, width, height };
};

const overlaps = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const union = (a: Bounds, b: Bounds): Bounds => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};

// design.md 6.1: --dur-flight is 1200 to 1800 ms, scaled by zoom distance. The distance is
// measured against the widest zoom span of the Journey itself, so its longest dive takes
// the longest.
export const FLIGHT_MIN_MS = 1200;
export const FLIGHT_MAX_MS = 1800;

export const zoomSpan = (stops: Stop[]) => {
  const zs = stops.map((s) => s.viewport.z);
  return Math.max(...zs) / Math.min(...zs);
};

export const flightMs = (fromZ: number, toZ: number, span: number) => {
  if (span <= 1) return FLIGHT_MIN_MS;
  const share = Math.min(1, Math.abs(Math.log2(toZ / fromZ)) / Math.log2(span));
  return Math.round(FLIGHT_MIN_MS + (FLIGHT_MAX_MS - FLIGHT_MIN_MS) * share);
};

export interface Leg {
  bounds: Bounds;
  ms: number;
}

// design.md 6.1: stops far apart (their views do not overlap) zoom out to a view holding
// both, then zoom in, so the user keeps their place; close stops fly directly. The two legs
// share the longest flight time.
export const flightPlan = (from: Bounds, fromZ: number, to: Viewport, image: Size, viewer: Size, span: number, maxScale = 1): Leg[] => {
  const target = viewBounds(to, image, viewer, maxScale);
  if (overlaps(from, target)) return [{ bounds: target, ms: flightMs(fromZ, to.z, span) }];
  return [
    { bounds: union(from, target), ms: FLIGHT_MAX_MS / 2 },
    { bounds: target, ms: FLIGHT_MAX_MS / 2 },
  ];
};

const insideConvex = (poly: Point[], p: Point) => {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
};

// How far a view's corners lie outside a convex area, in image pixels; 0 when it is inside.
const outside = (area: Point[], view: Bounds) => {
  const corners = [
    { x: view.x, y: view.y },
    { x: view.x + view.width, y: view.y },
    { x: view.x + view.width, y: view.y + view.height },
    { x: view.x, y: view.y + view.height },
  ];
  let worst = 0;
  for (const c of corners) {
    if (insideConvex(area, c)) continue;
    // Distance to the nearest edge stands in for how far out the corner is.
    let d = Infinity;
    area.forEach((a, i) => {
      const b = area[(i + 1) % area.length];
      const t = Math.max(0, Math.min(1, ((c.x - a.x) * (b.x - a.x) + (c.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)));
      d = Math.min(d, Math.hypot(c.x - (a.x + t * (b.x - a.x)), c.y - (a.y + t * (b.y - a.y))));
    });
    worst = Math.max(worst, d);
  }
  return worst;
};

export interface StopClearance {
  center: Point; // the stop's view center, image pixels
  view: Size; // what the view shows, image pixels
  scale: number; // screen pixels per image pixel
  frame: Bounds; // the area inside the view's margins, screen pixels
  mark: Point; // the stop's marker, image pixels
  box: Bounds; // the reticle and its chip around the marker's screen point, screen pixels
  obstacles: Bounds[]; // overlays over the view, screen pixels
  gap: number; // the room kept around the box, screen pixels
  image: Size;
  area?: Point[]; // the image's data area (a convex footprint); the whole image without one
}

// design.md 15.5, D16: a stop whose reticle or chip would sit under an overlay (the top bar, the
// overview card) is framed off its center, by the smallest pan that clears it with `gap` to
// spare. The pan never leaves the image, and stays inside the data area where any clear view
// does; where none does, the clear view that leaves it least is taken. Returns the center and
// how far the view then reaches past the data area, in image pixels.
export const clearStop = (c: StopClearance): Point & { outside: number } => {
  const clamp = (v: number, size: number, extent: number) => (size >= extent ? extent / 2 : Math.min(extent - size / 2, Math.max(size / 2, v)));
  const at = (p: Point) => ({ x: clamp(p.x, c.view.width, c.image.width), y: clamp(p.y, c.view.height, c.image.height) });
  const clear = (p: Point) => {
    const sx = c.frame.x + c.frame.width / 2 + (c.mark.x - p.x) * c.scale;
    const sy = c.frame.y + c.frame.height / 2 + (c.mark.y - p.y) * c.scale;
    const b = { x: sx + c.box.x - c.gap, y: sy + c.box.y - c.gap, width: c.box.width + 2 * c.gap, height: c.box.height + 2 * c.gap };
    const inFrame = b.x >= c.frame.x && b.y >= c.frame.y && b.x + b.width <= c.frame.x + c.frame.width && b.y + b.height <= c.frame.y + c.frame.height;
    return inFrame && !c.obstacles.some((o) => overlaps(b, o));
  };
  const leaves = (p: Point) => (c.area ? outside(c.area, { x: p.x - c.view.width / 2, y: p.y - c.view.height / 2, ...c.view }) : 0);
  const start = at(c.center);
  if (clear(start)) return { ...start, outside: leaves(start) };
  // Candidates on a grid of 8 screen pixels across the frame.
  const step = 8 / c.scale;
  const reach = Math.ceil(Math.max(c.frame.width, c.frame.height) / 8);
  let best: { p: Point; out: number; d: number } | null = null;
  for (let i = -reach; i <= reach; i++)
    for (let j = -reach; j <= reach; j++) {
      const p = at({ x: c.center.x + i * step, y: c.center.y + j * step });
      if (!clear(p)) continue;
      const out = leaves(p);
      const d = Math.hypot(p.x - start.x, p.y - start.y);
      if (!best || out < best.out - 1e-6 || (Math.abs(out - best.out) <= 1e-6 && d < best.d)) best = { p, out, d };
    }
  return best ? { ...best.p, outside: best.out } : { ...start, outside: leaves(start) };
};

// A divider the user dragged at one stop: it holds until the story moves to another stop.
export interface DraggedSplit {
  stop: number;
  split: number;
}

// The pair a Story stop shows in wipe and where its divider stands: the stop's split, or the
// one dragged at this stop. Null at a stop without a compare (or an unknown pair), so arriving
// adds the moving image and leaving takes it away.
export const stopCompare = <P extends { pair: { id: string } }>(
  stops: readonly Stop[],
  index: number,
  pairs: readonly P[],
  dragged: DraggedSplit | null,
): { view: P; split: number } | null => {
  const compare = stops[index]?.compare;
  const view = compare && pairs.find((p) => p.pair.id === compare.pairId);
  if (!compare || !view) return null;
  return { view, split: dragged?.stop === index ? dragged.split : compare.split };
};

// The modes a Journey's Home card lists (design.md 5.6, C5-3): Light with a band set, Compare
// when a stop shows a pair.
export const journeyModes = (journey: { bandSetId?: string; stops: readonly Stop[] }) =>
  ["Story", "Explore", ...(journey.stops.some((s) => s.compare) ? ["Compare"] : []), ...(journey.bandSetId ? ["Light"] : [])].join(", ");
