"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuChevronDown,
  LuInfo,
  LuMaximize,
  LuMinimize,
  LuMinus,
  LuPlus,
  LuRotateCcw,
  LuShare,
  LuX,
} from "react-icons/lu";
import type OpenSeadragon from "openseadragon";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { tileSource } from "@/content/tiles";
import type { ImageManifest, Journey, Viewport } from "@/content/types";
import type { Info } from "@/viewer/info";
import { overviewHeightRem, shapeOf } from "@/viewer/overview";
import { keyAction, zoomAnnouncement } from "@/viewer/keys";
import { type SheetState, stepSheet } from "@/viewer/sheet";
import { type Mode, parseViewerParams, serializeViewerParams } from "@/viewer/url";
import { reticleSide } from "@/viewer/route";
import { type Bounds, flightPlan, parseStop, stepStop, stopNumber, stopOf, stopTarget, storySearch, viewBounds, zoomSpan } from "@/viewer/story";
import { formatInt, formatZoom, homeView, osdFromView, type Size, viewFromOsd } from "@/viewer/view";
import { drawRuler } from "./drawRuler";
import InfoPanel from "./InfoPanel";
import RouteOverlay from "./RouteOverlay";
import StoryPanel from "./StoryPanel";
import { useSheetDrag } from "./useSheetDrag";
import styles from "./Explore.module.css";

interface ExploreProps {
  image: ImageManifest;
  info: Info;
  tileBaseUrl: string;
  journey?: Journey; // a Journey page: Story first, then Explore on the same image
}

interface Camera {
  fly: (view: Viewport) => void;
  syncMargins: () => void;
  schedule: () => void;
}

const noSubscribe = () => () => {};

// The phone top bar shows the title up to its first parenthesis or comma ("Andromeda Galaxy"),
// cut from the validated title rather than written anew.
const shortTitle = (title: string) => title.split(/[(,]/)[0].trim() || title;

interface Toast {
  text: string;
  retry?: boolean; // tile errors: offer to fetch the missing tiles again
  sticky?: boolean; // stays until its cause clears
}

const SLOW: Toast = { text: "Still loading the detail. You can start moving around." };
const TILE_ERRORS: Toast = { text: "Some detail could not load.", retry: true, sticky: true };
// design.md 5.8: missing tiles stay at the lower level; only after this many does the user hear of it.
const TILE_ERROR_LIMIT = 10;
const IDLE_MS = 5000;

// The settled view (OpenSeadragon's target, not the frame in flight).
const settledView = (viewer: OpenSeadragon.Viewer, size: Size) => {
  const vp = viewer.viewport;
  return viewFromOsd(vp.getCenter(), vp.getZoom(), vp.getHomeZoom(), size);
};

const viewUrl = (viewer: OpenSeadragon.Viewer, size: Size) =>
  `${window.location.pathname}${serializeViewerParams({ mode: "explore", view: settledView(viewer, size) })}`;

// The URL is the one record of the mode and the stop (design.md 2, "every view is a place").
// Components read it through useSyncExternalStore, so the static HTML and the first render agree.
const URL_EVENT = "solaria:url";

// Next.js keeps its router state in history.state, so it is passed back unchanged.
const replaceUrl = (url: string) => {
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
};

const subscribeUrl = (onChange: () => void) => {
  window.addEventListener(URL_EVENT, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(URL_EVENT, onChange);
    window.removeEventListener("popstate", onChange);
  };
};

const STORY_MODES: readonly Mode[] = ["story", "explore"];
const EXPLORE_MODES: readonly Mode[] = ["explore"];

// "story:2" or "explore": only what the page renders from, so a view change alone does not
// re-render it.
const routeKey = (search: string, journey: Journey | undefined, image: Size) => {
  const { mode } = parseViewerParams(search, image, journey ? STORY_MODES : EXPLORE_MODES);
  return mode === "story" && journey ? `story:${parseStop(search, journey.stops.length)}` : mode;
};

// design.md 5.4: on a phone the camera frames each stop in the top 60 % of the screen.
const PHONE_STORY_FRAME = 0.6;
const PHONE = "(max-width: 40rem)";
const RETICLE_REM = 5.5;

const Explore = ({ image, info, tileBaseUrl, journey }: ExploreProps) => {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const rulerTopRef = useRef<HTMLCanvasElement>(null);
  const rulerLeftRef = useRef<HTMLCanvasElement>(null);
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  const zRef = useRef<HTMLSpanElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const marksRef = useRef<(HTMLDivElement | null)[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const failuresRef = useRef(0);
  const { width: imageWidth, height: imageHeight } = image.tiles;
  const route = useSyncExternalStore(
    subscribeUrl,
    () => routeKey(window.location.search, journey, { width: imageWidth, height: imageHeight }),
    () => (journey ? "story:0" : "explore"),
  );
  const mode: Mode = route.startsWith("story") ? "story" : "explore";
  const stop = mode === "story" ? Number(route.split(":")[1]) : 0;
  const story = mode === "story" && !!journey;
  // The last stop the story showed, kept while Explore is open so Story resumes there.
  const [storyStop, setStoryStop] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  // What the OpenSeadragon handlers need to know about the page, kept current after each render.
  // On desktop only "full" matters (the About panel is open); the phone sheet uses all three.
  const [sheet, setSheet] = useState<SheetState>("peek");
  const infoOpen = sheet === "full";
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const drag = useSheetDrag(
    () => sheetRef.current,
    // The story card moves between its title and the whole stop; About opens from the credit.
    (direction) => setSheet((s) => (story ? (direction === "up" ? "peek" : "min") : stepSheet(s, direction))),
  );
  const infoId = useId();
  const infoTitleRef = useRef<HTMLHeadingElement>(null);
  const aboutRef = useRef<HTMLButtonElement>(null);
  // iPhone Safari has no element fullscreen; the button goes rather than doing nothing.
  const canFullscreen = useSyncExternalStore(noSubscribe, () => document.fullscreenEnabled, () => true);
  const navId = useId();
  const storyId = useId();

  const size = { width: image.tiles.width, height: image.tiles.height };
  const pageRef = useRef({ story, stop, paused, journey });
  useEffect(() => {
    pageRef.current = { story, stop, paused, journey };
  });
  const home = homeView(size);
  const shape = shapeOf(size);
  const overviewStyle = {
    "--ov-h": `${overviewHeightRem(size)}rem`,
    "--ov-ar": `${size.width} / ${size.height}`,
  } as CSSProperties;

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      // Refused by the browser (no user gesture, or a policy); the view stays as it is.
    }
  }, []);

  useEffect(() => {
    const host = canvasRef.current;
    const root = rootRef.current;
    const navHost = navRef.current;
    if (!host || !navHost || !root) return;
    let cancelled = false;
    let frame = 0;
    let urlTimer = 0;
    let liveTimer = 0;
    let lastAnnounced = zoomAnnouncement(1);
    failuresRef.current = 0;
    // Loading is shown through attributes, not state: it flips on every pan that needs tiles.
    const setLoading = (loading: boolean) => {
      root.toggleAttribute("data-loading", loading);
      host.setAttribute("aria-busy", String(loading));
    };
    setLoading(true);
    const slowTimer = window.setTimeout(() => {
      // Never in place of a note that is already up (the tile error carries Retry).
      if (root.hasAttribute("data-loading")) setToast((t) => t ?? SLOW);
    }, 4000);
    let viewer: OpenSeadragon.Viewer | undefined;
    let themeObserver: MutationObserver | undefined;
    const { width, height } = image.tiles;

    // The fit leaves the rulers clear: they are margins of the view, not part of it. In Story
    // the column on desktop, and the sheet below the frame on a phone, are margins too.
    const measureMargins = () => {
      const top = rulerTopRef.current;
      const left = rulerLeftRef.current;
      const phoneStory = pageRef.current.story && window.matchMedia(PHONE).matches;
      return {
        top: top?.offsetParent ? top.offsetTop + top.offsetHeight : 0,
        left: left?.offsetParent ? left.offsetLeft + left.offsetWidth : 0,
        right: 0,
        bottom: phoneStory ? Math.round(host.clientHeight * (1 - PHONE_STORY_FRAME)) : 0,
      };
    };
    let margins = measureMargins();

    // Readouts and rulers are written straight to the DOM, at most once per frame, so a pan
    // never re-renders React (design.md 9, INP).
    const paint = () => {
      frame = 0;
      // document.fonts.ready can resolve after cleanup; a destroyed viewer still answers.
      if (!viewer || cancelled) return;
      const vp = viewer.viewport;
      const view = viewFromOsd(vp.getCenter(true), vp.getZoom(true), vp.getHomeZoom(), { width, height });
      if (xRef.current) xRef.current.textContent = formatInt(view.x);
      if (yRef.current) yRef.current.textContent = formatInt(view.y);
      if (zRef.current) zRef.current.textContent = formatZoom(view.z);
      // Bounds cover the area inside the margins; screen pixels count from the host's corner.
      const bounds = vp.getBoundsNoRotate(true);
      const scale = (host.clientWidth - margins.left - margins.right) / (bounds.width * width);
      const top = rulerTopRef.current;
      const left = rulerLeftRef.current;
      if (top && top.offsetParent)
        drawRuler(top, "x", bounds.x * width + (top.offsetLeft - margins.left) / scale, scale, width);
      if (left && left.offsetParent)
        drawRuler(left, "y", bounds.y * width + (left.offsetTop - margins.top) / scale, scale, height);
      // Stop markers on the image follow it at a fixed screen size (design.md 6.2).
      const { journey: j, story: inStory, stop: at } = pageRef.current;
      if (j && inStory) {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        j.stops.forEach((s, i) => {
          const el = marksRef.current[i];
          const target = stopTarget(s);
          if (!el || !target) return;
          const sx = margins.left + (target.x - bounds.x * width) * scale;
          const sy = margins.top + (target.y - bounds.y * width) * scale;
          el.style.translate = `${sx.toFixed(1)}px ${sy.toFixed(1)}px`;
          if (i === at) el.style.setProperty("--side", `${reticleSide(RETICLE_REM * rem, scale, s.marker?.r)}px`);
        });
      }
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
        viewportMargins: margins,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      });
      viewerRef.current = viewer;
      const opened = viewer;
      const size = { width, height };
      const span = journey ? zoomSpan(journey.stops) : 1;
      // A flight's second leg waits for the first to land; any user gesture drops it.
      let nextLeg: (() => void) | null = null;
      const springs = () => {
        const vp = opened.viewport as unknown as Record<"centerSpringX" | "centerSpringY" | "zoomSpring", { animationTime: number }>;
        return [vp.centerSpringX, vp.centerSpringY, vp.zoomSpring];
      };
      const fitImageBounds = (b: Bounds, ms: number) => {
        const rect = new OSD.Rect(b.x / width, b.y / width, b.width / width, b.height / width);
        // Springs read their duration when they start, so the flight's own time applies to it alone.
        const all = springs();
        const before = all.map((s) => s.animationTime);
        for (const s of all) s.animationTime = ms / 1000;
        opened.viewport.fitBoundsWithConstraints(rect, ms === 0);
        all.forEach((s, i) => (s.animationTime = before[i]));
      };
      const fly = (view: Viewport) => {
        nextLeg = null;
        const vp = opened.viewport;
        const b = vp.getBounds();
        const aspect = { width: b.width, height: b.height };
        const from = { x: b.x * width, y: b.y * width, width: b.width * width, height: b.height * width };
        const [first, second] = flightPlan(from, settledView(opened, size).z, view, size, aspect, span);
        fitImageBounds(first.bounds, first.ms);
        if (second) nextLeg = () => fitImageBounds(second.bounds, second.ms);
      };
      const syncMargins = () => {
        const next = measureMargins();
        if (Object.entries(next).some(([k, v]) => margins[k as keyof typeof margins] !== v)) {
          margins = next;
          (opened.viewport as unknown as { setMargins: (m: typeof margins) => void }).setMargins(margins);
        }
        schedule();
      };
      // design.md 2 and 7.2: a gesture on the image pauses the story; it never locks the user out.
      const pause = () => {
        nextLeg = null;
        if (pageRef.current.story && !pageRef.current.paused) setPaused(true);
      };
      cameraRef.current = { fly, syncMargins, schedule };
      for (const name of ["canvas-press", "canvas-scroll", "canvas-pinch"] as const) opened.addHandler(name, pause);
      opened.navigator?.addHandler("canvas-press", pause);
      opened.canvas.setAttribute("role", "application");
      opened.canvas.setAttribute(
        "aria-label",
        `${image.title} image viewer. Use arrow keys to pan, plus and minus to zoom.`,
      );
      opened.addHandler("canvas-key", (e) => {
        // OpenSeadragon's own keys (WASD, R, Shift+arrows) are off; design.md 7.1 sets the map.
        e.preventDefaultAction = true;
        const key = e.originalEvent as unknown as globalThis.KeyboardEvent;
        if (key.type !== "keydown") return;
        const action = keyAction(key);
        if (!action) return;
        key.preventDefault();
        if (action.kind !== "fullscreen") pause();
        const vp = opened.viewport;
        if (action.kind === "zoom") vp.zoomBy(action.factor);
        else if (action.kind === "pan") {
          const b = vp.getBounds();
          vp.panBy(new OSD.Point(b.width * action.dx, b.height * action.dy));
        } else if (action.kind === "home") vp.goHome();
        else toggleFullscreen();
        vp.applyConstraints();
      });
      opened.addHandler("open-failed", () => {
        if (!cancelled) setFailed(true);
      });
      opened.addHandler("tile-load-failed", () => {
        failuresRef.current += 1;
        if (failuresRef.current === TILE_ERROR_LIMIT) setToast(TILE_ERRORS);
      });
      opened.addHandler("open", () => {
        opened.world.getItemAt(0).addHandler("fully-loaded-change", (e) => {
          setLoading(!e.fullyLoaded);
          if (e.fullyLoaded) setToast((t) => (t === SLOW ? null : t));
        });
        // A shared link restores its view; anything invalid in it was already clamped or dropped.
        // A Journey link opens on its stop.
        const { view, mode: asked } = parseViewerParams(window.location.search, { width, height }, journey ? STORY_MODES : EXPLORE_MODES);
        syncMargins();
        if (journey && asked === "story") {
          fitImageBounds(viewBounds(journey.stops[parseStop(window.location.search, journey.stops.length)].viewport, size, opened.viewport.getBounds()), 0);
        } else if (view) {
          const vp = opened.viewport;
          const target = osdFromView(view, vp.getHomeZoom(), { width, height });
          vp.zoomTo(target.zoom, undefined, true);
          vp.panTo(new OSD.Point(target.center.x, target.center.y), true);
          vp.applyConstraints(true);
        }
        host.dataset.open = "";
        schedule();
      });
      opened.addHandler("animation-finish", () => {
        if (nextLeg) {
          const leg = nextLeg;
          nextLeg = null;
          leg();
          return;
        }
        // design.md 7.1: in Explore the URL follows the view 400 ms after it settles; in Story
        // it holds the stop.
        clearTimeout(urlTimer);
        if (!pageRef.current.story) urlTimer = window.setTimeout(() => replaceUrl(viewUrl(opened, { width, height })), 400);
        // design.md 7.1: the zoom is announced once it settles, never per frame; a stop
        // announces its title instead, unless the user has taken the camera.
        clearTimeout(liveTimer);
        if (pageRef.current.story && !pageRef.current.paused) return;
        liveTimer = window.setTimeout(() => {
          const text = zoomAnnouncement(settledView(opened, { width, height }).z);
          if (text !== lastAnnounced && liveRef.current) liveRef.current.textContent = text;
          lastAnnounced = text;
        }, 500);
      });
      viewer.addHandler("viewport-change", schedule);
      // Crossing the phone breakpoint shows or hides the rulers and the column.
      viewer.addHandler("resize", syncMargins);
      document.fonts.ready.then(schedule);
      // The rulers draw with theme tokens, so a theme switch repaints them.
      themeObserver = new MutationObserver(schedule);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }).catch(() => {
      // The viewer's script could not load (offline, or a deploy replaced it).
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(urlTimer);
      clearTimeout(liveTimer);
      clearTimeout(slowTimer);
      themeObserver?.disconnect();
      viewer?.destroy();
      viewerRef.current = null;
      cameraRef.current = null;
      navHost.replaceChildren();
    };
  }, [image, tileBaseUrl, navId, toggleFullscreen, attempt, journey]);

  // Markers move with the image; a new stop or mode places them again at once.
  useEffect(() => {
    cameraRef.current?.schedule();
  }, [story, stop]);

  // design.md 5.5: the chrome fades after 5 s without input (CSS decides how far, per part
  // and per device). It stays while a panel is open, or while focus or the pointer is in it.
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    let timer = 0;
    const busy = () => {
      const active = document.activeElement;
      const focusInChrome = !!active && root.contains(active) && !canvas.contains(active);
      const hoverInChrome = !!root.querySelector(`.${styles.fade}:hover, .${styles.dim}:hover`);
      return focusInChrome || hoverInChrome || root.hasAttribute("data-info");
    };
    const arm = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (busy()) arm();
        else root.setAttribute("data-idle", "");
      }, IDLE_MS);
    };
    const wake = () => {
      root.removeAttribute("data-idle");
      arm();
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "scroll", "focusin"] as const;
    // Scroll does not bubble, so every listener captures.
    for (const name of events) root.addEventListener(name, wake, { passive: true, capture: true });
    wake();
    return () => {
      clearTimeout(timer);
      for (const name of events) root.removeEventListener(name, wake, { capture: true });
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!toast || toast.sticky) return;
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
      setToast({ text: "Link to this view copied." });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setToast({ text: "Could not copy the link. Copy it from the address bar." });
    }
  }, [image]);

  const openInfo = useCallback(() => {
    setSheet("full");
    // A note would sit over the panel's header; the panel is what the user asked for.
    setToast(null);
    // The panel is hidden until this render commits, so focus waits a frame.
    requestAnimationFrame(() => infoTitleRef.current?.focus());
  }, []);

  const closeInfo = useCallback(() => {
    setSheet("peek");
    // The About button is hidden on phones, where the sheet's handle takes its place.
    const about = aboutRef.current;
    (about?.offsetParent ? about : handleRef.current)?.focus();
  }, []);

  const tapHandle = useCallback(() => {
    if (drag.wasDrag()) return;
    // In Story the handle shows or hides the stop card; About opens from the credit.
    if (story) setSheet((s) => (s === "peek" ? "min" : "peek"));
    else setSheet((s) => (s === "peek" ? "full" : "peek"));
    setToast(null);
  }, [drag, story]);

  const openFromCredit = useCallback(() => {
    setSheet("full");
    setToast(null);
  }, []);

  const announce = useCallback((text: string) => {
    if (liveRef.current) liveRef.current.textContent = text;
  }, []);

  // Next, Previous, the list, the strip and swipes all land here.
  const goTo = useCallback(
    (index: number) => {
      if (!journey || index < 0 || index >= journey.stops.length) return;
      setSeen((s) => new Set(s).add(stop));
      setPaused(false);
      replaceUrl(`${window.location.pathname}${storySearch(index)}`);
      cameraRef.current?.fly(journey.stops[index].viewport);
      announce(`${stopOf(index, journey.stops.length)}: ${journey.stops[index].title}`);
    },
    [journey, stop, announce],
  );

  const resume = useCallback(() => {
    if (!journey) return;
    setPaused(false);
    cameraRef.current?.fly(journey.stops[stop].viewport);
  }, [journey, stop]);

  // The last stop hands the image over (design.md 7.2, "Explore freely").
  const toExplore = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    setStoryStop(stop);
    setSeen((s) => new Set(s).add(stop));
    setPaused(false);
    replaceUrl(viewUrl(viewer, { width: imageWidth, height: imageHeight }));
  }, [stop, imageWidth, imageHeight]);

  const flyOnStory = useRef(false);
  const toStory = useCallback(() => {
    flyOnStory.current = true;
    replaceUrl(`${window.location.pathname}${storySearch(storyStop)}`);
  }, [storyStop]);

  // The column and the phone frame change the margins; back in Story the camera returns to the stop.
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.syncMargins();
    if (story && flyOnStory.current && journey) camera.fly(journey.stops[stop].viewport);
    flyOnStory.current = false;
    // Only a change of mode moves the camera here; stops fly from goTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && infoOpen) {
        e.preventDefault();
        closeInfo();
      }
    },
    [infoOpen, closeInfo],
  );

  // Story keys work wherever focus is on the page, the body included, but never while typing.
  const storyKeys = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (!journey || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest?.("input, textarea, select, [contenteditable]")) return;
      // design.md 7.2: J and Page Down go on, K and Page Up go back. 7.1: S and E switch mode.
      if (story && (e.key === "j" || e.key === "J" || e.key === "PageDown")) goTo(stepStop(stop, 1, journey.stops.length));
      else if (story && (e.key === "k" || e.key === "K" || e.key === "PageUp")) goTo(stepStop(stop, -1, journey.stops.length));
      else if (story && (e.key === "e" || e.key === "E")) toExplore();
      else if (!story && (e.key === "s" || e.key === "S")) toStory();
      else return;
      e.preventDefault();
    },
    [journey, story, stop, goTo, toExplore, toStory],
  );

  useEffect(() => {
    if (!journey) return;
    window.addEventListener("keydown", storyKeys);
    return () => window.removeEventListener("keydown", storyKeys);
  }, [journey, storyKeys]);

  const pauseStory = useCallback(() => {
    if (story) setPaused(true);
  }, [story]);

  const zoomBy = useCallback(
    (factor: number) => {
      const vp = viewerRef.current?.viewport;
      if (!vp) return;
      pauseStory();
      vp.zoomBy(factor);
      vp.applyConstraints();
    },
    [pauseStory],
  );

  const reset = useCallback(() => {
    pauseStory();
    viewerRef.current?.viewport.goHome();
  }, [pauseStory]);

  const retryTiles = useCallback(() => {
    const viewer = viewerRef.current;
    const item = viewer?.world.getItemAt(0);
    if (!viewer || !item) return;
    failuresRef.current = 0;
    setToast(null);
    item.reset();
    viewer.forceRedraw();
  }, []);

  const retryOpen = useCallback(() => {
    setFailed(false);
    setToast(null);
    setAttempt((n) => n + 1);
  }, []);

  // The column's mission line: validated manifest fields only (design.md 5.3).
  const mission = info.fields
    .filter((f) => !f.draft && (f.label === "Observatory" || f.label === "Released"))
    .flatMap((f) => f.values);

  return (
    <main
      ref={rootRef}
      className={styles.root}
      data-shape={shape}
      data-info={infoOpen || undefined}
      data-sheet={sheet}
      data-mode={mode}
      data-journey={journey ? "" : undefined}
      data-paused={(story && paused) || undefined}
      onKeyDown={onKeyDown}
    >
      <div ref={canvasRef} className={styles.canvas} data-theme="dark" data-testid="viewer" />

      {/* Placed every frame by paint(); they never take a gesture from the image. */}
      {story && journey && (
        <div className={styles.marks} data-theme="dark" aria-hidden data-testid="marks">
          {journey.stops.map((s, i) =>
            stopTarget(s) ? (
              <div
                key={s.id}
                ref={(el) => {
                  marksRef.current[i] = el;
                }}
                className={styles.marker}
                data-current={i === stop || undefined}
              >
                {i === stop && <span className={styles.ticks} />}
                <span className={styles.tag}>{i === stop ? `Stop ${stopNumber(i)}` : stopNumber(i)}</span>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div className={`${styles.rulers} ${styles.dim}`} aria-hidden>
        <canvas ref={rulerTopRef} className={styles.rulerTop} />
        <canvas ref={rulerLeftRef} className={styles.rulerLeft} />
      </div>

      <header className={styles.topbar}>
        <div className={`${styles.bar} ${styles.glass} ${styles.fade}`}>
          <Link href="/" className={styles.iconButton} aria-label="Back to home">
            <LuArrowLeft aria-hidden />
          </Link>
          <Link href="/" className={styles.wordmark}>
            <span aria-hidden className={styles.mark} />
            Solaria
          </Link>
          <span className={styles.divider} aria-hidden />
          <h1 className={styles.title}>
            <span className={styles.longTitle}>{image.title}</span>
            <span className={styles.shortTitle} aria-hidden>
              {shortTitle(image.title)}
            </span>
          </h1>
          {!journey && <span className={styles.mode}>Explore</span>}
        </div>
        {/* Desktop: the pill takes the place of the title bar, which Story leaves to the column. */}
        {story && journey && paused && (
          <button type="button" className={`${styles.pill} ${styles.pillTop} ${styles.glass}`} onClick={resume}>
            {stopOf(stop, journey.stops.length)}, back to the story
            <LuArrowRight aria-hidden />
          </button>
        )}
        <div className={`${styles.bar} ${styles.glass} ${styles.fade}`}>
          {journey && (
            <div className={styles.modes} role="group" aria-label="Mode">
              <button type="button" aria-pressed={story} onClick={story ? undefined : toStory}>
                Story
              </button>
              <button type="button" aria-pressed={!story} onClick={story ? toExplore : undefined}>
                Explore
              </button>
            </div>
          )}
          <button
            ref={aboutRef}
            type="button"
            className={styles.about}
            onClick={infoOpen ? closeInfo : openInfo}
            aria-expanded={infoOpen}
            aria-controls={infoId}
          >
            <LuInfo aria-hidden />
            About this image
          </button>
          <button type="button" className={styles.iconButton} onClick={share} aria-label="Share this view">
            <LuShare aria-hidden />
          </button>
          <ThemeSwitcher />
        </div>
      </header>

      {/* Credit and notes stack under the top bar, clear of the overview in every shape. */}
      <div className={styles.topLeft}>
        {/* The credit never fades: the license asks that every user can see it. */}
        <p className={`${styles.credit} ${styles.glass}`}>{info.credit}</p>
        <div className={styles.toasts} role="status">
          {toast && (
            <div className={`${styles.toast} ${styles.glass}`}>
              <p>{toast.text}</p>
              {toast.retry && (
                <button type="button" className={styles.textButton} onClick={retryTiles}>
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div ref={sheetRef} className={styles.sheet} data-testid="sheet">
        <div
          className={styles.grip}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
        >
          {story && journey ? (
            <button
              ref={handleRef}
              type="button"
              className={styles.handle}
              onClick={tapHandle}
              aria-expanded={sheet !== "min"}
              aria-controls={storyId}
            >
              <span className={styles.gripBar} aria-hidden />
              {journey.title}
            </button>
          ) : (
            <button
              ref={handleRef}
              type="button"
              className={styles.handle}
              onClick={tapHandle}
              aria-expanded={infoOpen}
              aria-controls={infoId}
            >
              <span className={styles.gripBar} aria-hidden />
              {sheet === "min" ? "Show overview" : "About this image"}
            </button>
          )}
          {sheet === "peek" && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setSheet("min")}
              aria-label="Minimize the panel"
            >
              <LuChevronDown aria-hidden />
            </button>
          )}
          {sheet === "full" && (
            <button type="button" className={styles.iconButton} onClick={closeInfo} aria-label="Close details">
              <LuX aria-hidden />
            </button>
          )}
        </div>

        <div className={`${styles.controls} ${styles.glass} ${styles.dim}`} role="group" aria-label="View controls">
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

        <div className={`${styles.overview} ${styles.glass} ${styles.fade}`}>
          <p className={styles.overviewHead}>
            <span>Overview</span>
            <span className={styles.size}>
              {formatInt(size.width)} × {formatInt(size.height)} px
            </span>
          </p>
          {/* The image well is canvas, so it keeps the dark values (and the amber view box). */}
          <div className={styles.well} data-theme="dark">
            <div ref={navRef} className={styles.nav} style={overviewStyle} data-testid="overview-image" />
            {story && journey && <RouteOverlay stops={journey.stops} image={size} current={stop} onGo={goTo} />}
          </div>
          <p className={styles.readout} data-testid="readout">
          <span className={styles.key}>Center x</span>
          <span ref={xRef} className={styles.value}>{formatInt(home.x)}</span>
          <span className={styles.key}>y</span>
          <span ref={yRef} className={styles.value}>{formatInt(home.y)}</span>
          <span className={styles.key}>Zoom</span>
          <span ref={zRef} className={styles.zoom}>{formatZoom(home.z)}</span>
          </p>
        </div>
        {story && journey && (
          <div id={storyId} className={styles.story}>
            <StoryPanel journey={journey} index={stop} seen={seen} mission={mission} onGo={goTo} onExplore={toExplore} collapsed={sheet === "min"} />
          </div>
        )}
        {story && journey && paused && (
          <button type="button" className={`${styles.pill} ${styles.pillSheet} ${styles.glass}`} onClick={resume}>
            {stopOf(stop, journey.stops.length)}, back to the story
            <LuArrowRight aria-hidden />
          </button>
        )}

        {/* Phones: the full validated credit stays in the sheet; a tap opens About. */}
        {!infoOpen && (
          <button type="button" className={styles.sheetCredit} onClick={openFromCredit}>
            {info.credit}
          </button>
        )}

        <div className={`${styles.info} ${styles.glass}`} hidden={!infoOpen}>
          <InfoPanel id={infoId} info={info} onClose={closeInfo} titleRef={infoTitleRef} />
        </div>
      </div>

      <div className={styles.progress} aria-hidden />

      <p ref={liveRef} className={styles.visuallyHidden} aria-live="polite" />

      {failed && (
        <div className={styles.failed} role="alert">
          <p>This image could not load. Check your connection and try again.</p>
          <button type="button" className={styles.primary} onClick={retryOpen}>
            Retry
          </button>
        </div>
      )}
    </main>
  );
};

export default Explore;
