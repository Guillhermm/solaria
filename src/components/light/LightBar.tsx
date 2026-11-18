"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef } from "react";
import { useBarEdges } from "@/components/compare/useBarEdges";
import compare from "@/components/compare/Compare.module.css";
import { nearestStop, positionFromPointer, railKey } from "@/viewer/light";
import styles from "./Light.module.css";

export interface RailStop {
  label: string; // "171 Å", as the manifest states it
  region?: string; // "extreme ultraviolet", when the manifest states it
  valueText: string; // "171 angstroms, extreme ultraviolet"
}

interface LightBarProps {
  stops: RailStop[]; // rail order
  position: number; // 0 to stops.length - 1; whole numbers at a stop
  onPosition: (position: number) => void;
  showing: string; // the nearest band's image title
  shows?: string; // the nearest band's validated note, when it has one
  draft: boolean;
  credits: string[]; // of the bands on screen, one per distinct line
  compact?: boolean; // Story: on a phone only the rail shows, since the stop card says the rest
  children?: React.ReactNode; // the "What differs?" control
}

const SETTLE_MS = 160;
const REDUCED = "(prefers-reduced-motion: reduce)";

// design.md 5.7 and 7.4: a neutral rail with a tick and a text label per band, ordered by
// wavelength, as a WAI-ARIA slider. A pointer drags through the crossfade between two
// neighbors and settles on the nearer stop when let go; the keyboard goes stop to stop.
const LightBar = ({ stops, position, onPosition, showing, shows, draft, credits, compact, children }: LightBarProps) => {
  const ref = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const settle = useRef(0);
  const count = stops.length;
  const band = nearestStop(position, count);
  useBarEdges(ref);

  useEffect(() => () => cancelAnimationFrame(settle.current), []);

  const fromPointer = (e: PointerEvent) => {
    const box = railRef.current?.getBoundingClientRect();
    if (box) onPosition(positionFromPointer(e.clientX, box, count));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    cancelAnimationFrame(settle.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    // The slider takes focus, so the keyboard carries on from where the pointer left it.
    e.currentTarget.querySelector<HTMLElement>("[role='slider']")?.focus({ preventScroll: true });
    fromPointer(e);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging.current) fromPointer(e);
  };
  // The crossfade finishes on its own, quickly, or at once under reduced motion.
  const onPointerUp = (e: PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const box = railRef.current?.getBoundingClientRect();
    const from = box ? positionFromPointer(e.clientX, box, count) : position;
    const to = nearestStop(from, count);
    if (window.matchMedia(REDUCED).matches || from === to) {
      onPosition(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SETTLE_MS);
      const eased = 1 - (1 - t) ** 3;
      onPosition(t === 1 ? to : from + (to - from) * eased);
      if (t < 1) settle.current = requestAnimationFrame(step);
    };
    settle.current = requestAnimationFrame(step);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const next = railKey(e.key, band, count);
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    cancelAnimationFrame(settle.current);
    onPosition(next);
  };

  const at = (p: number) => `${((p + 0.5) / count) * 100}%`;

  return (
    <section ref={ref} className={`${compare.bar} ${compare.glass} ${styles.bar}`} aria-label="Light" data-testid="light-bar" data-compact={compact || undefined}>
      <div
        ref={railRef}
        className={styles.rail}
        style={{ "--stops": count, "--edge-stop": at(0), "--thumb": at(position) } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="light-rail"
      >
        <div className={styles.track} aria-hidden>
          {stops.map((s, i) => (
            <span key={s.label} className={styles.tick} style={{ left: at(i) }} data-current={i === band || undefined} />
          ))}
        </div>
        <div
          className={styles.thumb}
          role="slider"
          tabIndex={0}
          aria-label="Band"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={band}
          aria-valuetext={stops[band].valueText}
          onKeyDown={onKeyDown}
        />
        <ol className={styles.stops} aria-hidden>
          {stops.map((s, i) => (
            <li key={s.label} data-current={i === band || undefined}>
              <span className={styles.wavelength}>{s.label}</span>
              {/* Only the current band names its region, so seven stops stay readable. */}
              {s.region && i === band && <span className={styles.region}>{s.region}</span>}
            </li>
          ))}
        </ol>
      </div>
      <div className={`${compare.row} ${styles.row} ${styles.detail}`}>
        <p className={compare.headline} data-testid="light-showing">
          {showing}
          {draft && <span className={compare.draft}>Draft</span>}
        </p>
        {children}
      </div>
      {shows && (
        <p className={`${styles.shows} ${styles.detail}`} data-testid="light-shows">
          <span className={compare.creditLabel}>Shows</span> {shows}
        </p>
      )}
      <ul className={compare.credits} aria-label="Credits">
        {credits.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </section>
  );
};

export default LightBar;
