import type { Size } from "./view";

export type Shape = "wide" | "tall" | "square";

// design.md 6.4: wide at r >= 2, tall at r <= 0.8, near square between.
export const shapeOf = ({ width, height }: Size): Shape => {
  const r = width / height;
  if (r >= 2) return "wide";
  if (r <= 0.8) return "tall";
  return "square";
};

// Height of the overview image in rem, before the viewport-height cap the stylesheet adds.
// Wide: 21.5rem across. Tall: 13rem across. Near square: contained in a 15rem square.
export const overviewHeightRem = (image: Size) => {
  const r = image.width / image.height;
  switch (shapeOf(image)) {
    case "wide":
      return 21.5 / r;
    case "tall":
      return 13 / r;
    default:
      return r >= 1 ? 15 / r : 15;
  }
};
