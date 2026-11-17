"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import type { FeatureLabel } from "@/content/types";
import { type Box, type ChipSize, markOf, placeLabels, placePopover, readingOrder } from "@/viewer/labels";
import styles from "./FeatureLabels.module.css";

// Where image pixels land on screen this frame, from Explore's paint().
export interface Projection {
  toScreen: (x: number, y: number) => { x: number; y: number };
  scale: number; // screen pixels per image pixel
}

export type LabelPainter = (p: Projection) => void;

interface FeatureLabelsProps {
  labels: FeatureLabel[];
  painterRef: RefObject<LabelPainter | null>;
  openId: string | null;
  popoverId: string;
  onToggle: (id: string) => void;
  onClose: () => void;
  onPan: (dy: number) => void; // screen pixels, positive moves the image up
}

// The overlays the labels keep clear of (design.md 14.1, S2 and S3, and the open panels).
const OBSTACLES = [
  "main > header > *",
  "[role=group][aria-label='View controls']",
  "[data-testid=overview]",
  "[data-testid=readout]",
  "[data-testid=light-bar]",
  "[data-testid=compare-bar]",
  "[data-testid=sheet-grip]",
  "[data-testid=credit]",
  "[data-testid=sheet-credit]",
  "[data-testid=toasts] > *",
  "[data-testid=info]:not([hidden])",
];
// What closes the free area from below (L10): an overlay across the width (the phone sheet)
// sets its foot; one at a side (controls, overview, readout, a bottom light bar) closes the
// corner below its top edge.
const BOTTOMS = ["[role=group][aria-label='View controls']", "[data-testid=overview]", "[data-testid=readout]", "[data-testid=sheet]", "[data-testid=light-bar]"];
const DESKTOP = "(min-width: 48rem)";

const boxOf = (el: Element): Box | null => {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height };
};

const boxes = (root: Element, selectors: string[]) =>
  selectors.flatMap((q) => [...root.querySelectorAll(q)].map(boxOf)).filter((b): b is Box => !!b);

// L10: the viewer minus the rulers and the top bar, and above the highest bottom overlay, each
// with --edge to spare.
export const freeArea = (root: HTMLElement, edge: number): { free: Box; blocked: Box[] } => {
  const half = root.clientHeight / 2;
  const width = root.clientWidth;
  const bottoms = boxes(root, BOTTOMS).filter((b) => b.y + b.height > half);
  const across = bottoms.filter((b) => b.width >= width * 0.9);
  const blocked = bottoms
    .filter((b) => b.width < width * 0.9)
    .map((b) => ({ x: b.x - edge, y: b.y - edge, width: b.width + 2 * edge, height: root.clientHeight - b.y + edge }));
  const rulerTop = root.querySelector("[data-ruler=top]");
  const rulerLeft = root.querySelector("[data-ruler=left]");
  const tops = boxes(root, ["main > header > *", "[data-testid=light-bar]"]).filter((b) => b.y < half);
  const ruler = rulerTop && boxOf(rulerTop);
  const left = rulerLeft && boxOf(rulerLeft);
  const top = Math.max(ruler ? ruler.y + ruler.height : 0, ...tops.map((b) => b.y + b.height)) + edge;
  const bottom = Math.min(root.clientHeight, ...across.map((b) => b.y)) - edge;
  const x = (left ? left.x + left.width : 0) + edge;
  return { free: { x, y: top, width: width - edge - x, height: Math.max(0, bottom - top) }, blocked };
};

const FeatureLabels = ({ labels, painterRef, openId, popoverId, onToggle, onClose, onPan }: FeatureLabelsProps) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState(() => labels.map((l) => l.id));
  const orderRef = useRef(order);
  // The phone dock pans the image once per opening, so the marker stays above it.
  const pannedFor = useRef<string | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const place = useCallback(
    (p: Projection) => {
      const layer = layerRef.current;
      const root = layer?.closest("main");
      if (!layer || !root) return;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const edge = parseFloat(getComputedStyle(root).getPropertyValue("--edge")) * rem;
      const { free, blocked } = freeArea(root, edge);
      const obstacles = boxes(root, OBSTACLES);
      const sizes = new Map<string, ChipSize>();
      const chipEls = new Map<string, HTMLElement>();
      for (const el of layer.querySelectorAll<HTMLElement>("[data-testid=label-chip]")) {
        const inner = el.firstElementChild as HTMLElement;
        sizes.set(el.dataset.id!, { width: inner.offsetWidth, height: inner.offsetHeight, target: el.offsetHeight });
        chipEls.set(el.dataset.id!, el);
      }
      const marks = labels.map((l) => {
        const s = p.toScreen(l.x, l.y);
        return markOf(l, s.x, s.y, p.scale);
      });
      const { marks: shown, chips } = placeLabels(marks, sizes, free, obstacles, rem, blocked);
      const drawn = new Set(shown.map((m) => m.id));
      const placed = new Map(chips.map((c) => [c.id, c]));

      // All reads are done; from here on the frame only writes.
      for (const m of marks) {
        const g = layer.querySelector<SVGGElement>(`g[data-id="${m.id}"]`);
        if (!g) continue;
        g.style.visibility = drawn.has(m.id) ? "visible" : "hidden";
        for (const c of g.querySelectorAll("circle")) {
          c.setAttribute("cx", m.cx.toFixed(1));
          c.setAttribute("cy", m.cy.toFixed(1));
          const isCircle = c.dataset.kind === "circle";
          if (isCircle && m.circle !== null) c.setAttribute("r", m.circle.toFixed(1));
          c.style.display = isCircle === (m.circle !== null) ? "" : "none";
        }
        const chip = placed.get(m.id);
        for (const line of g.querySelectorAll("line")) {
          line.style.display = chip ? "" : "none";
          if (chip) {
            const [x1, y1, x2, y2] = chip.leader;
            line.setAttribute("x1", x1.toFixed(1));
            line.setAttribute("y1", y1.toFixed(1));
            line.setAttribute("x2", x2.toFixed(1));
            line.setAttribute("y2", y2.toFixed(1));
          }
        }
      }
      for (const [id, el] of chipEls) {
        const c = placed.get(id);
        el.style.visibility = c ? "visible" : "hidden";
        if (c) el.style.translate = `${c.button.x.toFixed(1)}px ${c.button.y.toFixed(1)}px`;
      }

      const next = [...readingOrder(chips), ...labels.map((l) => l.id).filter((id) => !placed.has(id))];
      if (next.join() !== orderRef.current.join()) {
        orderRef.current = next;
        setOrder(next);
      }

      const pop = popRef.current;
      if (!pop || !openId) return;
      const size = { width: pop.offsetWidth, height: pop.offsetHeight };
      const own = placed.get(openId);
      const mark = shown.find((m) => m.id === openId);
      let box: Box | null = null;
      if (window.matchMedia(DESKTOP).matches) {
        const anchor = own?.button ?? (mark ? { x: mark.cx - 5, y: mark.cy - 5, width: 10, height: 10 } : null);
        if (anchor) box = placePopover(anchor, size, free, [...chips.map((c) => c.button), ...obstacles, ...blocked], shown, rem / 2);
      }
      if (!box) {
        // L19: docked above the sheet (or the free area's foot), edge to edge.
        const sheet = root.querySelector("[data-testid=sheet]");
        const sheetBox = sheet && boxOf(sheet);
        const foot = sheetBox && sheetBox.y > root.clientHeight / 2 ? sheetBox.y : free.y + free.height + edge;
        box = { x: edge, y: foot - rem / 2 - size.height, width: root.clientWidth - 2 * edge, height: size.height };
        const target = marks.find((m) => m.id === openId);
        if (target && pannedFor.current !== openId) {
          pannedFor.current = openId;
          const limit = box.y - rem;
          if (target.cy > limit) onPan(target.cy - limit);
        }
      }
      pop.style.translate = `${box.x.toFixed(1)}px ${box.y.toFixed(1)}px`;
      pop.style.width = `${box.width}px`;
      pop.style.visibility = "visible";
    },
    [labels, openId, onPan],
  );

  useEffect(() => {
    painterRef.current = place;
    return () => {
      painterRef.current = null;
    };
  }, [painterRef, place]);

  // A new description waits, unseen, for the frame that places it.
  useEffect(() => {
    if (!openId) pannedFor.current = null;
    if (popRef.current) popRef.current.style.visibility = "hidden";
  }, [openId]);

  const open = labels.find((l) => l.id === openId) ?? null;

  return (
    <>
      <div ref={layerRef} className={styles.layer} data-theme="dark" data-testid="labels">
        <svg className={styles.svg} aria-hidden>
          {labels.map((l) => (
            <g key={l.id} data-id={l.id} className={styles.mark}>
              <line className={styles.halo} />
              <line className={styles.leader} />
              <circle className={styles.halo} data-kind="ring" r={4.25} />
              <circle className={styles.ring} data-kind="ring" r={4.25} data-testid="label-marker" data-id={l.id} />
              <circle className={styles.halo} data-kind="circle" r={0} />
              <circle className={styles.circle} data-kind="circle" r={0} data-testid="label-circle" data-id={l.id} />
            </g>
          ))}
        </svg>
        {order.map((id) => {
          const l = labels.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              type="button"
              className={styles.chip}
              data-testid="label-chip"
              data-id={id}
              aria-expanded={openId === id}
              aria-controls={popoverId}
              onClick={() => onToggle(id)}
            >
              <span data-part="chip" className={styles.face}>
                {l.text}
              </span>
            </button>
          );
        })}
      </div>
      <div
        ref={popRef}
        id={popoverId}
        className={styles.popover}
        role="region"
        aria-labelledby={`${popoverId}-title`}
        data-testid="label-popover"
        hidden={!open}
      >
        {open && (
          <>
            <div className={styles.popHead}>
              <h2 id={`${popoverId}-title`} className={styles.popTitle}>
                {open.text}
              </h2>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                <LuX aria-hidden />
              </button>
            </div>
            <p className={styles.popBody}>{open.description}</p>
          </>
        )}
      </div>
    </>
  );
};

export default FeatureLabels;
