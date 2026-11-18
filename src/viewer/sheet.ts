// The phone bottom sheet (design.md 5.4 and 7.1): "min" shows the handle and the readout,
// "peek" adds the overview and credit, "full" adds everything About this image says.
export type SheetState = "min" | "peek" | "full";

const ORDER: SheetState[] = ["min", "peek", "full"];

export const stepSheet = (state: SheetState, direction: "up" | "down"): SheetState => {
  const i = ORDER.indexOf(state) + (direction === "up" ? 1 : -1);
  return ORDER[Math.min(ORDER.length - 1, Math.max(0, i))];
};

// A drag counts once it travels past the threshold; anything shorter is a tap.
export const dragDirection = (dy: number, threshold: number): "up" | "down" | null => {
  if (dy <= -threshold) return "up";
  if (dy >= threshold) return "down";
  return null;
};
