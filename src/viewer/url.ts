import type { Viewport } from "@/content/types";
import type { Size } from "./view";

export const MODES = ["story", "explore", "compare", "light"] as const;
export type Mode = (typeof MODES)[number];

export interface ViewerState {
  mode: Mode;
  view: Viewport | null; // null: the image at fit
}

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
): ViewerState => {
  const params = new URLSearchParams(search);
  const asked = params.get("mode");
  const mode = available.find((m) => m === asked) ?? available[0];
  const x = num(params.get("x"));
  const y = num(params.get("y"));
  const z = num(params.get("z"));
  if (x === null || y === null || z === null) return { mode, view: null };
  return {
    mode,
    view: {
      x: Math.round(clamp(x, 0, image.width)),
      y: Math.round(clamp(y, 0, image.height)),
      z: clamp(z, 1, maxZoom(image)),
    },
  };
};

export const serializeViewerParams = ({ mode, view }: ViewerState) => {
  const params = new URLSearchParams({ mode });
  if (view) {
    params.set("x", String(Math.round(view.x)));
    params.set("y", String(Math.round(view.y)));
    // Two decimals restore the view closely; the readout shows one.
    params.set("z", String(Number(view.z.toFixed(2))));
  }
  return `?${params}`;
};
