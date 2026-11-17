import type { Viewport } from "@/content/types";
import { type LightOptions, type LightState, lightParams, parseLightParams } from "./light";
import type { Size } from "./view";

export const MODES = ["story", "explore", "compare", "light"] as const;
export type Mode = (typeof MODES)[number];

export const LAYOUTS = ["wipe", "side", "blink"] as const;
export type Layout = (typeof LAYOUTS)[number];

export interface CompareState {
  pair: string;
  layout: Layout;
  split: number; // integer percent of the viewer width from the left, 0 to 100
}

export interface ViewerState {
  mode: Mode;
  view: Viewport | null; // null: the image at fit
  compare?: CompareState; // only in compare mode
  light?: LightState; // only in light mode
  labels?: boolean; // feature labels on (design.md 14.2, L2); Explore and Light only
}

export const DEFAULT_SPLIT = 50;

export interface CompareOptions {
  pairs: readonly string[]; // pairs offered on this page, the default first
  side: boolean; // whether Side by side fits (desktop only, design.md 5.6)
}

// docs/architecture-compare.md section 4: pair, layout and split, each falling back to its
// default when unknown or malformed.
export const parseCompareParams = (search: string, opts: CompareOptions): CompareState => {
  const params = new URLSearchParams(search);
  const pair = opts.pairs.find((p) => p === params.get("pair")) ?? opts.pairs[0];
  const asked = LAYOUTS.find((l) => l === params.get("layout")) ?? "wipe";
  const layout = asked === "side" && !opts.side ? "wipe" : asked;
  const raw = params.get("split");
  const split = raw !== null && /^\d{1,3}$/.test(raw) ? Math.min(100, Number(raw)) : DEFAULT_SPLIT;
  return { pair, layout, split };
};

// Plain decimals only: no exponents, hex, Infinity or empty strings.
const NUMBER = /^-?\d+(\.\d+)?$/;

const num = (value: string | null) => (value !== null && NUMBER.test(value) ? Number(value) : null);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// The most zoom a URL may ask for: a viewer at least 1 px across shows one image pixel at
// fit scale times max(W, H). OpenSeadragon then applies its own, tighter limit.
export const maxZoom = (image: Size) => Math.max(image.width, image.height);

// design.md section 4: ?mode=&x=&y=&z=, x and y in image pixels, z relative to fit.
// Anything missing or malformed falls back to the mode's default and the fit view; numbers
// out of range are clamped to the image and to 1 <= z <= maxZoom.
export const parseViewerParams = (
  search: string,
  image: Size,
  available: readonly Mode[] = ["explore"],
  compare?: CompareOptions,
  light?: LightOptions,
): ViewerState => {
  const params = new URLSearchParams(search);
  const asked = params.get("mode");
  const offered = (m: Mode) =>
    m === "compare" ? !!compare && compare.pairs.length > 0 : m === "light" ? !!light && light.sets.length > 0 : true;
  const mode = available.find((m) => m === asked && offered(m)) ?? available[0];
  const extra =
    mode === "compare" && compare ? { compare: parseCompareParams(search, compare) }
    : mode === "light" && light ? { light: parseLightParams(search, light) }
    : {};
  const x = num(params.get("x"));
  const y = num(params.get("y"));
  const z = num(params.get("z"));
  if (x === null || y === null || z === null) return { mode, view: null, ...extra };
  return {
    mode,
    ...extra,
    view: {
      x: Math.round(clamp(x, 0, image.width)),
      y: Math.round(clamp(y, 0, image.height)),
      z: clamp(z, 1, maxZoom(image)),
    },
  };
};

// Compare defaults (the first pair, wipe, split 50) and Light defaults (the first set and band)
// are left out.
export const serializeViewerParams = ({ mode, view, compare, light, labels }: ViewerState, defaultPair?: string, lightOpts?: LightOptions) => {
  const params = new URLSearchParams({ mode });
  if (mode === "light" && light && lightOpts) for (const [k, v] of lightParams(light, lightOpts)) params.set(k, v);
  if (mode === "compare" && compare) {
    if (compare.pair !== defaultPair) params.set("pair", compare.pair);
    if (compare.layout !== "wipe") params.set("layout", compare.layout);
    if (compare.split !== DEFAULT_SPLIT) params.set("split", String(Math.round(compare.split)));
  }
  if (labels && (mode === "explore" || mode === "light")) params.set("labels", "1");
  if (view) {
    params.set("x", String(Math.round(view.x)));
    params.set("y", String(Math.round(view.y)));
    // Two decimals restore the view closely; the readout shows one.
    params.set("z", String(Number(view.z.toFixed(2))));
  }
  return `?${params}`;
};
