"use client";

import { type RefObject, useEffect, useRef } from "react";
import type OpenSeadragon from "openseadragon";
import { tileSource } from "@/content/tiles";
import { createSync } from "@/viewer/divider";
import { movingCrop, overlapBounds, placement, referenceCrop, splitToReferenceX, wholeImage } from "@/viewer/compare";
import type { Layout } from "@/viewer/url";
import type { Size } from "@/viewer/view";
import type { CompareView } from "./types";

type OSDModule = typeof OpenSeadragon;

// OpenSeadragon reads plain { x, y } objects; its typings ask for its own Point class.
const crop = (item: OpenSeadragon.TiledImage, polygons: { x: number; y: number }[][]) =>
  item.setCroppingPolygons(polygons as OpenSeadragon.Point[][]);

export interface Margins {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface Opened {
  OSD: OSDModule;
  viewer: OpenSeadragon.Viewer;
  margins: () => Margins;
  rotates: boolean; // the drawer can turn an image; Compare needs it (design.md 5.8)
}

interface Options {
  opened: Opened | null;
  view: CompareView | null; // null outside compare mode
  reference: Size;
  referenceFootprint?: { x: number; y: number }[][]; // the reference's data area; the whole image without one
  layout: Layout;
  split: number;
  showMoving: boolean; // Blink: which image is up
  tileBaseUrl: string;
  sideHost: RefObject<HTMLDivElement | null>;
  fitOverlap: RefObject<boolean>; // a link without a view: fit the overlap once the moving image is in

}

// Hidden polygons: a degenerate triangle crops everything away without dropping the image,
// so its tiles stay loaded while the divider sits at the far right.
const NOTHING = [[{ x: -1, y: -1 }, { x: -1, y: -1 }, { x: -1, y: -1 }]];

// docs/architecture-compare.md section 1: the moving image joins the reference in one viewer
// and one coordinate frame. The world keeps the reference's home bounds, so zoom, the readout
// and the URL stay relative to the reference fit.
export const useCompareLayer = ({ opened, view, reference, referenceFootprint, layout, split, showMoving, tileBaseUrl, sideHost, fitOverlap }: Options) => {
  const itemRef = useRef<OpenSeadragon.TiledImage | null>(null);
  const update = useRef<() => void>(() => {});
  const state = useRef({ layout, split, showMoving });
  useEffect(() => {
    state.current = { layout, split, showMoving };
    update.current();
  }, [layout, split, showMoving]);

  useEffect(() => {
    if (!opened || !view) return;
    const { OSD, viewer } = opened;
    const s = view.pair.registration.transform === "similarity" ? view.pair.registration.similarity : { scale: reference.width / view.moving.tiles.width, rotationDeg: 0, tx: 0, ty: 0 };
    const moving = { width: view.moving.tiles.width, height: view.moving.tiles.height };
    const footprint = view.moving.footprint ?? wholeImage(moving);
    const refItem = viewer.world.getItemAt(0);
    let item: OpenSeadragon.TiledImage | null = null;
    let cancelled = false;

    // The overview stays a map of the reference: OpenSeadragon mirrors every new image into the
    // navigator, so the mirror of the moving image is taken out as soon as it arrives.
    const nav = viewer.navigator;
    const dropMirror = (e: { item: OpenSeadragon.TiledImage }) => {
      if (nav && nav.world.getIndexOfItem(e.item) > 0) queueMicrotask(() => nav.world.removeItem(e.item));
    };
    nav?.world.addHandler("add-item", dropMirror as unknown as OpenSeadragon.EventHandler<OpenSeadragon.WorldEvent>);

    // Both images are cut with cropping polygons, never with setClip or opacity: the navigator
    // copies a clip and an opacity onto its mirror of the reference, and the overview must stay whole.
    // Each image shows only its own data area, so the black frame of an orthorectified image
    // never shows past the overlap.
    const whole = referenceFootprint ?? wholeImage(reference);
    update.current = () => {
      if (!item) return;
      const { layout: l, split: at, showMoving: up } = state.current;
      if (l === "wipe") {
        const vp = viewer.viewport;
        const m = opened.margins();
        const x = splitToReferenceX(at, { width: viewer.container.clientWidth, marginLeft: m.left, marginRight: m.right }, vp.getBoundsNoRotate(true), reference);
        const r = referenceCrop(whole, x);
        crop(refItem, r.length ? r : NOTHING);
        const kept = movingCrop(footprint, s, x);
        crop(item, kept.length ? kept : NOTHING);
      } else {
        // Side by side: the left viewer shows only the reference; Blink shows one at a time.
        const movingUp = l === "blink" && up;
        crop(refItem, movingUp ? NOTHING : whole);
        crop(item, movingUp ? footprint : NOTHING);
      }
      viewer.forceRedraw();
    };

    // Adding an item would make the home bounds the union of both images.
    viewer.world.setAutoRefigureSizes(false);
    viewer.addTiledImage({
      tileSource: tileSource(view.moving, tileBaseUrl),
      ...placement(s, moving, reference),
      success: (e: { item: OpenSeadragon.TiledImage }) => {
        if (cancelled) {
          viewer.world.removeItem(e.item);
          return;
        }
        item = e.item;
        itemRef.current = item;
        update.current();
        if (fitOverlap.current) {
          const b = overlapBounds(footprint, s, reference);
          const k = reference.width;
          if (b) viewer.viewport.fitBounds(new OSD.Rect(b.x / k, b.y / k, b.width / k, b.height / k), true).applyConstraints(true);
        }
      },
    } as unknown as OpenSeadragon.TiledImageOptions);
    const onChange = () => update.current();
    viewer.addHandler("viewport-change", onChange);
    viewer.addHandler("resize", onChange);

    return () => {
      cancelled = true;
      nav?.world.removeHandler("add-item", dropMirror as unknown as OpenSeadragon.EventHandler<OpenSeadragon.WorldEvent>);
      viewer.removeHandler("viewport-change", onChange);
      viewer.removeHandler("resize", onChange);
      update.current = () => {};
      itemRef.current = null;
      if (item) viewer.world.removeItem(item);
      viewer.world.setAutoRefigureSizes(true);
      refItem.resetCroppingPolygons();
    };
    // The reference's size is read through its two numbers, so a new object of the same size
    // does not re-add the image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, view, reference.width, reference.height, referenceFootprint, tileBaseUrl, fitOverlap]);

  // Side by side (desktop): a second viewer holds the moving image in the same frame, so
  // syncing is a copy of center and zoom. The viewer that took the last input leads.
  useEffect(() => {
    const host = sideHost.current;
    if (!opened || !view || layout !== "side" || !host) return;
    const { OSD, viewer: a } = opened;
    const s = view.pair.registration.transform === "similarity" ? view.pair.registration.similarity : { scale: reference.width / view.moving.tiles.width, rotationDeg: 0, tx: 0, ty: 0 };
    const moving = { width: view.moving.tiles.width, height: view.moving.tiles.height };
    const b = OSD({
      element: host,
      drawer: "canvas",
      crossOriginPolicy: "Anonymous",
      showNavigationControl: false,
      animationTime: (a as unknown as { animationTime: number }).animationTime,
      // The same margins as the left viewer, so one zoom and center give one scale and place.
      viewportMargins: opened.margins(),
      visibilityRatio: 0,
      minZoomImageRatio: 0,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      keyboardNavEnabled: false,
    } as OpenSeadragon.Options);
    const sync = createSync<"a" | "b">();
    sync.lead("a");
    const copy = (from: OpenSeadragon.Viewer, to: OpenSeadragon.Viewer) => {
      to.viewport.zoomTo(from.viewport.getZoom(true), undefined, true);
      to.viewport.panTo(from.viewport.getCenter(true), true);
    };
    const onA = () => sync.changed("a", () => copy(a, b));
    const onB = () => sync.changed("b", () => copy(b, a));
    const leadA = () => sync.lead("a");
    const leadB = () => sync.lead("b");
    const aHost = a.container;
    for (const name of ["pointerdown", "wheel", "keydown", "touchstart"] as const) {
      aHost.addEventListener(name, leadA, { capture: true, passive: true });
      host.addEventListener(name, leadB, { capture: true, passive: true });
    }
    b.addOnceHandler("open", () => {
      crop(b.world.getItemAt(0), view.moving.footprint ?? wholeImage(moving));
      copy(a, b);
      a.addHandler("viewport-change", onA);
      b.addHandler("viewport-change", onB);
    });
    b.open({ tileSource: tileSource(view.moving, tileBaseUrl), ...placement(s, moving, reference) } as unknown as OpenSeadragon.TileSourceOptions);
    b.canvas.setAttribute("aria-hidden", "true");
    b.canvas.tabIndex = -1;
    return () => {
      a.removeHandler("viewport-change", onA);
      for (const name of ["pointerdown", "wheel", "keydown", "touchstart"] as const) {
        aHost.removeEventListener(name, leadA, { capture: true });
        host.removeEventListener(name, leadB, { capture: true });
      }
      b.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, view, layout, sideHost, reference.width, reference.height, tileBaseUrl]);
};
