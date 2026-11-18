# Architecture: Sprint 7, Compare (C-01 to C-05)

Status: decided on 2026-11-17. Builds on `docs/architecture.md` (sections 4, 6, 8, 9), `docs/design.md`
(5.6, 7.3) and `docs/science/compare-and-light.md` (1A, 1B, 2, 3).

## 1. Rendering: one OpenSeadragon viewer, two tiled images

Wipe and Blink run in one viewer holding two `TiledImage`s in one coordinate frame. Side
by side (desktop only, design 5.6) adds a second viewer that uses the same frame, so
syncing is a plain copy of center and zoom.

Checked in `node_modules/openseadragon/build/openseadragon/openseadragon.js` (5.0.1):

| Need | Support in 5.0.1 |
|---|---|
| Per-image rotation | `addTiledImage({ x, y, width, degrees })` and `TiledImage.setRotation(degrees)`. Rotation pivots on the center of the image's unrotated bounds (`_getRotationPoint`). `Point.rotate` computes `x' = cos*dx - sin*dy`, `y' = sin*dx + cos*dy`, so with y down a positive angle turns clockwise on screen. |
| Rectangular clip | `addTiledImage({ clip })` and `TiledImage.setClip(Rect | null)`, a rectangle in that image's pixels, rotated with the image. |
| Polygon crop | `TiledImage.setCroppingPolygons(Point[][])`, image pixels, non-zero winding, rotated with the image. |
| Drawers | WebGL and Canvas drawers implement rotation, clip and cropping polygons (WebGL routes them through its Context2d second pass). The HTML drawer's `canRotate()` returns false. |
| Typings | `@types/openseadragon` 4.1 declares `degrees`, `clip`, `setClip`, `setCroppingPolygons`, `setRotation`. |

Layer rules:

- The pair names a **reference** image. It is added first at `x = 0, width = 1`, never
  rotated, so a vertical divider on screen is a vertical line in its pixels and its wipe
  clip is a plain `Rect(0, 0, splitX, height)`.
- The **moving** image is added second with the placement from section 2. Its crop is
  `footprint ∩ half-plane right of the divider`, mapped into its own pixels, so it never
  shows on the reference side, even where it extends past the reference frame (Webb).
- Wipe: both crops update on `viewport-change` and on divider input. Blink: no wipe crops;
  the reference toggles opacity 0 and 1. Side by side: viewer A holds the reference,
  viewer B holds only the moving image at the same placement; the viewer under the pointer
  leads, the other copies `center` and `zoom`.
- Both viewers set `drawer: ["webgl", "canvas"]`. If `viewer.drawer.canRotate()` is false,
  Compare is hidden (design 5.8: hidden, never disabled).
- OpenSeadragon's home bounds become the union of both images, so the compare view math
  never calls `viewport.getHomeZoom()`. It uses the existing pure `osdHomeZoom(viewer,
  referenceSize)`; `x`, `y` and `z` stay in reference pixels and fit-relative zoom.

## 2. Registration (C-03)

Control points live in the pair manifest; a script fits a similarity transform and writes
the result back next to them.

```ts
// src/content/types.ts, replacing Registration
export interface ControlPoint {
  label: string; // e.g. "star A", to find it again
  moving: { x: number; y: number }; // full-resolution pixels of the moving image
  reference: { x: number; y: number }; // full-resolution pixels of the reference image
}

// q = scale * R(rotationDeg) * p + (tx, ty); p in moving pixels, q in reference pixels.
// R is [[cos, -sin], [sin, cos]] with y down, the same sign as OpenSeadragon's degrees.
export interface Similarity { scale: number; rotationDeg: number; tx: number; ty: number }

export type Registration =
  | { method: string; transform: "none"; residualPx: 0 }
  | {
      method: string; // "similarity, least squares on star control points"
      transform: "similarity";
      controlPoints: ControlPoint[]; // at least 6
      similarity: Similarity; // written by scripts/register-pair.ts
      residualPx: number; // RMS, reference pixels, written by the script
      maxResidualPx: number; // worst point, reference pixels, written by the script
    };

// ComparePair gains:
//   reference: string;  // one of imageIds; the unrotated frame
//   headline: string;   // short validated label, e.g. "Different light, not different time"
// ImageManifest gains:
//   footprint?: { x: number; y: number }[][]; // pixels that hold data; absent = whole image
```

`"affine"` leaves the union until a pair needs it.

`src/content/registration.ts` (pure, shared by the script and the validator, as
`pyramid.ts` is):

```ts
export const fitSimilarity = (points: ControlPoint[]): Similarity;
export const applySimilarity = (s: Similarity, p: Point): Point;
export const residuals = (s: Similarity, points: ControlPoint[]): { rms: number; max: number; perPoint: number[] };
```

The fit is the closed-form least squares in complex numbers: with means removed,
`a = Σ q·conj(p) / Σ |p|²`, `scale = |a|`, `rotationDeg = arg(a)`, translation from the
means. About 30 lines, no dependency.

`scripts/register-pair.ts <pairId>` reads `data/pairs/<pairId>.json`, fits, prints one line
per point (label, residual in reference and moving pixels), the scale and rotation, and
replaces only `similarity`, `residualPx` and `maxResidualPx` in the file (2-space JSON,
trailing newline, as generate-tiles does with `tiles`).

Recomputed independently, three ways:

1. `validateContent` refits from `controlPoints` and fails if the stored numbers differ
   (relative 1e-9 on the transform, 1e-3 px on the residuals). The file cannot drift from
   its points.
2. Science review refits the same points with its own tool (for example NumPy least
   squares) and re-measures at least 3 stars kept out of the fit; their residual goes in
   `validation.notes`. Refitting alone only checks arithmetic; held-out stars check the
   points.
3. Plausibility against the published orientation: for the Hubble pair, expected
   `scale ≈ 0.0992 / 0.0401 ≈ 2.47` and `rotationDeg ≈ 42.3 - 35.0 = +7.3` (1995 turned
   clockwise onto 2014). A reflected parity would show as a large residual.

Proposed bar for science review to set: RMS at most 1 moving pixel (about 2.5 reference
pixels, 0.1 arcsec). Points spread over all three WF chips of the 1995 mosaic.

Placement in the viewer (`src/viewer/compare.ts`, pure). With `Wm, Hm` the moving size,
`Wr` the reference width and `pc = (Wm / 2, Hm / 2)`:

```ts
export const placement = (s: Similarity, moving: Size, reference: Size) => {
  const width = (s.scale * moving.width) / reference.width;
  const height = (s.scale * moving.height) / reference.width;
  const c = applySimilarity(s, { x: moving.width / 2, y: moving.height / 2 });
  return {
    x: c.x / reference.width - width / 2,
    y: c.y / reference.width - height / 2,
    width,
    degrees: s.rotationDeg,
  };
};
```

OpenSeadragon maps moving pixel `p` to `c + (scale / Wr) * R * (p - pc)` after pivoting on
the center, which equals `applySimilarity(s, p) / Wr`. The unit test checks exactly that
for random points.

## 3. The WFPC2 staircase: a polygon in the image manifest

`footprint` in `data/images/<1995 id>.json`: one polygon of about 10 vertices tracing the
data area, inset 2 px from the black, measured once by hand on the source file. Applied
with `setCroppingPolygons`, intersected with the wipe half-plane.

Why not alpha in the tiles: tiles are JPEG (`TilePyramid.format: "jpg"`, `tileUrl` ends in
`.jpg`), so alpha means PNG tiles, a second format in the schema, the tiler and the URL
builder; thresholding black to transparent would also cut genuinely black sky inside the
nebula. The polygon changes no tile and no pipeline step, and the footprint belongs to the
image, so Explore can reuse it.

What shows outside the footprint is the viewer background, never the other image. The
caveat ("the stepped corner is the WFPC2 detector layout, not structure") goes in the
image's `caveats`, validated with it. Whether to outline the footprint is a design call.

## 4. URL and state

```
/[referenceImageId]?mode=compare&pair=<pairId>&layout=wipe|side|blink&split=50&x=&y=&z=
```

- Compare is offered on the page of a pair's reference image only. `pair` may be omitted
  when the image references one pair; with two (Hubble 1995 and Webb), the first in file
  order is the default.
- `split`: integer 0 to 100, percent of viewer width from the left, default 50, the same
  number as the slider's `aria-valuenow`. `layout` defaults to `wipe`; `side` falls back
  to `wipe` below the desktop breakpoint. Defaults are omitted when serializing.
- `x`, `y`, `z`: reference pixels, zoom relative to the reference fit. Without a view the
  camera fits the moving image's footprint as placed in the reference frame (the overlap).
- `parseViewerParams` gains a `compare` field, parsed and clamped the same way as today
  (unknown pair, layout or malformed split falls back to the default).
- Divider position lives in React state, mirrored to the URL by the existing debounced
  `replaceState`.

## 5. Webb as a band comparison (C-05)

Same `ComparePair`, second file `data/pairs/pillars-hubble-webb.json`, reference the 2014
Hubble image, moving Webb NIRCam 2022 (rotation about 2014's 35.0 left plus Webb's 2.6
right, so about 37.6; the fit decides). `differs`: instrument, band, date and processing
all true; the dates differ by 8 years, so the label states which difference dominates
rather than claiming no time passed. `headline: "Different light, not different time"` is
validated with the pair and shown in the compare bar; side labels come from each image's
validated claims (year from `observedAt`, observatory, instrument).

The Pillars Journey uses the 2014 image. A stop may carry `compare?: { pairId: string;
split: number }`; arriving at it adds the moving image with the same layer module, leaving
it removes it. The validator checks the pair exists and references the Journey's image.

## 6. Sourcing and tile weight

`fetch-source` into `.cache/sources/` (ignored), then `generate-tiles <file> <imageId>`
with `tileSize` 256 and `maxLevel` 6 as today.

| Image | Pixels | Tiles | Size | How known |
|---|---|---|---|---|
| Hubble 2014 WFC3, heic1501a | 6780 x 7071 | 1 023 (756 at full res) | 43.8 MB | measured: same libvips calls, scratch output |
| Hubble 1995 WFPC2 | 1518 x 1497 | 53 | 0.5 MB | measured |
| Webb 2022 NIRCam, weic2216b | 8423 x 14589 | 2 566 (1 881 at full res) | about 110 MB (90 to 140) | count computed; size estimated from 2014's 42.8 KB mean, file not tiled |

Current state: Andromeda tiles 174 MB on disk, `.git` pack 159 MiB. GitHub recommends a
source repository under 1 GB and caps a published Pages site at 1 GB.

- **Hubble pair: commit now.** +44 MB, about 25 % more, well under the S-04 line (700 MB
  refused).
- **Webb: defer to R2.** It would add about 110 MB, more than half of today's tiles, for
  one stop. C-05 depends on R-01 and R-02. Rejected fallbacks: a capped level (level 5
  only, about 29 MB) puts Webb at 0.060 arcsec/px, coarser than Hubble's 0.040, so the
  wipe would show Webb blurrier than Hubble, the opposite of the truth; cropping Webb to
  the 2014 field still costs about 70 MB and creates a derived product that needs its own
  validation.
- Tiles are immutable per id: register before announcing an id, and never regenerate a
  committed pyramid (the footprint polygon is why that is not needed).

## 7. Slices in build order

Each leaves `npm test`, `npm run build` and the end-to-end suite green.

1. **Registration math and schema** (C-03 groundwork). `registration.ts`, the new
   `Registration`, `reference`, `headline`, `footprint`; validator and gate rules.
   Tests: fit recovers a known similarity from exact points (residual 0) and from noisy
   points (residual near the noise); invariance to point order; fewer than 6 points,
   `reference` not in `imageIds`, footprint vertex outside the image, stored transform not
   matching the refit: each fails with its path.
2. **Mock pair with a real transform** (C-01 data). `generate-mock` renders the moving
   mock image scaled 0.5 and turned 7.3 degrees, with a stepped notch, and writes exact
   control points and a footprint. Tests: the generated pair validates; refit residual
   below 1e-6.
3. **Compare view math** (C-01). `src/viewer/compare.ts`: `placement`, `splitToReferenceX`,
   `clipHalfPlane` (polygon against one line, Sutherland-Hodgman), `overlapBounds`; URL
   `compare` params. Tests: placement round-trip against OpenSeadragon's mapping for random
   points; half-plane clip of a square, a staircase and a polygon fully on either side;
   split 0 and 100; URL parse, clamp and serialize round-trip.
4. **Wipe and Blink in the viewer** (C-01). `src/components/compare/`: a layer hook that
   adds the moving image and keeps both crops current, and the divider slider (design
   7.3). `@img-comparison-slider/react` is already absent from `package.json` and `src/`;
   mark that part of C-01 done. Tests: end-to-end on the
   mock pair: open `?mode=compare&split=30`, divider keys move by 1 and 10, URL updates,
   reload restores; a pixel probe left and right of the divider shows the expected mock
   image.
5. **Side by side** (C-01, desktop). Second viewer and lead-follow sync. Tests: unit test
   of the sync guard (no echo loop); end-to-end pan in one viewer moves the other.
6. **Hubble pair data** (C-02, C-03). Sources, manifests, tiles, control points, footprint,
   `register-pair`. Tests: content validation passes; plausibility within 0.5 degree and
   2 % scale; science review recomputes (section 2).
7. **"What differs?" note** (C-04). Text only, validated.
8. **Pillars Journey with Webb** (C-05, after R-02). Webb source and tiles on R2, second
   pair, stop `compare` field. Tests: stop validation; end-to-end arrival at the Webb stop
   shows both labels and the headline.

## 8. Risks and what to test first

1. **Clip and crop under the WebGL drawer with a rotated image.** Spike on the mock pair at
   high zoom before slice 4: seams, a lag of one frame between divider and crop, and the
   cost of the Context2d second pass on a phone.
2. **WFPC2 mosaic geometry.** If the release mosaic keeps per-chip offsets, one similarity
   leaves a chip-shaped residual. Pick points in every chip and read per-point residuals
   before committing tiles.
3. **Home bounds are the union of both images.** Anything still reading
   `viewport.getHomeZoom()` in Compare shows a wrong `z`; the URL round-trip test catches it.
4. **Divider and crops out of step during animation.** Crops update on
   `viewport-change`, which fires per animation frame; the end-to-end pixel probe runs
   after a zoom animation, not only at rest.
5. **Webb waits on R2.** If R-01 slips, C-05 slips; the Hubble pair ships without it.

## 9. As built (Sprint 7)

Where the build differs from sections 1 to 4, and why. Each was the simpler working option.

- **Home bounds stay the reference's.** The moving image is added with
  `world.setAutoRefigureSizes(false)` (OpenSeadragon 5.0.1), so `viewport.getHomeZoom()`
  keeps meaning the reference fit and the existing readout, URL and constraint code needed no
  change. Removing the moving image refigures the sizes again. Content past the reference
  frame cannot be panned to; Compare is about the overlap.
- **Cropping polygons instead of `setClip` and opacity.** The navigator copies a clip and an
  opacity onto its mirror of the reference (`Navigator._matchBounds`, `_matchOpacity`), which
  cut the overview and made it blink. Both images are cut with `setCroppingPolygons` only:
  the reference with the rectangle left of the divider, the moving image with its footprint
  right of it; Blink and Side by side hide an image with an empty polygon. The navigator's
  mirror of the moving image is removed as it arrives, so the overview maps the reference.
- **Canvas drawer on a page that offers Compare.** Spike on the rotated mock pair, headless
  Chromium with software GL, 1200 x 700: WebGL 25.6 ms per frame plain and 41.0 ms with the
  crops (its Context2d second pass stalls on `ReadPixels`); canvas 16.6 and 16.5 ms. Both
  map the moving image's control points onto the reference within 1.3e-13 px. Other pages
  keep OpenSeadragon's default drawer. Not measured on a phone GPU.
- **Labels live in the pair manifest.** `labels: [{ full, short }, { full, short }]` in
  `imageIds` order, validated with the pair; the UI composes no claim from image fields.
- **Labels below 64rem.** Under the desktop width the side labels give way to the "Left: ..."
  chips in the compare bar (design 5.6 asks for that on a phone; tablets follow it).
- **Both credits sit in the compare bar** on desktop and tablet, and in the sheet on a phone;
  the single credit at the top left is hidden in Compare.
- **Blink** hides each image in turn every 800 ms, has Pause and Swap (WCAG 2.2.2), and never
  blinks on its own under reduced motion (Swap only).
- **End-to-end build.** Playwright builds with `SOLARIA_CONTENT=development`, which loads the
  mock content and keeps the mock tiles, so the suite runs Compare on the mock pair. A plain
  `npm run build` is unchanged and stays behind the gate.
- **The mock pair** is drawn at 4096 x 2048 (scene units times 4) so OpenSeadragon's
  `maxZoomPixelRatio` of 1.1 still lets a viewer zoom past the fit.
- **Staged content.** The Hubble pair, its images and sources are draft, and the gate fails a
  production build on any draft record in `data/`. They live in `data/staging/`, which
  `loadContent` reads in development only (and in the end-to-end build); `fetch-source`,
  `generate-tiles` and `register-pair` find a record in either place; the postbuild step
  strips staged tile trees from `out/`. Moving the files to `data/` publishes them, and the
  gate then checks them as usual.
- **Tiler access.** `generate-tiles` opens files up to 100 megapixels for random access:
  each pyramid level reads the original again, which the sequential TIFF reader refused on the
  1995 file ("out of order read").
- **Hubble registration (C-03).** 15 fit stars and 3 held out, picked by the Second
  Foundation mathematician (`docs/science/pillars.md`, part 2). `register-pair` reproduces
  scale 2.48041, rotation +7.3167 degrees, translation (1922.68, 290.55), RMS 2.50 px and
  worst 6.07 px (2014 pixels), and a test holds it there. One similarity for the whole
  mosaic, by decision; the per-chip offsets are in `registration.notes`. Footprint: the
  measured data area with the x = 768 edge moved in to 766.
