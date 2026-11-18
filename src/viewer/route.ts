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

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export const chipText = (indexes: number[], number: (i: number) => string) => indexes.map(number).join("·");

// Stop markers share one chip ("03·04") when they are nearer than `min` on screen or when their
// chips would overlap, so none hides another. `chip` gives the box a chip with that text takes
// beside its marker. A merged chip is wider, so merging repeats until no two chips touch.
// Groups come back in stop order, each led by its lowest stop, which carries the chip.
export const mergeMarks = (marks: Mark[], min: number, chip: (mark: Mark, text: string) => Box, number: (i: number) => string): number[][] => {
  let groups = marks.map((m) => [m.index]);
  for (let pass = 0; pass <= marks.length; pass++) {
    const lead = new Map(groups.flatMap((g) => g.map((i) => [i, g] as const)));
    const at = new Map(marks.map((m) => [m.index, m]));
    const boxes = new Map(groups.map((g) => [g, chip(at.get(g[0])!, chipText(g, number))]));
    const parent = marks.map((_, i) => i);
    const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
    for (let i = 0; i < marks.length; i++)
      for (let j = i + 1; j < marks.length; j++) {
        const [a, b] = [marks[i], marks[j]];
        const ga = lead.get(a.index)!;
        const gb = lead.get(b.index)!;
        if (ga === gb || Math.hypot(a.x - b.x, a.y - b.y) < min || overlaps(boxes.get(ga)!, boxes.get(gb)!)) parent[root(j)] = root(i);
      }
    const out = new Map<number, number[]>();
    marks.forEach((m, i) => out.set(root(i), [...(out.get(root(i)) ?? []), m.index]));
    const next = [...out.values()].map((g) => g.sort((x, y) => x - y)).sort((x, y) => x[0] - y[0]);
    if (next.length === groups.length) return next;
    groups = next;
  }
  return groups;
};

// A chip that sits beside its bracket's top right corner, or mirrored to the top left one.
export interface Tag {
  index: number;
  right: Box;
  left: Box;
}

// design.md 5.6, C-05 polish: the current stop's chip moves to its bracket's other top corner
// when it would cover another marker's chip or a side label; another marker's chip moves when a
// side label would cover it. Returns the stops whose chip moves.
export const flipTags = (current: Tag | null, others: Tag[], labels: Box[]): Set<number> => {
  const flipped = new Set<number>();
  for (const t of others) if (labels.some((l) => overlaps(t.right, l)) && !labels.some((l) => overlaps(t.left, l))) flipped.add(t.index);
  if (current) {
    const shown = [...others.map((t) => (flipped.has(t.index) ? t.left : t.right)), ...labels];
    if (shown.some((b) => overlaps(current.right, b)) && !shown.some((b) => overlaps(current.left, b))) flipped.add(current.index);
  }
  return flipped;
};
