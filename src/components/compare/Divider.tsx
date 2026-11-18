"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { LuChevronsLeftRight } from "react-icons/lu";
import { dividerKey, handleCenter, splitFromPointer } from "@/viewer/divider";
import styles from "./Compare.module.css";

interface DividerProps {
  split: number;
  onChange?: (split: number) => void; // absent: a fixed line between two viewers, no handle
  labels: [string, string]; // left, right; from the pair manifest
  valueText?: string;
  draft: boolean;
  hint?: string; // the pair's alignment line, shown beside the handle on hover and focus
  avoid?: string; // overlays the handle keeps 1rem from, as a selector list (design.md 15.5, D17)
}

// design.md 7.3: the WAI-ARIA slider pattern on a vertical line across the image. Dragging the
// image pans it; only the handle and the strip along the bottom move the divider.
const Divider = ({ split, onChange, labels, valueText, draft, hint, avoid }: DividerProps) => {
  const hintId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [handleY, setHandleY] = useState<number | null>(null);

  // The handle moves along the divider to a stretch no overlay covers, measured whenever the
  // divider or the page around it changes size.
  useEffect(() => {
    const root = rootRef.current;
    const handle = handleRef.current;
    if (!root || !handle || !avoid) return;
    const place = () => {
      const box = root.getBoundingClientRect();
      const size = handle.offsetHeight;
      const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const x = box.left + (split / 100) * box.width;
      const blocked = [...document.querySelectorAll(avoid)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.left < x + size / 2 + gap && r.right > x - size / 2 - gap)
        .map((r) => ({ top: r.top - box.top, bottom: r.bottom - box.top }));
      setHandleY(handleCenter({ top: 0, bottom: box.height }, blocked, size, gap));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    for (const el of document.querySelectorAll(avoid)) observer.observe(el);
    return () => observer.disconnect();
  }, [split, avoid]);

  const fromPointer = useCallback(
    (e: PointerEvent) => {
      const box = rootRef.current?.getBoundingClientRect();
      if (box) onChange?.(splitFromPointer(e.clientX, box));
    },
    [onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    fromPointer(e);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging.current) fromPointer(e);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const next = dividerKey(e.key, e.shiftKey, split);
    if (next === null || !onChange) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(next);
  };

  const pointer = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return (
    <div ref={rootRef} className={styles.divider} style={{ "--split": `${split}%`, ...(handleY === null ? {} : { "--handle-y": `${handleY}px` }) } as CSSProperties} data-testid="divider">
      <div className={styles.line} aria-hidden />
      {/* Labels hide when their side is under 15 % wide (design.md 7.3). */}
      <p className={`${styles.label} ${styles.labelLeft}`} hidden={split < 15} aria-hidden>
        {labels[0]}
        {draft && <span className={styles.draft}>Draft</span>}
      </p>
      <p className={`${styles.label} ${styles.labelRight}`} hidden={split > 85} aria-hidden>
        {labels[1]}
        {draft && <span className={styles.draft}>Draft</span>}
      </p>
      {onChange && (
        <div
          ref={handleRef}
          className={styles.handle}
          role="slider"
          tabIndex={0}
          aria-label="Divider between the two images"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={split}
          aria-valuetext={valueText}
          aria-describedby={hint ? hintId : undefined}
          onKeyDown={onKeyDown}
          {...pointer}
        >
          <LuChevronsLeftRight aria-hidden />
        </div>
      )}
      {onChange && hint && (
        <p id={hintId} className={styles.hint} role="tooltip">
          {hint}
        </p>
      )}
      {onChange && <div className={styles.strip} aria-hidden {...pointer} />}
    </div>
  );
};

export default Divider;
