import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/content/types";
import { useKiosk } from "@/kiosk/useKiosk";
import { bracketPath, polyline, routeMarks, splitRoute, tagPlacement } from "@/viewer/route";
import { stopNumber } from "@/viewer/story";
import type { Size } from "@/viewer/view";
import styles from "./RouteOverlay.module.css";

interface RouteOverlayProps {
  stops: Stop[];
  image: Size;
  current: number;
  onGo: (index: number) => void;
}

// design.md 6.2, in rem so they follow the reader's font size.
const MARK_REM = 1.25;
const CURRENT_REM = 1.625;
const TAG = { width: 1.25, height: 0.875 };

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

// The route and numbered stops over the overview, drawn at its real pixel size so markers keep
// one screen size on any shape (design.md 6.4).
const RouteOverlay = ({ stops, image, current, onGo }: RouteOverlayProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const kiosk = useKiosk();
  const [drawn, setDrawn] = useState<(Size & { rem: number }) | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDrawn(width > 0 && height > 0 ? { width, height, rem: remPx() } : null);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const marks = drawn ? routeMarks(stops, image, drawn) : [];
  const { travelled, ahead } = splitRoute(marks, current);
  const settled = travelled.slice(0, -1);
  // Stops at one place (a Journey that changes band without moving) would stack their tags:
  // the current stop's tag goes first, and a tag that would overlap one already placed is left
  // out. Every stop keeps its button and its label for screen readers.
  const placed: { x: number; y: number; width: number; height: number }[] = [];
  const shownTags = new Set<number>();
  if (drawn) {
    for (const m of [...marks].sort((a, b) => (a.index === current ? -1 : b.index === current ? 1 : a.index - b.index))) {
      const side = (m.index === current ? CURRENT_REM : MARK_REM) * drawn.rem;
      const tag = { width: TAG.width * drawn.rem, height: TAG.height * drawn.rem };
      const at = tagPlacement(m, drawn, side / 2, tag, 0.1875 * drawn.rem);
      const box = { x: at.x, y: at.y, ...tag };
      if (placed.some((p) => box.x < p.x + p.width && p.x < box.x + box.width && box.y < p.y + p.height && p.y < box.y + box.height)) continue;
      placed.push(box);
      shownTags.add(m.index);
    }
  }
  const lastLeg = travelled.slice(-2);

  return (
    // K9: in a kiosk the route marks are too close for 3.5rem targets; the stop list and Next
    // do their job there.
    <div ref={ref} className={styles.overlay} data-testid="route" inert={kiosk || undefined}>
      {drawn && (
        <>
          <svg className={styles.lines} width={drawn.width} height={drawn.height} aria-hidden>
            {ahead.length > 1 && (
              <>
                <polyline className={styles.halo} points={polyline(ahead)} />
                <polyline className={styles.ahead} points={polyline(ahead)} />
              </>
            )}
            {travelled.length > 1 && (
              <>
                <polyline className={styles.haloWide} points={polyline(travelled)} />
                {settled.length > 1 && <polyline className={styles.travelled} points={polyline(settled)} />}
                {/* Only the leg just flown draws itself (--dur-route). */}
                <polyline key={current} className={`${styles.travelled} ${styles.draw}`} points={polyline(lastLeg)} pathLength={1} />
              </>
            )}
          </svg>
          {marks.map((m) => {
            const isCurrent = m.index === current;
            const side = (isCurrent ? CURRENT_REM : MARK_REM) * drawn.rem;
            const tag = { width: TAG.width * drawn.rem, height: TAG.height * drawn.rem };
            const at = tagPlacement(m, drawn, side / 2, tag, 0.1875 * drawn.rem);
            const stop = stops[m.index];
            return (
              <button
                key={stop.id}
                type="button"
                className={styles.mark}
                style={{ left: m.x, top: m.y }}
                data-current={isCurrent || undefined}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Go to stop ${m.index + 1}: ${stop.title}`}
                onClick={() => onGo(m.index)}
              >
                <svg className={styles.bracket} width={side + 4} height={side + 4} viewBox={`${-(side + 4) / 2} ${-(side + 4) / 2} ${side + 4} ${side + 4}`} aria-hidden>
                  <path className={styles.bracketHalo} d={bracketPath(side, 7)} />
                  <path d={bracketPath(side, 7)} />
                </svg>
                {shownTags.has(m.index) && (
                  <span className={styles.tag} style={{ left: at.x - m.x, top: at.y - m.y }} aria-hidden>
                    {stopNumber(m.index)}
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
};

export default RouteOverlay;
