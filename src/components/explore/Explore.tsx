"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { LuArrowLeft, LuMaximize, LuMinimize, LuMinus, LuPlus, LuRotateCcw, LuShare } from "react-icons/lu";
import type OpenSeadragon from "openseadragon";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { tileSource } from "@/content/tiles";
import type { ImageManifest, Source } from "@/content/types";
import { overviewHeightRem, shapeOf } from "@/viewer/overview";
import { parseViewerParams, serializeViewerParams } from "@/viewer/url";
import { formatInt, formatZoom, homeView, osdFromView, type Size, viewFromOsd } from "@/viewer/view";
import { drawRuler } from "./drawRuler";
import styles from "./Explore.module.css";

interface ExploreProps {
  image: ImageManifest;
  source: Source;
  tileBaseUrl: string;
}

const noSubscribe = () => () => {};

// The settled view (OpenSeadragon's target, not the frame in flight).
const settledView = (viewer: OpenSeadragon.Viewer, size: Size) => {
  const vp = viewer.viewport;
  return viewFromOsd(vp.getCenter(), vp.getZoom(), vp.getHomeZoom(), size);
};

const viewUrl = (viewer: OpenSeadragon.Viewer, size: Size) =>
  `${window.location.pathname}${serializeViewerParams({ mode: "explore", view: settledView(viewer, size) })}`;

// Next.js keeps its router state in history.state, so it is passed back unchanged.
const replaceUrl = (url: string) => window.history.replaceState(window.history.state, "", url);

const Explore = ({ image, source, tileBaseUrl }: ExploreProps) => {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const rulerTopRef = useRef<HTMLCanvasElement>(null);
  const rulerLeftRef = useRef<HTMLCanvasElement>(null);
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  const zRef = useRef<HTMLSpanElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // iPhone Safari has no element fullscreen; the button goes rather than doing nothing.
  const canFullscreen = useSyncExternalStore(noSubscribe, () => document.fullscreenEnabled, () => true);
  const navId = useId();

  const size = { width: image.tiles.width, height: image.tiles.height };
  const home = homeView(size);
  const shape = shapeOf(size);
  const overviewStyle = {
    "--ov-h": `${overviewHeightRem(size)}rem`,
    "--ov-ar": `${size.width} / ${size.height}`,
  } as CSSProperties;

  useEffect(() => {
    const host = canvasRef.current;
    const navHost = navRef.current;
    if (!host || !navHost) return;
    let cancelled = false;
    let frame = 0;
    let urlTimer = 0;
    let viewer: OpenSeadragon.Viewer | undefined;
    const { width, height } = image.tiles;

    // Readouts and rulers are written straight to the DOM, at most once per frame, so a pan
    // never re-renders React (design.md 9, INP).
    const paint = () => {
      frame = 0;
      if (!viewer) return;
      const vp = viewer.viewport;
      const view = viewFromOsd(vp.getCenter(true), vp.getZoom(true), vp.getHomeZoom(), { width, height });
      if (xRef.current) xRef.current.textContent = formatInt(view.x);
      if (yRef.current) yRef.current.textContent = formatInt(view.y);
      if (zRef.current) zRef.current.textContent = formatZoom(view.z);
      const bounds = vp.getBoundsNoRotate(true);
      const scale = host.clientWidth / (bounds.width * width);
      const top = rulerTopRef.current;
      const left = rulerLeftRef.current;
      if (top && top.offsetParent) drawRuler(top, "x", bounds.x * width + top.offsetLeft / scale, scale, width);
      if (left && left.offsetParent) drawRuler(left, "y", bounds.y * width + left.offsetTop / scale, scale, height);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // OpenSeadragon touches `document` when its module loads, so it is imported in the browser only.
    import("openseadragon").then(({ default: OSD }) => {
      if (cancelled) return;
      // OpenSeadragon wraps the navigator element in a div of its own, so React must not own it.
      const nav = document.createElement("div");
      nav.id = navId;
      nav.className = styles.navigator;
      navHost.replaceChildren(nav);
      const token = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      viewer = OSD({
        element: host,
        tileSources: tileSource(image, tileBaseUrl),
        crossOriginPolicy: "Anonymous",
        showNavigationControl: false,
        showNavigator: true,
        navigatorId: navId,
        navigatorAutoFade: false,
        navigatorBackground: token(navHost, "--viewer-canvas"),
        navigatorBorderColor: "transparent",
        navigatorDisplayRegionColor: token(navHost, "--accent"),
        navigatorOpacity: 1,
        // The image never leaves the view, and the most you can zoom out is the fit.
        visibilityRatio: 1,
        constrainDuringPan: true,
        minZoomImageRatio: 1,
        animationTime: reduce ? 0 : 1.2,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      });
      viewerRef.current = viewer;
      const opened = viewer;
      opened.addHandler("open", () => {
        // A shared link restores its view; anything invalid in it was already clamped or dropped.
        const { view } = parseViewerParams(window.location.search, { width, height });
        if (view) {
          const vp = opened.viewport;
          const target = osdFromView(view, vp.getHomeZoom(), { width, height });
          vp.zoomTo(target.zoom, undefined, true);
          vp.panTo(new OSD.Point(target.center.x, target.center.y), true);
          vp.applyConstraints(true);
        }
        host.dataset.open = "";
        schedule();
      });
      // design.md 7.1: the URL follows the view 400 ms after it settles.
      opened.addHandler("animation-finish", () => {
        clearTimeout(urlTimer);
        urlTimer = window.setTimeout(() => replaceUrl(viewUrl(opened, { width, height })), 400);
      });
      viewer.addHandler("viewport-change", schedule);
      viewer.addHandler("resize", schedule);
      document.fonts.ready.then(schedule);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(urlTimer);
      viewer?.destroy();
      viewerRef.current = null;
      navHost.replaceChildren();
    };
  }, [image, tileBaseUrl, navId]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const share = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const url = new URL(viewUrl(viewer, { width: image.tiles.width, height: image.tiles.height }), window.location.href).href;
    replaceUrl(url);
    try {
      // Phones get the system share sheet; elsewhere the link goes to the clipboard.
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: image.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link to this view copied.");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setToast("Could not copy the link. Copy it from the address bar.");
    }
  }, [image]);

  const zoomBy = useCallback((factor: number) => {
    const vp = viewerRef.current?.viewport;
    if (!vp) return;
    vp.zoomBy(factor);
    vp.applyConstraints();
  }, []);

  const reset = useCallback(() => viewerRef.current?.viewport.goHome(), []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      // Refused by the browser (no user gesture, or a policy); the view stays as it is.
    }
  }, []);

  return (
    <main ref={rootRef} className={styles.root} data-shape={shape}>
      <div ref={canvasRef} className={styles.canvas} data-theme="dark" data-testid="viewer" />

      <div className={styles.rulers} data-theme="dark" aria-hidden>
        <canvas ref={rulerTopRef} className={styles.rulerTop} />
        <canvas ref={rulerLeftRef} className={styles.rulerLeft} />
      </div>

      <header className={styles.topbar}>
        <div className={`${styles.bar} ${styles.glass}`}>
          <Link href="/" className={styles.iconButton} aria-label="Back to home">
            <LuArrowLeft aria-hidden />
          </Link>
          <Link href="/" className={styles.wordmark}>
            <span aria-hidden className={styles.mark} />
            Solaria
          </Link>
          <span className={styles.divider} aria-hidden />
          <h1 className={styles.title}>{image.title}</h1>
          <span className={styles.mode}>Explore</span>
        </div>
        <div className={`${styles.bar} ${styles.glass}`}>
          <button type="button" className={styles.iconButton} onClick={share} aria-label="Share this view">
            <LuShare aria-hidden />
          </button>
          <ThemeSwitcher />
        </div>
      </header>

      <p className={`${styles.credit} ${styles.glass}`}>{source.credit}</p>

      <div className={styles.sheet}>
        <div className={`${styles.controls} ${styles.glass}`} role="group" aria-label="View controls">
          <button type="button" className={styles.iconButton} onClick={() => zoomBy(2)} aria-label="Zoom in">
            <LuPlus aria-hidden />
          </button>
          <button type="button" className={styles.iconButton} onClick={() => zoomBy(0.5)} aria-label="Zoom out">
            <LuMinus aria-hidden />
          </button>
          <button type="button" className={styles.iconButton} onClick={reset} aria-label="Reset view">
            <LuRotateCcw aria-hidden />
          </button>
          {canFullscreen && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <LuMinimize aria-hidden /> : <LuMaximize aria-hidden />}
            </button>
          )}
        </div>

        <div className={`${styles.overview} ${styles.glass}`} data-theme="dark">
          <p className={styles.overviewHead}>
            <span>Overview</span>
            <span className={styles.size}>
              {formatInt(size.width)} × {formatInt(size.height)} px
            </span>
          </p>
          <div ref={navRef} className={styles.nav} style={overviewStyle} data-testid="overview-image" />
        </div>

        <p className={`${styles.readout} ${styles.glass}`} data-theme="dark" data-testid="readout">
          <span className={styles.key}>Center x</span>
          <span ref={xRef} className={styles.value}>{formatInt(home.x)}</span>
          <span className={styles.key}>y</span>
          <span ref={yRef} className={styles.value}>{formatInt(home.y)}</span>
          <span className={styles.key}>Zoom</span>
          <span ref={zRef} className={styles.zoom}>{formatZoom(home.z)}</span>
        </p>
      </div>

      <div className={styles.toasts} role="status">
        {toast && <p className={`${styles.toast} ${styles.glass}`}>{toast}</p>}
      </div>
    </main>
  );
};

export default Explore;
