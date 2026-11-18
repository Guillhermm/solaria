export interface Ticks {
  step: number;
  major: { value: number; at: number }[];
  minor: number[];
}

const MANTISSAS = [1, 2, 5];

// Smallest 1, 2 or 5 times a power of ten whose labels sit at least minGapPx apart.
// design.md 6.2 asks for 7 to 12rem; a 1-2-5 series can step by 2.5x, so the gap can
// exceed 12rem right after a step change.
export const rulerStep = (scale: number, minGapPx: number) => {
  const raw = minGapPx / scale;
  let power = 10 ** Math.floor(Math.log10(raw));
  for (;;) {
    for (const m of MANTISSAS) if (m * power >= raw) return m * power;
    power *= 10;
  }
};

// 5 minor intervals for a step of 1 or 5 times a power of ten, 4 for 2 times.
const minorCount = (step: number) => {
  const mantissa = Math.round(step / 10 ** Math.floor(Math.log10(step)));
  return mantissa === 2 ? 4 : 5;
};

// Ticks along one ruler. `start` is the image coordinate at the ruler's first screen pixel,
// `scale` is screen pixels per image pixel, `length` the ruler length in screen pixels and
// `limit` the image size on that axis; ticks outside 0..limit are left out.
export const rulerTicks = (start: number, scale: number, length: number, limit: number, minGapPx: number): Ticks => {
  const step = rulerStep(scale, minGapPx);
  const sub = step / minorCount(step);
  const end = start + length / scale;
  const lo = Math.max(0, start);
  const hi = Math.min(limit, end);
  const major: Ticks["major"] = [];
  const minor: number[] = [];
  for (let i = Math.ceil(lo / sub); i * sub <= hi; i++) {
    const value = i * sub;
    const at = (value - start) * scale;
    // Integer index arithmetic avoids float drift in the major test.
    if (i % minorCount(step) === 0) major.push({ value, at });
    else minor.push(at);
  }
  return { step, major, minor };
};
