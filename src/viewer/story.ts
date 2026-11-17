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
// pixels. The camera never goes past one screen pixel per image pixel, so on a large screen a
// deep stop shows more around it rather than magnified pixels.
export const viewBounds = (view: Viewport, image: Size, viewer: Size): Bounds => {
  const scale = Math.min(fitScale(viewer, image) * view.z, 1);
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
export const flightPlan = (from: Bounds, fromZ: number, to: Viewport, image: Size, viewer: Size, span: number): Leg[] => {
  const target = viewBounds(to, image, viewer);
  if (overlaps(from, target)) return [{ bounds: target, ms: flightMs(fromZ, to.z, span) }];
  return [
    { bounds: union(from, target), ms: FLIGHT_MAX_MS / 2 },
    { bounds: target, ms: FLIGHT_MAX_MS / 2 },
  ];
};
