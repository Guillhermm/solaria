import type { Point, Size } from "@/viewer/view";

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Inside a convex polygon (either winding), edges included.
const inside = (poly: Point[], p: Point) => {
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

// The largest box of the slot's shape inside an image's data area, centered on that area, so
// a thumbnail can cover its slot without the black frame of an orthorectified image. The
// footprint's first polygon is taken as convex; null when the image has no footprint.
export const coverCrop = (footprint: Point[][] | undefined, image: Size, aspect: number): Crop | null => {
  const poly = footprint?.[0];
  if (!poly || poly.length < 3) return null;
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  const fits = (h: number) => {
    const w = h * aspect;
    return [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy + h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
    ].every((p) => p.x >= 0 && p.y >= 0 && p.x <= image.width && p.y <= image.height && inside(poly, p));
  };
  let lo = 0;
  let hi = image.height;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  if (lo <= 0) return null;
  const height = Math.floor(lo);
  const width = Math.floor(lo * aspect);
  return { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height };
};
