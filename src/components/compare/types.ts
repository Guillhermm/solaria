import type { ComparePair, ImageManifest } from "@/content/types";
import type { Info } from "@/viewer/info";

// One pair as the reference image's page receives it: the moving image and its credit come
// along, so the client needs nothing else.
export interface CompareView {
  pair: ComparePair;
  moving: ImageManifest;
  movingInfo: Info;
}
