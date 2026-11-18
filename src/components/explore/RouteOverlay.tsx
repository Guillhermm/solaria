import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/content/types";
import { useKiosk } from "@/kiosk/useKiosk";
import { type Box, bracketPath, chipText, type Mark, mergeMarks, polyline, routeMarks, splitRoute, tagPlacement } from "@/viewer/route";
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
const MERGE_REM = 1.5;
const COMPACT_REM = 7.5;
// A two-digit tag is TAG.width wide; a merged chip grows by about that much per stop.
const tagSize = (text: string, rem: number) => ({ width: TAG.width * rem * Math.max(1, (text.length + 1) / 3), height: TAG.height * rem });

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
  // markers nearer than MERGE_REM, or whose chips would overlap, share the first one's chip
  // ("03·04"). A chip never covers a bracket or another chip (design.md 15.5, D18): it takes the
  // first side of its marker where it fits (right, left, above, below) and is left out where
  // none does. An overview narrower than COMPACT_REM shows only the current stop's chip; the
  // card says which stop it is. Every stop keeps its button and its label for screen readers.
  const shownTags = new Map<number, { text: string; at: { x: number; y: number } }>();
  if (drawn) {
    const others = marks.filter((m) => m.index !== current);
    const chip = (m: Mark, text: string) => {
      const tag = tagSize(text, drawn.rem);
      return { ...tagPlacement(m, drawn, (MARK_REM * drawn.rem) / 2, tag, 0.1875 * drawn.rem), ...tag };
    };
    const leaders = new Map(mergeMarks(others, MERGE_REM * drawn.rem, chip, stopNumber).map((g) => [g[0], g] as const));
    const compact = drawn.width < COMPACT_REM * drawn.rem;
    const tagged = [...marks.filter((m) => m.index === current), ...(compact ? [] : others.filter((m) => leaders.has(m.index)))];
    const halfOf = (m: Mark) => ((m.index === current ? CURRENT_REM : MARK_REM) * drawn.rem) / 2;
    // The bracket's drawn box: its svg is 4 px wider than the bracket.
    const taken: Box[] = marks.map((m) => ({ x: m.x - halfOf(m) - 2, y: m.y - halfOf(m) - 2, width: 2 * halfOf(m) + 4, height: 2 * halfOf(m) + 4 }));
    for (const m of tagged) {
      const text = m.index === current ? stopNumber(m.index) : chipText(leaders.get(m.index)!, stopNumber);
      const tag = tagSize(text, drawn.rem);
      const half = halfOf(m) + 2;
      const gap = 0.1875 * drawn.rem;
      const sides = [
        { x: m.x + half + gap, y: m.y - tag.height / 2 },
        { x: m.x - half - gap - tag.width, y: m.y - tag.height / 2 },
        { x: m.x - tag.width / 2, y: m.y - half - gap - tag.height },
        { x: m.x - tag.width / 2, y: m.y + half + gap },
      ];
      const at = sides.find((p) => {
        const box = { ...p, ...tag };
        const inside = box.x >= 0 && box.y >= 0 && box.x + box.width <= drawn.width && box.y + box.height <= drawn.height;
        return inside && !taken.some((t) => box.x < t.x + t.width && t.x < box.x + box.width && box.y < t.y + t.height && t.y < box.y + box.height);
      });
      if (!at) continue;
      taken.push({ ...at, ...tag });
      shownTags.set(m.index, { text, at });
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
            const shown = shownTags.get(m.index);
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
                {shown && (
                  <span className={styles.tag} style={{ left: shown.at.x - m.x, top: shown.at.y - m.y }} aria-hidden>
                    {shown.text}
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
