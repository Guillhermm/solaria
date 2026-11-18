"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { LuArrowLeft, LuMaximize, LuMinimize, LuMinus, LuPlus, LuRotateCcw } from "react-icons/lu";
import type OpenSeadragon from "openseadragon";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { tileSource } from "@/content/tiles";
import type { ImageManifest, Source } from "@/content/types";
import { overviewHeightRem, shapeOf } from "@/viewer/overview";
import { formatInt, formatZoom, homeView, viewFromOsd } from "@/viewer/view";
import { drawRuler } from "./drawRuler";
import styles from "./Explore.module.css";

interface ExploreProps {
  image: ImageManifest;
  source: Source;
  tileBaseUrl: string;
}

const noSubscribe = () => () => {};

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
      viewer.addHandler("open", schedule);
      viewer.addHandler("viewport-change", schedule);
      viewer.addHandler("resize", schedule);
      document.fonts.ready.then(schedule);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
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
    </main>
  );
};

export default Explore;
