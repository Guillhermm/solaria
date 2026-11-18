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
