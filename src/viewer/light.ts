import type { Band } from "@/content/types";

export interface LightState {
  set: string;
  band: number; // index of the band on the rail, 0 first
}

export interface LightOptions {
  sets: readonly { id: string; imageIds: readonly string[] }[]; // the default set first
}

// ?mode=light&set=<id>&band=<imageId>: an unknown set falls back to the first, an unknown band
// to the first stop of the set.
export const parseLightParams = (search: string, opts: LightOptions): LightState => {
  const params = new URLSearchParams(search);
  const set = opts.sets.find((s) => s.id === params.get("set")) ?? opts.sets[0];
  const band = Math.max(0, set.imageIds.indexOf(params.get("band") ?? ""));
  return { set: set.id, band };
};

// The parameters Light adds to the URL, defaults (the first set, the first band) left out.
export const lightParams = (state: LightState, opts: LightOptions): [string, string][] => {
  const set = opts.sets.find((s) => s.id === state.set);
  if (!set) return [];
  const out: [string, string][] = [];
  if (set.id !== opts.sets[0].id) out.push(["set", set.id]);
  if (state.band > 0 && state.band < set.imageIds.length) out.push(["band", set.imageIds[state.band]]);
  return out;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Opacity of each band while `from` fades to `to` (any two bands, t from 0 to 1). Bands stack
// in rail order, so the one lower in the stack stays opaque and the upper one carries the
// fade: in at t when it is the target, out at 1 - t when it is the band being left. Either way
// the screen shows (1 - t) from + t to.
export const blend = (from: number, to: number, t: number, count: number): number[] => {
  const k = clamp(t, 0, 1);
  if (from === to || k === 1) return Array.from({ length: count }, (_, i) => (i === to ? 1 : 0));
  const upper = Math.max(from, to);
  const lower = Math.min(from, to);
  const top = upper === to ? k : 1 - k;
  return Array.from({ length: count }, (_, i) => (i === lower ? 1 : i === upper ? top : 0));
};

// The band a Journey stop shows: its own, or the last one an earlier stop picked (design: a stop
// without a band keeps the current one), or the rail's first. -1 entries are stops without one.
export const stopBand = (bands: readonly number[], stop: number) => {
  for (let i = Math.min(stop, bands.length - 1); i >= 0; i--) if (bands[i] >= 0) return bands[i];
  return 0;
};

// Opacity of each band at a rail position between 0 and count - 1. The lower band of the pair
// stays opaque and the upper one fades in over it, so the screen shows (1 - t) A + t B. Every
// other band is at zero, which OpenSeadragon skips for drawing and loading.
export const crossfade = (position: number, count: number): number[] => {
  const p = clamp(position, 0, count - 1);
  const lower = Math.min(Math.floor(p), count - 1);
  const t = p - lower;
  return Array.from({ length: count }, (_, i) => (i === lower ? 1 : i === lower + 1 ? t : 0));
};

// The bands on screen, whose credits show: the stop's fade pair, else the two around the position.
export const shownBands = (position: number, count: number, fade?: { from: number; to: number } | null): number[] => {
  if (fade) return [...new Set([fade.from, fade.to])];
  const p = clamp(position, 0, count - 1);
  return [...new Set([Math.floor(p), Math.ceil(p)])];
};

// Bands next to the position keep loading while hidden, so a drag finds their tiles ready.
export const preloaded = (position: number, count: number): boolean[] =>
  Array.from({ length: count }, (_, i) => Math.abs(i - position) < 2);

// The stop a released drag settles on.
export const nearestStop = (position: number, count: number) => Math.round(clamp(position, 0, count - 1));

// Stops sit at the middle of equal columns, so their labels never run past the rail's ends.
export const stopCenter = (index: number, count: number) => (index + 0.5) / count;

export const positionFromPointer = (clientX: number, box: { left: number; width: number }, count: number) =>
  clamp(((clientX - box.left) / box.width) * count - 0.5, 0, count - 1);

// WAI-ARIA slider keys, one band per step (design.md 7.4).
export const railKey = (key: string, index: number, count: number): number | null => {
  if (key === "ArrowLeft" || key === "ArrowDown" || key === "PageDown") return Math.max(0, index - 1);
  if (key === "ArrowRight" || key === "ArrowUp" || key === "PageUp") return Math.min(count - 1, index + 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
};

const UNIT_WORDS: Record<NonNullable<Band["wavelength"]>["unit"], [string, string]> = {
  Å: ["angstrom", "angstroms"],
  nm: ["nanometer", "nanometers"],
  µm: ["micrometer", "micrometers"],
};

// The number and unit as the manifest states them, never converted.
export const wavelengthLabel = (band: Band) => (band.wavelength ? `${band.wavelength.value} ${band.wavelength.unit}` : band.id);

// "171 angstroms, extreme ultraviolet". Without a wavelength the band's own name is read.
export const bandValueText = (band: Band) => {
  const w = band.wavelength;
  const spoken = w ? `${w.value} ${UNIT_WORDS[w.unit][w.value === 1 ? 0 : 1]}` : band.id;
  return band.region ? `${spoken}, ${band.region}` : spoken;
};
