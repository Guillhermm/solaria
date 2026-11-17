export type IsoDate = string; // YYYY-MM-DD, UTC
export type IsoMonth = string; // YYYY-MM, UTC

// Review of a whole record (source, image, Journey, stop) by science review.
export type ReviewStatus = "draft" | "in-review" | "approved" | "rejected";

export interface Validation {
  status: ReviewStatus;
  date: IsoDate | null; // required when status is "approved"
  notes: string;
}

// One stated fact. A caption may state a field only if it carries a source and status
// (docs/science/compare-and-light.md, section 3).
export type ClaimStatus = "verified" | "supported" | "unverified";

export interface Claim<T> {
  value: T;
  source: string; // https URL, or a repo path with anchor such as docs/science/sources.md#1
  status: ClaimStatus;
}

export interface Source {
  id: string;
  title: string;
  pageUrl: string; // the page the credit was copied from
  fileUrl: string; // direct download of the original
  releaseId: string | null; // e.g. "heic2501a"
  // null when the source states no release (archive frames, for instance); never an
  // observation date standing in for one.
  releasedAt: IsoDate | null;
  credit: string; // unaltered from pageUrl
  terms: { name: string; url: string };
  retrievedAt: IsoDate;
  file: {
    format: "tif" | "png" | "jpg" | "jp2";
    bytes: number;
    sha256: string; // 64 lowercase hex
    width: number;
    height: number;
  };
  validation: Validation;
  mock: boolean;
}

export interface Band {
  id: string; // filter or channel, e.g. "F475W", "AIA 171"
  // Absent until a source states it; the filter name alone is not a source for a number.
  wavelength?: { value: number; unit: "Å" | "nm" | "µm" };
  kind?: "line" | "continuum" | "broadband";
  // Part of the spectrum in words, e.g. "extreme ultraviolet"; read with the wavelength on the
  // Light rail. Absent until science review states it.
  region?: string;
  // What the band mostly shows, one validated sentence or two, under the Light rail. Sprint 8.
  shows?: string;
}

// Never empty: an absent mapping would read as natural color.
export type ColorMapping =
  | { kind: "per-band"; entries: { bandId: string; color: string }[] } // non-empty
  | { kind: "grayscale" }
  | { kind: "standard-colortable"; name: string };

export type ProductType = "single exposure" | "stack" | "mosaic" | "multi-instrument composite";

// Written by scripts/generate-tiles.ts only. Never typed by hand.
export interface TilePyramid {
  format: "jpg";
  tileSize: number; // 256
  overlap: 0;
  width: number; // full-resolution pixels
  height: number;
  minLevel: 0;
  maxLevel: number; // level maxLevel is full resolution
  thumbnail: { width: number; height: number }; // <id>/thumbnail.jpg, long side 512
  preview: { width: number; height: number }; // <id>/preview.jpg, long side 2048
}

export interface ImageManifest {
  id: string; // file name and tile directory name
  sourceId: string; // data/sources/<sourceId>.json; credit, terms and URL come from there
  title: string;
  target: Claim<{ name: string; type: string }>;
  observatory: Claim<string>;
  instruments: Claim<string[]>; // mosaics may combine cameras
  bands: Claim<Band[]>;
  colorMapping: Claim<ColorMapping>;
  releasedAt?: Claim<IsoDate>; // absent when no source gives a release date
  productType: Claim<ProductType>;
  // Optional: absent means the app says nothing about it.
  // Both ends days, or both months when the source gives no day.
  observedAt?: Claim<{ start: IsoDate; end: IsoDate } | { start: IsoMonth; end: IsoMonth }>;
  processing?: Claim<string>;
  pixelScale?: Claim<{ value: number; unit: "arcsec/px" | "m/px" }>;
  fieldOfView?: Claim<string>;
  orientation?: Claim<string>;
  caveats?: string[]; // what users must see beside the image, from the science review
  // Polygons, in full-resolution pixels, around the part of the file that holds data. Absent:
  // the whole image. The viewer crops to it, so a mosaic's empty corner never covers another image.
  footprint?: { x: number; y: number }[][];
  // The box of the source file that was tiled, in source pixels (origin top-left, size in pixels).
  // Absent: the whole file. Adding (x, y) to a point of this image gives its pixel in the product.
  crop?: { x: number; y: number; width: number; height: number };
  tiles: TilePyramid;
  validation: Validation;
  mock: boolean;
}

// Image pixels from the top-left of the full-resolution file, as in design.md 6.3 and 6.4.
// z is zoom relative to the scale at which the whole image fits the viewer (6.3).
export interface Viewport {
  x: number;
  y: number;
  z: number;
}

export interface Stop {
  id: string;
  title: string;
  body: string; // plain text; blank lines separate paragraphs; rendered as text nodes
  viewport: Viewport;
  marker?: { x: number; y: number; r: number }; // image pixels
  band?: string; // an image id of the Journey's band set: the band shown at this stop; absent keeps the current one
  sources: { label: string; url: string }[]; // at least one
  validation: Validation;
}

export interface Journey {
  slug: string; // file name and URL segment
  imageId: string;
  bandSetId?: string; // a band set whose first image is imageId; its stops may pick a band
  title: string;
  summary: string;
  stops: Stop[];
  validation: Validation;
  mock: boolean;
}

// What differs between the images of a pair or band set (compare-and-light.md, section 3, item 13).
export type Difference = "instrument" | "band" | "date" | "illumination" | "geometry" | "processing";

export interface ControlPoint {
  label: string; // e.g. "star A", to find it again
  moving: { x: number; y: number }; // full-resolution pixels of the moving image
  reference: { x: number; y: number }; // full-resolution pixels of the reference image
}

// q = scale * R(rotationDeg) * p + (tx, ty); p in moving pixels, q in reference pixels.
// R is [[cos, -sin], [sin, cos]] with y down, the same sign as OpenSeadragon's degrees.
export interface Similarity {
  scale: number;
  rotationDeg: number;
  tx: number;
  ty: number;
}

export type Registration =
  // No transform: the images share one pixel grid. residualPx is what a check of that measured
  // (0 for synthetic grids), in pixels, with how it was measured in notes.
  | { method: string; transform: "none"; residualPx: number; notes?: string }
  | {
      method: string; // e.g. "similarity, least squares on star control points"
      transform: "similarity";
      controlPoints: ControlPoint[]; // at least 6
      similarity: Similarity; // written by scripts/register-pair.ts
      residualPx: number; // RMS, reference pixels, written by the script
      maxResidualPx: number; // worst point, reference pixels, written by the script
      notes?: string; // what the fit leaves out, from the science review (e.g. per-chip offsets)
    };

interface ImageGroup {
  id: string; // file name
  title: string;
  differs: Record<Difference, boolean>;
  registration: Registration;
  whatDiffers: string; // the "What differs?" note, shown beside the images once validated
  validation: Validation;
  mock: boolean;
}

// Compare: two registered images of one target. `imageIds` is [before, after].
export interface ComparePair extends ImageGroup {
  imageIds: [string, string];
  reference: string; // one of imageIds: the unrotated frame; the other image moves onto it
  headline: string; // a short validated label shown in the compare bar
  // What each side is called, in imageIds order: `full` beside the divider, `short` on a phone.
  labels: [PairLabel, PairLabel];
  caveats?: string[]; // about the pair as a whole (e.g. the alignment limit), shown in the note
  alignment?: string; // short form of the alignment limit, shown beside the divider
}

export interface PairLabel {
  full: string; // e.g. "2014, Hubble WFC3"
  short: string; // e.g. "2014"
}

// Light: the same field in several bands, in rail order (at least two).
export interface BandSet extends ImageGroup {
  imageIds: string[];
}

// A named feature on an image, in full-resolution pixels (design.md 14.2). `r` is the extent
// where a record measured one; a point feature has none.
export interface FeatureLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  r?: number;
  description: string;
}

// The labels of one image, or of every image of a band set that shares one pixel grid.
export interface LabelSet {
  id: string; // file name
  imageIds: string[];
  labels: FeatureLabel[];
  validation: Validation;
  mock: boolean;
}

// One item of the detail-of-the-week pool (design.md 15.3, W1): a reference to a validated stop
// or label, with what the card may say differently, each reviewed like any other content.
interface WeeklyBase {
  body?: string; // replaces the stop's body or the label's description on the card only
  caveat?: string; // one line quoted from the image's record, shown under the text
  side?: number; // the crop's field in image pixels, when the stop's own field is not wanted
  validation: Validation;
}

export type WeeklyItem = WeeklyBase &
  ({ kind: "stop"; journey: string; stop: string } | { kind: "label"; labels: string; label: string });

export interface Content {
  sources: Source[];
  images: ImageManifest[];
  journeys: Journey[];
  pairs: ComparePair[];
  bandSets: BandSet[];
  labels: LabelSet[];
  weekly: WeeklyItem[]; // data/weekly.json, in order; empty when the file is absent
}
