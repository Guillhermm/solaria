import type { Content, FeatureLabel, ImageManifest, LabelSet, Stop } from "@/content/types";
import { aimableStops } from "@/home/lens";
import { serializeViewerParams } from "@/viewer/url";
import { stopOf, stopTarget, storySearch } from "@/viewer/story";

export type EntryKind = "label" | "stop" | "image";

export interface SearchEntry {
  kind: EntryKind;
  text: string;
  context: string; // "" for an image
  href: string;
  images: string[]; // the images this entry is on, for "the current page's image first" (Q15)
}

// An image, or a band set as one, that a point query can land on (Q24).
export interface SearchPlace {
  title: string;
  width: number;
  height: number;
  href: string; // `/<id>/?mode=...`, the view parameters appended
}

export interface SearchIndex {
  entries: SearchEntry[];
  places: SearchPlace[];
  example: string; // the Home hero image's center, "x, y"
}

const published = (r: { validation: { status: string }; mock: boolean }) => r.validation.status === "approved" && !r.mock;

export const centerExample = (width: number, height: number) => `${Math.floor(width / 2)}, ${Math.floor(height / 2)}`;

// Q3: the image that owns a label, labels on, centered on it. With r the radius fills a third of
// the shorter side; without, the zoom of the stop on that image whose target is nearest.
export const labelHref = (content: Content, set: LabelSet, label: FeatureLabel) => {
  const first = set.imageIds[0];
  const image = content.images.find((i) => i.id === first)!;
  const banded = content.bandSets.some((b) => b.imageIds[0] === first && b.imageIds.length === set.imageIds.length && set.imageIds.every((id) => b.imageIds.includes(id)));
  const z = label.r ? Number((Math.min(image.tiles.width, image.tiles.height) / (3 * label.r)).toFixed(2)) : nearestStopZoom(content, first, label);
  return `/${first}/${serializeViewerParams({ mode: banded ? "light" : "explore", view: { x: label.x, y: label.y, z }, labels: true })}`;
};

export const nearestStop = (content: Content, imageId: string, at: { x: number; y: number }): Stop | null => {
  let best: { stop: Stop; d: number } | null = null;
  for (const j of content.journeys.filter((j) => j.imageId === imageId)) {
    for (const stop of j.stops) {
      const t = stopTarget(stop);
      if (!t) continue;
      const d = Math.hypot(t.x - at.x, t.y - at.y);
      if (!best || d < best.d) best = { stop, d };
    }
  }
  return best?.stop ?? null;
};

const nearestStopZoom = (content: Content, imageId: string, label: FeatureLabel) => nearestStop(content, imageId, label)?.viewport.z ?? 1;

// The title a set of images goes by: a band set's own, else the image's.
export const setTitle = (content: Content, imageIds: string[]) => {
  const set = content.bandSets.find((b) => b.imageIds[0] === imageIds[0] && imageIds.length > 1);
  return set?.title ?? content.images.find((i) => i.id === imageIds[0])?.title ?? "";
};

// design.md 15.2, Q1: built at build time from validated content only. Journey stops at the fit
// view (the whole image, "Your turn") land on nothing specific and stay out (design.md 15.5).
export const buildSearchIndex = (content: Content): SearchIndex => {
  const images = content.images.filter(published).sort((a, b) => (a.id < b.id ? -1 : 1));
  const shown = new Set(images.map((i) => i.id));
  const journeys = content.journeys.filter((j) => published(j) && shown.has(j.imageId));
  const labels: SearchEntry[] = content.labels
    .filter((set) => published(set) && set.imageIds.every((id) => shown.has(id)))
    .flatMap((set) =>
      set.labels.map((label) => ({
        kind: "label" as const,
        text: label.text,
        context: setTitle(content, set.imageIds),
        href: labelHref(content, set, label),
        images: set.imageIds,
      })),
    );
  const stops: SearchEntry[] = journeys.flatMap((j) =>
    aimableStops(j.stops)
      .filter((i) => j.stops[i].validation.status === "approved")
      .map((i) => ({
        kind: "stop" as const,
        text: j.stops[i].title,
        context: `${j.title} · ${stopOf(i, j.stops.length)}`,
        href: `/${j.slug}/${storySearch(i)}`,
        images: [...new Set([j.imageId, j.stops[i].band ?? j.imageId])],
      })),
  );
  const imageEntries: SearchEntry[] = images.map((i) => ({ kind: "image", text: i.title, context: "", href: `/${i.id}/?mode=explore`, images: [i.id] }));

  return { entries: [...labels, ...stops, ...imageEntries], places: places(content, images, journeys), example: example(images, journeys) };
};

const example = (images: ImageManifest[], journeys: Content["journeys"]) => {
  const hero = images.find((i) => i.id === journeys[0]?.imageId) ?? images[0];
  return hero ? centerExample(hero.tiles.width, hero.tiles.height) : "";
};

// Q24: Journey images in roadmap order, then the rest by id; a band set's images are one place,
// its first image in Light.
const places = (content: Content, images: ImageManifest[], journeys: Content["journeys"]): SearchPlace[] => {
  const sets = content.bandSets.filter((b) => published(b) && b.imageIds.every((id) => images.some((i) => i.id === id)));
  const order = [...journeys.map((j) => j.imageId), ...images.map((i) => i.id)];
  const out: SearchPlace[] = [];
  const done = new Set<string>();
  for (const id of order) {
    if (done.has(id)) continue;
    const image = images.find((i) => i.id === id)!;
    const set = sets.find((s) => s.imageIds.includes(id));
    const ids = set ? set.imageIds : [id];
    ids.forEach((x) => done.add(x));
    const first = set ? set.imageIds[0] : id;
    out.push({
      title: set ? set.title : image.title,
      width: image.tiles.width,
      height: image.tiles.height,
      href: `/${first}/?mode=${set ? "light" : "explore"}`,
    });
  }
  return out;
};
