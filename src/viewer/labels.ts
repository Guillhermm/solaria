import type { FeatureLabel, Stop, Viewport } from "@/content/types";
import { fitScale, type Size } from "./view";

// Screen boxes in CSS pixels, from the top-left of the viewport.
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Disk {
  cx: number;
  cy: number;
  r: number;
}

// design.md 14: two boxes intersect when they overlap by more than 1px on both axes.
export const intersects = (a: Box, b: Box) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;

export const inside = (a: Box, area: Box) =>
  a.x >= area.x - 1 && a.y >= area.y - 1 && a.x + a.width <= area.x + area.width + 1 && a.y + a.height <= area.y + area.height + 1;

const hitsDisk = (b: Box, d: Disk) => {
  const nx = Math.max(b.x, Math.min(d.cx, b.x + b.width));
  const ny = Math.max(b.y, Math.min(d.cy, b.y + b.height));
  return Math.hypot(nx - d.cx, ny - d.cy) < d.r - 1;
};

// L5 and L6: a point feature is a ring 10px across; a feature with an extent draws its circle
// once that is 12px or more on screen.
export const RING_PX = 10;
export const MIN_CIRCLE_PX = 12;

export const SIDES = ["right", "left", "above", "below"] as const;
export type Side = (typeof SIDES)[number];

export interface Mark {
  id: string;
  cx: number;
  cy: number;
  circle: number | null; // on-screen radius when drawn as a circle
}

export const markOf = (label: FeatureLabel, cx: number, cy: number, scale: number): Mark => {
  const r = label.r ? label.r * scale : 0;
  return { id: label.id, cx, cy, circle: r >= MIN_CIRCLE_PX ? r : null };
};

// Where a chip on the right hangs its leader: the ring's center, or the circle's edge at 45
// degrees up and right. Left, above and below sit off the circle's own box.
const anchorOf = (m: Mark) =>
  m.circle === null ? { x: m.cx, y: m.cy, edge: RING_PX / 2 } : { x: m.cx + m.circle / Math.SQRT2, y: m.cy - m.circle / Math.SQRT2, edge: 0 };

const markBox = (m: Mark): Box =>
  m.circle === null
    ? { x: m.cx - RING_PX / 2, y: m.cy - RING_PX / 2, width: RING_PX, height: RING_PX }
    : { x: m.cx - m.circle, y: m.cy - m.circle, width: 2 * m.circle, height: 2 * m.circle };

const hitsMark = (b: Box, m: Mark) => (m.circle === null ? intersects(b, markBox(m)) : hitsDisk(b, { cx: m.cx, cy: m.cy, r: m.circle }));

export interface ChipSize {
  width: number; // the visible chip
  height: number;
  target: number; // the button's height around it (transparent padding above and below)
}

export interface Placed {
  id: string;
  side: Side;
  chip: Box; // the visible chip
  button: Box; // what takes pointer input; every collision is tested on it
  leader: [number, number, number, number]; // x1 y1 x2 y2
}

export interface Placement {
  marks: Mark[]; // the markers drawn, in data order
  chips: Placed[]; // the chips shown, in data order
}

// L10 to L13: markers whose center is outside the free area (a box less the corners the side
// overlays close off, `blocked`) are not drawn; each chip, in data order, takes the first side
// whose button lies in the free area and hits no chip, marker, circle or obstacle placed so far.
// A chip that fits nowhere is hidden; its marker stays.
export const placeLabels = (marks: Mark[], sizes: Map<string, ChipSize>, free: Box, obstacles: Box[], leader: number, blocked: Box[] = []): Placement => {
  const point = (m: Mark) => ({ x: m.cx, y: m.cy, width: 0, height: 0 });
  const shown = marks.filter((m) => inside(point(m), free) && !blocked.some((b) => inside(point(m), b)));
  obstacles = [...obstacles, ...blocked];
  const chips: Placed[] = [];
  for (const m of shown) {
    const size = sizes.get(m.id);
    if (!size) continue;
    const pad = (size.target - size.height) / 2;
    for (const side of SIDES) {
      const { x, y, edge } = side === "right" || m.circle === null ? anchorOf(m) : { x: m.cx, y: m.cy, edge: m.circle };
      const near = edge + leader;
      const chip: Box =
        side === "right" ? { x: x + near, y: y - size.height / 2, width: size.width, height: size.height }
        : side === "left" ? { x: x - near - size.width, y: y - size.height / 2, width: size.width, height: size.height }
        : side === "above" ? { x: x - size.width / 2, y: y - near - size.height, width: size.width, height: size.height }
        : { x: x - size.width / 2, y: y + near, width: size.width, height: size.height };
      const button = { x: chip.x, y: chip.y - pad, width: chip.width, height: size.target };
      const fits =
        inside(button, free) &&
        !chips.some((c) => intersects(button, c.button)) &&
        !shown.some((o) => hitsMark(button, o)) &&
        !obstacles.some((o) => intersects(button, o));
      if (!fits) continue;
      const start =
        side === "right" ? [x + edge, y] : side === "left" ? [x - edge, y] : side === "above" ? [x, y - edge] : [x, y + edge];
      const end = side === "right" ? [chip.x, y] : side === "left" ? [chip.x + chip.width, y] : side === "above" ? [x, chip.y + chip.height] : [x, chip.y];
      chips.push({ id: m.id, side, chip, button, leader: [start[0], start[1], end[0], end[1]] });
      break;
    }
  }
  return { marks: shown, chips };
};

// L18: the description sits beside what it describes, in the same order of sides, inside the
// free area and clear of every chip, marker and obstacle. Null when no side fits.
export const placePopover = (anchor: Box, size: { width: number; height: number }, free: Box, avoid: Box[], marks: Mark[], gap: number): Box | null => {
  for (const side of SIDES) {
    const box: Box =
      side === "right" ? { x: anchor.x + anchor.width + gap, y: anchor.y + anchor.height / 2 - size.height / 2, ...size }
      : side === "left" ? { x: anchor.x - gap - size.width, y: anchor.y + anchor.height / 2 - size.height / 2, ...size }
      : side === "above" ? { x: anchor.x + anchor.width / 2 - size.width / 2, y: anchor.y - gap - size.height, ...size }
      : { x: anchor.x + anchor.width / 2 - size.width / 2, y: anchor.y + anchor.height + gap, ...size };
    // Slid along its side to stay in the free area, as long as it still faces its anchor.
    const slid =
      side === "right" || side === "left"
        ? { ...box, y: Math.min(Math.max(box.y, free.y), free.y + free.height - box.height) }
        : { ...box, x: Math.min(Math.max(box.x, free.x), free.x + free.width - box.width) };
    if (inside(slid, free) && !avoid.some((a) => intersects(slid, a)) && !marks.some((m) => hitsMark(slid, m))) return slid;
  }
  return null;
};

// L23: Show centers the feature; a feature with an extent is zoomed so its radius fills a third
// of the shorter side, any other to the zoom of the stop nearest it (the fit without stops).
export const labelView = (label: FeatureLabel, stops: readonly Stop[], image: Size, viewer: Size): Viewport => {
  if (label.r) {
    const scale = Math.min(viewer.width, viewer.height) / 3 / label.r;
    return { x: label.x, y: label.y, z: scale / fitScale(viewer, image) };
  }
  const near = stops
    .map((s) => ({ s, d: Math.hypot(s.viewport.x - label.x, s.viewport.y - label.y) }))
    .sort((a, b) => a.d - b.d)[0];
  return { x: label.x, y: label.y, z: near ? near.s.viewport.z : 1 };
};

// L22: the chips' tab order, left to right, then top to bottom.
export const readingOrder = (chips: Placed[]) =>
  [...chips].sort((a, b) => a.chip.x - b.chip.x || a.chip.y - b.chip.y).map((c) => c.id);

// The labels flag in the URL (design.md 14.2, L2).
export const parseLabelsParam = (search: string) => new URLSearchParams(search).get("labels") === "1";
