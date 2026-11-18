"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuMaximize, LuMinimize, LuRotateCcw } from "react-icons/lu";
import type OpenSeadragon from "openseadragon";
import { tileSource } from "@/content/tiles";
import type { DeepViewerProps } from "@/types";
import styles from "./DeepViewer.module.css";

const DeepViewer = ({ title, image, tileBaseUrl }: DeepViewerProps) => {
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [center, setCenter] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // OpenSeadragon touches `document` when its module loads, so it cannot run during the
  // static export; it is imported in the browser only.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    let viewer: OpenSeadragon.Viewer | undefined;

    const sync = () => {
      if (!viewer) return;
      const vp = viewer.viewport;
      setScale(vp.getZoom());
      const c = vp.getCenter();
      setCenter({ x: c.x, y: c.y });
    };

    import("openseadragon").then(({ default: OSD }) => {
      if (cancelled) return;
      viewer = OSD({
        element,
        tileSources: tileSource(image, tileBaseUrl),
        crossOriginPolicy: "Anonymous",
        showZoomControl: false,
        showHomeControl: false,
        showRotationControl: false,
        showNavigationControl: false,
        autoHideControls: false,
        showNavigator: true,
        navigatorPosition: "BOTTOM_RIGHT",
        navigatorSizeRatio: 0.2,
        navigatorMaintainSizeRatio: false,
        navigatorBackground: "#000",
        navigatorOpacity: 0.8,
      });
      viewerRef.current = viewer;
      viewer.addHandler("open", sync);
      viewer.addHandler("viewport-change", sync);
    });

    return () => {
      cancelled = true;
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [image, tileBaseUrl]);

  const handleZoomTo = useCallback((percent: number) => {
    if (!viewerRef.current || Number.isNaN(percent)) return;
    const vp = viewerRef.current.viewport;
    vp.zoomTo(percent / 100, vp.getCenter(), true);
  }, []);

  const handleReset = useCallback(() => {
    viewerRef.current?.viewport.goHome();
  }, []);

  // Esc leaves fullscreen without going through the button, so follow the document.
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapperRef.current.requestFullscreen();
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
  }, []);

  const percent = Math.round(scale * 100);

  return (
    <section className={styles.section} aria-labelledby="deep-viewer-title">
      <h2 id="deep-viewer-title" className={styles.title}>{title}</h2>
      <p className={styles.lede}>
        Explore every detail, without waiting: our Deep Viewer splits massive
        images into many small tiles, loading only what you need at your current
        view. Zoom, pan, or select areas, in which the system will quickly fetch
        just the right pieces, so you see crisp detail fast, without overloading
        your browser or network. It is designed to be fast, responsive, and
        intuitive, so you can spend more time discovering and less time waiting.
      </p>
      <h3 className={styles.imageTitle}>{image.title}</h3>
      <div
        ref={wrapperRef}
        className={styles.frame}
        data-theme="dark"
        data-fullscreen={isFullscreen || undefined}
      >
        <div ref={containerRef} className={styles.canvas} />
        <p className={styles.status}>
          Zoom {scale.toFixed(2)} <span aria-hidden>|</span> Center ({center.x.toFixed(2)},{" "}
          {center.y.toFixed(2)})
        </p>
        <div className={styles.controls}>
          <div className={styles.slider}>
            <span aria-hidden>100%</span>
            <input
              type="range"
              min="100"
              max="5000"
              value={percent}
              aria-label="Zoom"
              onChange={(e) => handleZoomTo(parseInt(e.target.value, 10))}
            />
            <span aria-hidden>5000%</span>
          </div>
          <label className={styles.zoomInput}>
            <span>Zoom</span>
            <input
              id="zoomInput"
              type="number"
              min="100"
              max="5000"
              value={percent}
              aria-label="Zoom percentage"
              onChange={(e) => handleZoomTo(parseInt(e.target.value, 10))}
            />
            <span aria-hidden>%</span>
          </label>
          <button id="full-screen" type="button" className={styles.button} onClick={toggleFullscreen}>
            {isFullscreen ? <LuMinimize aria-hidden /> : <LuMaximize aria-hidden />}
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          <button id="reset" type="button" className={styles.button} onClick={handleReset}>
            <LuRotateCcw aria-hidden />
            Reset view
          </button>
        </div>
      </div>
    </section>
  );
};

export default DeepViewer;
