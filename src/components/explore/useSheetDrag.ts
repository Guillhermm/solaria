import { type PointerEvent, useRef } from "react";
import { dragDirection } from "@/viewer/sheet";

// Vertical drag on the sheet's grip. The sheet follows the finger downward only (a bottom
// sheet moved up would open a gap under it); on release a long enough drag becomes a step.
export const useSheetDrag = (sheet: () => HTMLElement | null, onStep: (direction: "up" | "down") => void) => {
  const start = useRef<number | null>(null);
  const dragged = useRef(false);

  const move = (e: PointerEvent) => {
    if (start.current === null) return;
    const dy = e.clientY - start.current;
    if (Math.abs(dy) > 6) dragged.current = true;
    const el = sheet();
    if (el) el.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };

  const end = (e: PointerEvent) => {
    if (start.current === null) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const direction = dragDirection(e.clientY - start.current, 2.5 * rem);
    start.current = null;
    const el = sheet();
    if (el) {
      el.style.transform = "";
      el.style.transition = "";
    }
    if (direction) onStep(direction);
  };

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      start.current = e.clientY;
      dragged.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
      // Follow the finger without the sheet's easing.
      const el = sheet();
      if (el) el.style.transition = "none";
    },
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    // A click that ends a drag is not a tap.
    wasDrag: () => {
      const was = dragged.current;
      dragged.current = false;
      return was;
    },
  };
};
