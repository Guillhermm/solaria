import type { BandSet, ImageManifest } from "@/content/types";
import type { Info } from "@/viewer/info";

// One band set as its first image's page receives it: every band's image and credit in rail
// order, the page's own image first.
export interface LightView {
  set: BandSet;
  bands: { image: ImageManifest; info: Info }[];
}
