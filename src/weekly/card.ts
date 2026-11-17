import type { Content, ImageManifest } from "@/content/types";
import { type Field, type LensTile, lensField, lensLevel, lensTiles } from "@/home/lens";
import { labelHref, nearestStop, setTitle } from "@/search/build";
import { paragraphs, stopOf, storySearch } from "@/viewer/story";
import { isoWeek, weeklyIndex } from "./pick";

// design.md 15.3, W9: tiles are chosen for this many device pixels across the crop, and no more
// than MAX_TILES load. Where the level that gives 720 needs more, the next coarser level that fits
// is drawn (15.5, as built).
export const CROP_DEVICE_PX = 720;
export const MAX_TILES = 16;

export const cropTiles = (tiles: ImageManifest["tiles"], field: Field) => {
  let level = lensLevel(tiles, field.side, CROP_DEVICE_PX);
  let out = lensTiles(tiles, field, CROP_DEVICE_PX, level);
  while (out.length > MAX_TILES && level > tiles.minLevel) out = lensTiles(tiles, field, CROP_DEVICE_PX, --level);
  return out;
};

export interface WeeklyCard {
  week: number;
  title: string;
  context: string;
  paragraphs: string[];
  caveat: string | null;
  href: string;
  image: { id: string; title: string; width: number; height: number; tiles: ImageManifest["tiles"] };
  field: Field;
  tiles: LensTile[];
  mark: "bracket" | "ring" | "circle"; // W10: a stop's bracket, a label's ring, or its circle with r
  credit: string;
  alt: string;
}

// A square of `side` image pixels, kept inside the image as the viewer keeps its view (W9).
const fieldOf = (x: number, y: number, side: number, image: ImageManifest): Field => {
  const { width, height } = image.tiles;
  const keep = (v: number, size: number) => (side >= size ? size / 2 : Math.min(size - side / 2, Math.max(side / 2, v)));
  return { x: keep(x, width), y: keep(y, height), side, zoom: Math.max(width, height) / side };
};

// The card for the week of `date` (YYYY-MM-DD), or null when the pool is empty (W1, W3).
export const weeklyCard = (content: Content, date: string): WeeklyCard | null => {
  if (content.weekly.length === 0) return null;
  const { week } = isoWeek(date);
  const item = content.weekly[weeklyIndex(week, content.weekly.length)];
  const image = (id: string) => content.images.find((i) => i.id === id)!;
  let base: Omit<WeeklyCard, "week" | "tiles" | "credit" | "alt" | "caveat">;

  if (item.kind === "stop") {
    const journey = content.journeys.find((j) => j.slug === item.journey)!;
    const index = journey.stops.findIndex((s) => s.id === item.stop);
    const stop = journey.stops[index];
    const img = image(stop.band ?? journey.imageId);
    const own = lensField(stop, img.tiles);
    base = {
      title: stop.title,
      context: `${journey.title} · ${stopOf(index, journey.stops.length)}`,
      paragraphs: paragraphs(item.body ?? stop.body),
      href: `/${journey.slug}/${storySearch(index)}`,
      image: { id: img.id, title: img.title, width: img.tiles.width, height: img.tiles.height, tiles: img.tiles },
      field: fieldOf(own.x, own.y, item.side ?? own.side, img),
      mark: "bracket",
    };
  } else {
    const set = content.labels.find((l) => l.id === item.labels)!;
    const label = set.labels.find((l) => l.id === item.label)!;
    const img = image(set.imageIds[0]);
    const near = nearestStop(content, img.id, label);
    const side = item.side ?? (label.r ? 3 * label.r : near ? lensField(near, img.tiles).side : Math.max(img.tiles.width, img.tiles.height));
    base = {
      title: label.text,
      context: `Feature label · ${setTitle(content, set.imageIds)}`,
      paragraphs: paragraphs(item.body ?? label.description),
      href: labelHref(content, set, label),
      image: { id: img.id, title: img.title, width: img.tiles.width, height: img.tiles.height, tiles: img.tiles },
      field: fieldOf(label.x, label.y, side, img),
      mark: label.r ? "circle" : "ring",
    };
  }

  const source = content.sources.find((s) => s.id === image(base.image.id).sourceId)!;
  return {
    ...base,
    week,
    caveat: item.caveat ?? null,
    tiles: cropTiles(base.image.tiles, base.field),
    credit: source.credit,
    alt: `${base.title}, a detail of ${base.image.title}`,
  };
};
