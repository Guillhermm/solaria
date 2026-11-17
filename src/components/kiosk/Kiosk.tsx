"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { attractOn, COUNTDOWN_S, countdownText, DWELL_MS, IDLE_MS, RESET_TEXT, setAttract, storySearch1 } from "@/kiosk/kiosk";
import { useAttract, useKiosk } from "@/kiosk/useKiosk";
import styles from "./Kiosk.module.css";

// What the chip and the countdown sit above (K7, K13): the highest top edge among the bottom
// overlays in the lower half of the screen that share columns with them, and the footer once
// it scrolls into view. An overlay off to a side leaves them at the foot of the screen.
const BOTTOMS = [
  "[data-testid=sheet]",
  "[data-testid=light-bar]",
  "[role=group][aria-label='View controls']",
  "[data-testid=overview]",
  "[data-testid=readout]",
];

const bottomLine = (dock: DOMRect) => {
  const tops = BOTTOMS.flatMap((q) => [...document.querySelectorAll(q)])
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0 && r.y + r.height > innerHeight / 2 && r.left < dock.right && dock.left < r.right)
    .map((r) => r.y);
  const footer = document.querySelector("body > footer, footer")?.getBoundingClientRect();
  if (footer && footer.top < innerHeight) tops.push(footer.top);
  return Math.min(innerHeight, ...tops);
};

const INPUTS = ["pointerdown", "touchstart", "wheel", "keydown"] as const;
const ACTIVITY = [...INPUTS, "pointermove"] as const;
const MEASURE_MS = 250;

// Kiosk mode's own parts, on every route (design.md 14.3): the attract loop's chip and its
// first-touch rule, the idle countdown and the reset, and the long-press guard.
const Kiosk = ({ journeys }: { journeys: string[] }) => {
  const kiosk = useKiosk();
  const attract = useAttract();
  const router = useRouter();
  const pathname = usePathname();
  const [left, setLeft] = useState<number | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const idleTimer = useRef(0);

  const announce = useCallback((text: string) => {
    if (liveRef.current) liveRef.current.textContent = text;
  }, []);

  const armIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (attractOn()) return;
      setLeft(COUNTDOWN_S);
      announce(countdownText(COUNTDOWN_S));
    }, IDLE_MS);
  }, [announce]);

  // K8: in the attract loop the first input only stops it; the click it would make is dropped.
  // Otherwise any input restarts the idle timer and closes the countdown.
  useEffect(() => {
    if (!kiosk) return;
    let swallowClick = false;
    const onInput = (e: Event) => {
      if (e.type === "pointerdown") swallowClick = false;
      // A passing pointer is not a touch: it keeps the visitor here, but never ends the loop.
      if (attractOn() && e.type !== "pointermove") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === "pointerdown" || e.type === "touchstart") swallowClick = true;
        setAttract(false);
        armIdle();
        return;
      }
      if (attractOn()) return;
      // A press on the countdown itself is left to its button: closing on pointerdown would drop
      // the sheet before the click, and the tap would land on whatever lies beneath.
      if ((e.type === "pointerdown" || e.type === "touchstart") && overlayRef.current?.contains(e.target as Node)) {
        armIdle();
        return;
      }
      setLeft(null);
      armIdle();
    };
    const onClick = (e: Event) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    // K11: a long press opens no menu.
    const onMenu = (e: Event) => e.preventDefault();
    for (const name of ACTIVITY) window.addEventListener(name, onInput, { capture: true, passive: false });
    window.addEventListener("click", onClick, { capture: true });
    window.addEventListener("contextmenu", onMenu, { capture: true });
    armIdle();
    return () => {
      clearTimeout(idleTimer.current);
      for (const name of ACTIVITY) window.removeEventListener(name, onInput, { capture: true });
      window.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("contextmenu", onMenu, { capture: true });
    };
  }, [kiosk, armIdle]);

  // K12 to K14: the countdown runs once a second; at zero everything starts over at Home, which
  // closes every sheet, popover and mode with the page that held them.
  useEffect(() => {
    if (left === null) return;
    const timer = window.setTimeout(() => {
      if (left > 1) {
        setLeft(left - 1);
        return;
      }
      announce(RESET_TEXT);
      setLeft(null);
      setAttract(true);
      router.push("/?kiosk=1");
    }, 1000);
    return () => clearTimeout(timer);
  }, [left, announce, router]);

  const open = left !== null;
  useEffect(() => {
    if (open) keepRef.current?.focus();
    // On a phone the zoom buttons step aside for the sheet (Explore.module.css).
    document.documentElement.toggleAttribute("data-kiosk-countdown", open);
  }, [open]);

  // Home in the attract loop dwells, then plays the first Journey (K5).
  useEffect(() => {
    if (!attract || pathname !== "/" || journeys.length === 0) return;
    const timer = window.setTimeout(() => router.push(storySearch1(journeys[0])), DWELL_MS);
    return () => clearTimeout(timer);
  }, [attract, pathname, journeys, router]);

  // The chip and the countdown follow the overlays they sit above, measured, never assumed.
  const shown = attract || open;
  useEffect(() => {
    if (!shown) return;
    const place = () => {
      const el = overlayRef.current;
      if (el) el.style.setProperty("--kiosk-bottom", `${innerHeight - bottomLine(el.getBoundingClientRect())}px`);
    };
    place();
    const timer = window.setInterval(place, MEASURE_MS);
    window.addEventListener("resize", place);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", place);
    };
  }, [shown, pathname]);

  const keep = useCallback(() => {
    setLeft(null);
    armIdle();
  }, [armIdle]);

  if (!kiosk) return null;
  return (
    <>
      <p ref={liveRef} className={styles.visuallyHidden} aria-live="polite" data-testid="kiosk-live" />
      {shown && (
        <div ref={overlayRef} className={styles.dock}>
          {attract && (
            <p className={styles.chip} data-testid="kiosk-chip">
              Touch to explore
            </p>
          )}
          {open && !attract && (
            <div className={styles.countdown} role="dialog" aria-labelledby="kiosk-countdown-text" data-testid="kiosk-countdown">
              <p id="kiosk-countdown-text">{countdownText(left)}</p>
              <button ref={keepRef} type="button" className={styles.keep} onClick={keep}>
                Keep exploring
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Kiosk;
