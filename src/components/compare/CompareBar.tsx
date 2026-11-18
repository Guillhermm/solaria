"use client";

import { useEffect, useRef } from "react";
import { LuPause, LuPlay, LuRepeat } from "react-icons/lu";
import type { Layout } from "@/viewer/url";
import styles from "./Compare.module.css";

interface CompareBarProps {
  layout: Layout;
  layouts: Layout[]; // the ones that fit this screen
  onLayout: (layout: Layout) => void;
  headline: string;
  draft: boolean;
  credits: { label: string; credit: string }[]; // both images, left first
  chips: [string, string]; // phone: "Left: 1995"
  blink: { playing: boolean | null; showing: string; onToggle: () => void; onSwap: () => void } | null;
  children?: React.ReactNode; // the "What differs?" control
}

const NAMES: Record<Layout, string> = { wipe: "Wipe", side: "Side by side", blink: "Blink" };

// design.md 5.6: the layouts, the pair's validated headline and both credits. The credits
// never fade (the licenses ask that every user can see them).
const CompareBar = ({ layout, layouts, onLayout, headline, draft, credits, chips, blink, children }: CompareBarProps) => {
  const ref = useRef<HTMLElement>(null);

  // The note opens next to the bar, never over it: the bar's edges are measured whenever it
  // changes size (Blink adds a row) or the window does, and handed to the note as CSS
  // variables. The note is a descendant of the bar, so it inherits them in the top layer.
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const measure = () => {
      const box = bar.getBoundingClientRect();
      bar.style.setProperty("--bar-above", `${window.innerHeight - box.top}px`);
      bar.style.setProperty("--bar-below", `${box.bottom}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section ref={ref} className={`${styles.bar} ${styles.glass}`} aria-label="Compare" data-testid="compare-bar">
      <div className={styles.row}>
        {layouts.length > 1 && (
          <div className={styles.layouts} role="group" aria-label="Layout">
            {layouts.map((l) => (
              <button key={l} type="button" aria-pressed={l === layout} onClick={() => onLayout(l)}>
                {NAMES[l]}
              </button>
            ))}
          </div>
        )}
        <p className={styles.headline}>
          {headline}
          {draft && <span className={styles.draft}>Draft</span>}
        </p>
        {children}
      </div>
      <p className={styles.chips} aria-hidden>
        <span>Left: {chips[0]}</span>
        <span>Right: {chips[1]}</span>
      </p>
      {blink && (
        <div className={styles.row}>
          <p className={styles.showing} aria-live="off">
            Showing {blink.showing}
          </p>
          {blink.playing !== null && (
            <button type="button" className={styles.textButton} onClick={blink.onToggle}>
              {blink.playing ? <LuPause aria-hidden /> : <LuPlay aria-hidden />}
              {blink.playing ? "Pause blink" : "Play blink"}
            </button>
          )}
          <button type="button" className={styles.textButton} onClick={blink.onSwap}>
            <LuRepeat aria-hidden />
            Swap
          </button>
        </div>
      )}
      <ul className={styles.credits} aria-label="Credits">
        {credits.map((c) => (
          <li key={c.label}>
            <span className={styles.creditLabel}>{c.label}</span> {c.credit}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CompareBar;
