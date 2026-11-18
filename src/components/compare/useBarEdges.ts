"use client";

import { type RefObject, useEffect } from "react";

// A note opens next to its bar, never over it: the bar's edges are measured whenever it
// changes size (Blink adds a row) or the window does, and handed to the note as CSS
// variables. The note is a descendant of the bar, so it inherits them in the top layer.
export const useBarEdges = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const measure = () => {
      const box = bar.getBoundingClientRect();
      bar.style.setProperty("--bar-above", `${window.innerHeight - box.top}px`);
      bar.style.setProperty("--bar-below", `${box.bottom}px`);
      bar.style.setProperty("--bar-center", `${box.left + box.width / 2}px`);
      bar.style.setProperty("--bar-width", `${box.width}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
};
