"use client";

import { useEffect, useRef } from "react";
import type OpenSeadragon from "openseadragon";
import type { Opened } from "@/components/compare/useCompareLayer";
import { tileSource } from "@/content/tiles";
import { crossfade, preloaded } from "@/viewer/light";
import type { LightView } from "./types";

interface Options {
  opened: Opened | null;
  view: LightView | null; // null outside light mode
  position: number; // on the rail, 0 to bands - 1
  tileBaseUrl: string;
}

// A hidden image keeps the "fully loaded" flag it had when it was hidden and skips its update
// until the view moves (OpenSeadragon 5.0.1, TiledImage.update), so one shown again without a
// pan would draw nothing. This flag is the one its own setters raise.
const refresh = (item: OpenSeadragon.TiledImage) => {
  (item as unknown as { _needsUpdate: boolean })._needsUpdate = true;
};

// Light (design.md 5.7, 7.4): every band of the set is a tiled image in one viewer on one
// pixel grid, in rail order, so the world's first image is the page's own and keeps the home
// bounds. Moving along the rail only changes opacities; the navigator mirrors each image and
// copies its opacity, so the overview crossfades with the view.
export const useLightLayer = ({ opened, view, position, tileBaseUrl }: Options) => {
  const positionRef = useRef(position);
  const apply = useRef<() => void>(() => {});
  useEffect(() => {
    positionRef.current = position;
    apply.current();
  }, [position]);

  useEffect(() => {
    if (!opened || !view) return;
    const { viewer } = opened;
    const count = view.bands.length;
    const items: (OpenSeadragon.TiledImage | null)[] = [viewer.world.getItemAt(0), ...Array<null>(count - 1).fill(null)];
    let cancelled = false;

    apply.current = () => {
      const opacity = crossfade(positionRef.current, count);
      const preload = preloaded(positionRef.current, count);
      items.forEach((item, i) => {
        if (!item) return;
        if (item.getOpacity() === 0 && opacity[i] > 0) refresh(item);
        item.setOpacity(opacity[i]);
        item.setPreload(preload[i]);
      });
      viewer.forceRedraw();
    };

    // The overview adds its mirrors as they load; it keeps them in the main world's order, so
    // its crossfade stacks the same way.
    const nav = viewer.navigator;
    const sortMirrors = () => {
      if (!nav) return;
      const rank = (m: OpenSeadragon.TiledImage) =>
        viewer.world.getIndexOfItem((m as unknown as { _originalForNavigator: OpenSeadragon.TiledImage })._originalForNavigator);
      const mirrors = Array.from({ length: nav.world.getItemCount() }, (_, i) => nav.world.getItemAt(i)).sort((a, b) => rank(a) - rank(b));
      mirrors.forEach((m, i) => nav.world.setItemIndex(m, i));
    };
    const onMirror = () => queueMicrotask(sortMirrors);
    nav?.world.addHandler("add-item", onMirror);

    viewer.world.setAutoRefigureSizes(false);
    view.bands.slice(1).forEach((band, k) => {
      const i = k + 1;
      viewer.addTiledImage({
        tileSource: tileSource(band.image, tileBaseUrl),
        x: 0,
        y: 0,
        width: 1,
        opacity: crossfade(positionRef.current, count)[i],
        preload: preloaded(positionRef.current, count)[i],
        success: (e: { item: OpenSeadragon.TiledImage }) => {
          if (cancelled) {
            viewer.world.removeItem(e.item);
            return;
          }
          items[i] = e.item;
          // Images can arrive out of order; the world keeps them in rail order.
          const before = items.slice(0, i).filter((x) => x !== null).length;
          viewer.world.setItemIndex(e.item, before);
          apply.current();
          sortMirrors();
        },
      } as unknown as OpenSeadragon.TiledImageOptions);
    });
    apply.current();

    return () => {
      cancelled = true;
      nav?.world.removeHandler("add-item", onMirror);
      apply.current = () => {};
      for (const item of items.slice(1)) if (item) viewer.world.removeItem(item);
      const first = items[0];
      if (first) {
        refresh(first);
        first.setOpacity(1);
        first.setPreload(false);
      }
      viewer.world.setAutoRefigureSizes(true);
    };
  }, [opened, view, tileBaseUrl]);
};
