import type { Viewport } from "@/content/types";

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// Screen pixels per image pixel when the whole image fits the viewer (design.md 6.3).
export const fitScale = (viewer: Size, image: Size) =>
  Math.min(viewer.width / image.width, viewer.height / image.height);

// The science team's formula: zoom = (viewportWidth / visibleWidth) / fitScale, where
// visibleWidth is in image pixels.
export const relativeZoom = (viewer: Size, visibleWidth: number, image: Size) =>
  viewer.width / visibleWidth / fitScale(viewer, image);

// OpenSeadragon places a single image so its width spans 0 to 1 in viewport coordinates,
// and its zoom counts viewer widths per image width. Its home zoom is the fit.
export const osdHomeZoom = (viewer: Size, image: Size) =>
  Math.min(1, (viewer.height / viewer.width) * (image.width / image.height));

export const imageToViewport = (p: Point, image: Size): Point => ({
  x: p.x / image.width,
  y: p.y / image.width,
});

export const viewportToImage = (p: Point, image: Size): Point => ({
  x: p.x * image.width,
  y: p.y * image.width,
});

// What the readout and the URL show, from OpenSeadragon's center and zoom.
export const viewFromOsd = (center: Point, zoom: number, homeZoom: number, image: Size): Viewport => {
  const p = viewportToImage(center, image);
  return { x: Math.round(p.x), y: Math.round(p.y), z: zoom / homeZoom };
};

export const osdFromView = (view: Viewport, homeZoom: number, image: Size) => ({
  center: imageToViewport(view, image),
  zoom: view.z * homeZoom,
});

export const homeView = (image: Size): Viewport => ({
  x: Math.round(image.width / 2),
  y: Math.round(image.height / 2),
  z: 1,
});

// Thousands take a narrow no-break space (U+202F), as design.md 6.1 asks: "42 208".
export const formatInt = (n: number) => {
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const formatZoom = (z: number) => `${z.toFixed(1)}×`;
