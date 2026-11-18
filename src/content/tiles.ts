import type { ImageManifest } from "./types";

const DEFAULT_BASE = "/tiles";

// A root-relative path or an https URL, without a trailing slash. Anything else would let a
// typo or a hostile value point the viewer at an unintended origin, so it fails the build.
export const resolveTileBase = (value: string | undefined): string => {
  if (value === undefined || value === "") return DEFAULT_BASE;
  const fail = () => {
    throw new Error(`TILE_BASE_URL must be a root-relative path or an https URL, got ${JSON.stringify(value)}`);
  };
  if (/\s/.test(value)) return fail();
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.includes("\\") || value.includes("?") || value.includes("#")) return fail();
    return value.replace(/\/$/, "");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail();
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return fail();
  return value.replace(/\/$/, "");
};

export const tileUrl = (base: string, id: string, level: number, x: number, y: number) =>
  `${base}/${encodeURIComponent(id)}/${level}/${x}/${y}.jpg`;

export const tileSource = (image: ImageManifest, base: string) => ({
  width: image.tiles.width,
  height: image.tiles.height,
  tileSize: image.tiles.tileSize,
  tileOverlap: image.tiles.overlap,
  minLevel: image.tiles.minLevel,
  maxLevel: image.tiles.maxLevel,
  getTileUrl: (level: number, x: number, y: number) => tileUrl(base, image.id, level, x, y),
});
