import { rulerTicks } from "@/viewer/ruler";
import { formatInt } from "@/viewer/view";

interface Ink {
  theme: string | undefined;
  font: string;
  major: string;
  minor: string;
  label: string;
  rem: number;
}

const inks = new WeakMap<HTMLCanvasElement, Ink>();

// Colors come from the theme tokens on the canvas; a theme switch or a late font refreshes them.
const inkFor = (canvas: HTMLCanvasElement): Ink => {
  const theme = document.documentElement.dataset.theme;
  const cached = inks.get(canvas);
  if (cached && cached.theme === theme && document.fonts.status === "loaded") return cached;
  const style = getComputedStyle(canvas);
  const ink = {
    theme,
    font: `${style.fontSize} ${style.fontFamily}`,
    major: style.getPropertyValue("--tick-major").trim(),
    minor: style.getPropertyValue("--hairline").trim(),
    label: style.getPropertyValue("--text-muted").trim(),
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  };
  inks.set(canvas, ink);
  return ink;
};

// One ruler along the top (axis "x") or left (axis "y") edge. `start` is the image
// coordinate at the canvas's first pixel, `scale` screen pixels per image pixel.
export const drawRuler = (canvas: HTMLCanvasElement, axis: "x" | "y", start: number, scale: number, limit: number) => {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.round(width * dpr);
  const ph = Math.round(height * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const ink = inkFor(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const length = axis === "x" ? width : height;
  const ticks = rulerTicks(start, scale, length, limit, 7 * ink.rem);
  const depth = axis === "x" ? height : width;

  // Ticks grow from the edge that faces the image: 8 px major, 4 px minor (design.md 6.2).
  const tick = (at: number, size: number) => {
    const p = Math.round(at) + 0.5;
    if (axis === "x") {
      ctx.moveTo(p, depth);
      ctx.lineTo(p, depth - size);
    } else {
      ctx.moveTo(depth, p);
      ctx.lineTo(depth - size, p);
    }
  };

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.strokeStyle = ink.minor;
  for (const at of ticks.minor) tick(at, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = ink.major;
  for (const m of ticks.major) tick(m.at, 8);
  ctx.stroke();

  ctx.font = ink.font;
  ctx.fillStyle = ink.label;
  for (const m of ticks.major) {
    const text = formatInt(m.value);
    if (axis === "x") {
      ctx.textBaseline = "top";
      ctx.fillText(text, Math.round(m.at) + 4, 4);
    } else {
      ctx.textBaseline = "bottom";
      ctx.fillText(text, 4, Math.round(m.at) - 3);
    }
  }
};
