import type { EntryKind, SearchEntry, SearchIndex } from "./build";
import { centerExample } from "./build";
import { marked, type Segment, words } from "./text";

export type RowKind = EntryKind | "point";

export interface Row {
  kind: RowKind;
  text: string;
  context: string;
  href: string;
  marks: Segment[];
}

export type Block = { type: "line"; text: string } | { type: "group"; label: string; rows: Row[] };

export interface Outcome {
  blocks: Block[];
  rows: Row[]; // every selectable row, in the order shown
  live: string; // Q17, "" when there is nothing to say
}

// The page a viewer search runs on: its image (and band set), and how a point becomes a link there.
export interface Here {
  imageIds: string[];
  width: number;
  height: number;
  pointHref: (x: number, y: number) => string;
}

export const MAX_ROWS = 8;
const KIND_ORDER: Record<EntryKind, number> = { label: 0, stop: 1, image: 2 };

// Q15: null when a query word prefixes no word of the text.
export const tierOf = (text: readonly string[], query: readonly string[]): 0 | 1 | 2 | null => {
  if (!query.every((q) => text.some((w) => w.startsWith(q)))) return null;
  if (text.length === query.length && text.every((w, i) => w === query[i])) return 0;
  const n = query.length;
  const lead = text.length >= n && query.slice(0, -1).every((q, i) => text[i] === q) && text[n - 1].startsWith(query[n - 1]);
  return lead ? 1 : 2;
};

const POINT = /^\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*|\s+)(-?\d+(?:\.\d+)?)\s*$/;

// Q22. A number past the safe integers would print as 1e+24, not as typed, and is in no image
// anyway, so it is not a point. "+ 0" turns a rounded -0.4 into 0.
export const parsePoint = (query: string) => {
  const m = POINT.exec(query);
  if (!m) return null;
  const [x, y] = [m[1], m[2]].map((v) => Math.round(Number(v)) + 0);
  return Number.isSafeInteger(x) && Number.isSafeInteger(y) ? { x, y } : null;
};

// Q25: detected, not converted.
export const isSky = (query: string) => /\d[hms°′″'"]/i.test(query) || words(query).some((w) => w === "ra" || w === "dec");

const hint = (example: string) =>
  `Search image titles, feature labels and Journey stop titles. To go to a point, type its image pixels, like ${example}.`;

const results = (n: number) => (n === 0 ? "No results" : n === 1 ? "1 result" : `${n} results`);

const toRow = (e: SearchEntry, query: readonly string[]): Row => ({ kind: e.kind, text: e.text, context: e.context, href: e.href, marks: marked(e.text, query) });

const onHere = (e: SearchEntry, here?: Here) => (here && e.images.some((id) => here.imageIds.includes(id)) ? 0 : 1);

export const search = (index: SearchIndex, raw: string, here?: Here): Outcome => {
  if (index.entries.length === 0) return { blocks: [{ type: "line", text: "Nothing to search yet." }], rows: [], live: "" };
  const example = here ? centerExample(here.width, here.height) : index.example;
  const query = words(raw);

  if (query.length === 0) {
    const labels = index.entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.kind === "label")
      .sort((a, b) => onHere(a.e, here) - onHere(b.e, here) || a.i - b.i)
      .map(({ e }) => toRow(e, []));
    const blocks: Block[] = [{ type: "line", text: hint(example) }];
    if (labels.length) blocks.push({ type: "group", label: "Labeled features", rows: labels });
    return { blocks, rows: labels, live: "" };
  }

  const matched = index.entries
    .map((e, i) => ({ e, i, tier: tierOf(words(e.text), query) }))
    .filter((m): m is typeof m & { tier: 0 | 1 | 2 } => m.tier !== null)
    .sort((a, b) => a.tier - b.tier || onHere(a.e, here) - onHere(b.e, here) || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || a.i - b.i);
  const names = matched.slice(0, MAX_ROWS).map(({ e }) => toRow(e, query));

  const blocks: Block[] = [];
  if (names.length) blocks.push({ type: "group", label: "Results", rows: names });
  if (matched.length > MAX_ROWS) blocks.push({ type: "line", text: `Showing ${MAX_ROWS} of ${matched.length}. Type more to narrow.` });

  let points: Row[] = [];
  let pointLine: string | null = null;
  const point = isSky(raw) ? null : parsePoint(raw);
  if (isSky(raw)) pointLine = `Sky coordinates (RA and Dec) are not supported yet. Type image pixels instead, like ${example}.`;
  else if (point) {
    const holds = (w: number, h: number) => point.x >= 0 && point.y >= 0 && point.x < w && point.y < h;
    const go = `Go to ${point.x}, ${point.y}`;
    if (here) {
      if (holds(here.width, here.height)) points = [{ kind: "point", text: go, context: "In this image", href: here.pointHref(point.x, point.y), marks: [{ text: go, strong: false }] }];
      else pointLine = `No pixel at ${point.x}, ${point.y} in this image. Points run from 0, 0 to ${here.width - 1}, ${here.height - 1}.`;
    } else {
      points = index.places
        .filter((p) => holds(p.width, p.height))
        .map((p) => ({ kind: "point" as const, text: go, context: p.title, href: `${p.href}&x=${point.x}&y=${point.y}&z=4`, marks: [{ text: go, strong: false }] }));
      if (!points.length) pointLine = `No image has a pixel at ${point.x}, ${point.y}.`;
    }
  }
  if (points.length) blocks.push({ type: "group", label: "Go to a point", rows: points });
  if (pointLine) blocks.push({ type: "line", text: pointLine });
  if (!names.length && !points.length && !pointLine) blocks.push({ type: "line", text: `No matches for “${raw.trim()}”.` }, { type: "line", text: hint(example) });

  return { blocks, rows: [...names, ...points], live: results(matched.length + points.length) };
};
