// design.md 7.3: Left and Right move 1 %, Shift 10 %, Home and End go to the ends.
export const dividerKey = (key: string, shift: boolean, split: number): number | null => {
  const step = shift ? 10 : 1;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  if (key === "ArrowLeft" || key === "ArrowDown") return clamp(split - step);
  if (key === "ArrowRight" || key === "ArrowUp") return clamp(split + step);
  if (key === "PageDown") return clamp(split - 10);
  if (key === "PageUp") return clamp(split + 10);
  if (key === "Home") return 0;
  if (key === "End") return 100;
  return null;
};

// Integer percent of the box's width at the pointer, clamped to the box.
export const splitFromPointer = (clientX: number, box: { left: number; width: number }) =>
  Math.round(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));

// The slider's spoken value: the split and what each side shows, from the pair's labels.
export const dividerValueText = (split: number, labels: [string, string]) =>
  `${split} %, ${labels[0]} on the left, ${labels[1]} on the right`;

// The viewer that took the last pointer or wheel input leads; the other copies its view.
// A follower's own viewport-change, caused by the copy, must not be copied back.
export const createSync = <T extends string>() => {
  let leader: T | null = null;
  let copying = false;
  return {
    lead: (who: T) => {
      leader = who;
    },
    // Runs `copy` only for a change in the leader, and never while a copy is under way.
    changed: (who: T, copy: () => void) => {
      if (copying || leader !== who) return false;
      copying = true;
      try {
        copy();
      } finally {
        copying = false;
      }
      return true;
    },
    leader: () => leader,
  };
};

export interface Span {
  top: number;
  bottom: number;
}

// The stretches of `range` clear of every blocked span by `gap`, tall enough for the handle.
const freeStretches = (range: Span, blocked: Span[], size: number, gap: number) => {
  const walls = blocked.map((b) => ({ top: b.top - gap, bottom: b.bottom + gap })).sort((a, b) => a.top - b.top);
  const free: Span[] = [];
  let from = range.top;
  for (const w of walls) {
    if (w.top > from) free.push({ top: from, bottom: Math.min(w.top, range.bottom) });
    from = Math.max(from, w.bottom);
  }
  if (from < range.bottom) free.push({ top: from, bottom: range.bottom });
  return free.filter((f) => f.bottom - f.top >= size);
};

// design.md 15.5, D17: the handle's center on the divider. It stays at the middle of `range`
// where a handle of `size` fits there with `gap` around it; otherwise it moves to the middle of
// the tallest free stretch between the overlays that cross the divider (`blocked`). Null when
// no stretch is tall enough.
export const handleCenter = (range: Span, blocked: Span[], size: number, gap: number): number | null => {
  const fits = freeStretches(range, blocked, size, gap);
  const middle = (range.top + range.bottom) / 2;
  if (fits.some((f) => middle - size / 2 >= f.top && middle + size / 2 <= f.bottom)) return middle;
  if (!fits.length) return null;
  const tallest = fits.reduce((a, b) => (b.bottom - b.top > a.bottom - a.top ? b : a));
  return (tallest.top + tallest.bottom) / 2;
};

// design.md 5.6, C5-1: at a Journey stop the handle keeps off the current stop's marker. It
// takes the middle of the nearest free stretch below the marker where the handle fits with
// `gap` around it, else the nearest one above, else it sits `gap / 2` above `floor` (the top of
// the stop card on a phone, of the compare bar on desktop).
export const stopHandleCenter = (range: Span, blocked: Span[], mark: Span, size: number, gap: number, floor: number): number => {
  const fits = freeStretches(range, [...blocked, mark], size, gap);
  const below = fits.find((f) => f.top >= mark.bottom);
  const above = fits.filter((f) => f.bottom <= mark.top).at(-1);
  const pick = below ?? above;
  return pick ? (pick.top + pick.bottom) / 2 : floor - gap / 2 - size / 2;
};
