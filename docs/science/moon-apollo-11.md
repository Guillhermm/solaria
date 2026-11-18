# Apollo 11 landing site: sources for the Moon Journey (J-01)

Science record of the source search of 2026-11-18, read by the reviewer. Status of the two source
records: `draft` (in `data/staging/sources/`). Nothing here has passed the full science gate yet.
Working crops are not in this repository.

## Candidates

LROC lists 23 Narrow Angle Camera (NAC) images of the site, with date, incidence, phase and native
pixel scale, in the data of its flip-book page
(https://lroc.im-ldi.com/featured_sites/apollo-11/flip-book, `data-imageData`; the same IDs appear
on `.../site_images`). Landing point there: "0.67416° N, 23.47314° E". Incidence is signed on that
page: negative values have a local time in the afternoon (sun in the west), positive in the morning
(reading of the signs is ours, not stated on the page).

| Image | Date (UTC) | Incidence | Phase | Native m/px |
|---|---|---|---|---|
| M102000149 | 2009-07-12 | -79.75 | 92.89 | 1.18 |
| M102014464 | 2009-07-12 | -81.76 | 59.21 | 1.23 |
| M106719774 | 2009-09-04 | -27.23 | 40.70 | 1.271 |
| M109080308 | 2009-10-01 | -2.19 | 16.24 | 0.538 |
| M111443315 | 2009-10-29 | 26.24 | 27.17 | 0.518 |
| M113799518 | 2009-11-25 | 54.21 | 36.93 | 0.529 |
| M116161085 | 2009-12-22 | 81.78 | 75.43 | 0.511 |
| M117338434 | 2010-01-05 | -83.63 | 74.96 | 0.484 |
| M119693197 | 2010-02-01 | -55.08 | 73.37 | 0.893 |
| M119699983 | 2010-02-01 | -55.99 | 35.95 | 0.907 |
| M122054682 | 2010-03-01 | -27.69 | 36.64 | 0.487 |
| M129133239 | 2010-05-22 | 53.13 | 47.53 | 0.479 |
| M131494509 | 2010-06-18 | 79.22 | 86.38 | 0.476 |
| M132678405 | 2010-07-02 | -87.99 | 84.80 | 0.504 |
| M135032851 | 2010-07-29 | -61.14 | 83.38 | 0.538 |
| M139755141 | 2010-09-22 | -8.77 | 7.65 | 0.502 |
| M150361817 | 2011-01-22 | -62.61 | 72.02 | 0.474 |
| M150368601 | 2011-01-22 | -63.51 | 31.66 | 0.539 |
| M162154734 | 2011-06-08 | 73.47 | 80.60 | 0.473 |
| M170409762 | 2011-09-11 | -13.96 | 15.63 | 0.49 |
| M175124932 | 2011-11-05 | 40.98 | 39.86 | 0.399 |
| M177481212 | 2011-12-02 | 69.07 | 62.85 | 0.473 |
| M102000149 and M119693197 appear with L or R in different lists of the page | | | | |

2011 images exist (six of them, 0.40 to 0.54 m/px); the best native scale of all is M175124932 at
0.399 m/px. Why they are sharper (lower orbit) is not stated on the pages read and was not checked.

Map-projected, calibrated products in the PDS archive (LRO-L-LROC-5-RDR-V1.0, volume LROLRC_2001).
The index `INDEX/CUMINDEX.TAB` lists these for the site and nothing else; the raw (EDR) and
calibrated (CDR) volumes were not searched, so the other 17 images are only known as unprojected
frames by their absence from the RDR index.

| Product | Image(s) | Scale | Size (px) | Depth | Projection and radius source | Notes |
|---|---|---|---|---|---|---|
| NAC_ROI_APOLLO11HIB_E006N0235 (v1.3) | M175124932 L+R, 2011-11-05, 41 deg | 0.40 m/px | 6950 x 73407 | 32-bit float IMG 1.90 GB; browse TIF 8-bit, 510,767,323 B | Equirectangular, centre 0.6 N 23.5 E, GLD100 map, radius from the 2 m stereo DTM | Controlled mosaic of two cameras, Sigma0 1.40 (README: ideally below 1) |
| NAC_DTM_APOLLO11_M150361817_50CM (v1.9) | M150361817 L/R, 2011-01-22, 62.6 deg | 0.50 m/px | 8440 x 55908 | 16-bit IMG 900 MB; browse TIF 8-bit, 472,311,429 B | Equirectangular, centre 1.0 N 180 E, orthorectified with the 2 m DTM from this stereo pair | "Orthophotos do not include scale and offset information" (DTM README) |
| NAC_DTM_APOLLO11_M150368601_50CM | M150368601 L/R, 2011-01-22, 63.5 deg | 0.50 m/px | 8440 x 55908 | same | Same grid as the one above (same GeoTIFF origin, checked) | Second image of the stereo pair |
| NAC_ROI_APOLLO11LOA_E004N0235 | M102000149 (80 deg, 1.19 m/px) and M162154734 (73 deg, 0.47 m/px), L+R | 0.52 m/px | 10032 x 55134 | 32-bit float; browse TIF 528 MB | Equirectangular, centre 0.4 N 23.5 E | Low-sun mosaic of 4 images; the 1.2 m/px 2009 frames are layered in front. Not downloaded or looked at |
| NAC_ROI_APOLLO11HIA_E010N0234 | M106719774 and M106726943 (27 to 28 deg, 2009-09-04) | 1.30 m/px | 16930 x 52660 | 32-bit float; browse TIF 851 MB | Equirectangular | Too coarse for the lander (3.7 m deck is about 3 px). Not downloaded |

Not an option as a plain tile source: the 2 m DTM and its colored/shaded derivatives (elevation, not
imagery), the anaglyphs (`NAC_ANAGLYPH_*` in the same index list are not Apollo 11 pairs that
were checked), and the LROC website featured images (copyrighted, see Credit).

Sources read: the product pages
https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_ROI_APOLLO11HIB_E006N0235 (and the
`_LOA_`, `_HIA_`, `NAC_DTM_APOLLO11_M150361817_50CM` equivalents); the PDS3 labels embedded in the
`.IMG` files (first 20 kB, fetched by range); the READMEs
`DATA/BDR/NAC_ROI/APOLLO11HIB/NAC_ROI_APOLLO11HIB_E006N0235_README.TXT` (and LOA, HIA) and
`DATA/SDP/NAC_DTM/APOLLO11/NAC_DTM_APOLLO11_README.TXT` under
https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/; the TIFF headers of both browse files.

## Choice: M175124932 mosaic (HIB), browse TIF

Tile `moon-apollo-11-lroc-nac-2011-11-05` (NAC_ROI_APOLLO11HIB_E006N0235.TIF).

- Best native scale (0.399 m/px), map-projected, calibrated RDR from the PDS archive, a TIF.
- Looked at on the pixels (crop of 300 x 300 px around the lander): the descent stage with a
  saturated deck, a compact dark shadow, the Passive Seismic Experiment Package area and bright
  points south of it, and a long, clear dark trail running east from the lander toward Little West.
- The 0.5 m/px orthophotos show the lander and its shadow but the tracks were not visible in
  M150361817 or M150368601 on the same crop (viewed at 3.3x), so they cannot carry the tracks.
- Georeference check: the lander deck centroid in this file is at lon 23.47321, lat 0.67419,
  within 0.0001 deg (about 3 m) of LROC's point. The same measurement in the orthophoto gives
  lon 23.47313, lat 0.67417.
- Size: 6950 x 73407 px, 510 Mpx, a strip 2.8 km by 29 km. It is far larger than the site. The app
  needs a `crop`; the lander is at about x 1899, y 33471 (deck centroid, measured), so a box such as
  x 0 to 6949, y 30000 to 37000 covers about 2.8 km x 2.8 km. The crop is a decision for the build.
  Rows are stored one per strip, uncompressed; the build reads files over `RANDOM_ACCESS_PIXELS`
  sequentially, which suits this layout. The build was not run.

Processing the file has had: the LROC team's calibration (radiometric, to I/F), ISIS3 map projection onto the
terrain model named above, bundle adjustment of the two cameras (control network), mosaic of M175124932 L and R,
and a reduction from 32-bit float to 8 bits for the browse TIF. The scaling of that reduction was not found;
the SIS (RDRSIS.PDF) was not read. The deck is clipped (255) and shadows sit at the floor (value 1), so photometry
on this file is not valid. No-data is 0 (GDAL tag).

Product dates: label `START_TIME` 2011-11-05T09:34:24, product creation 2013-07-03 (a label of v1.3). No
public release date was found, so `releasedAt` is null.

### Stable URL

`https://pds.lroc.im-ldi.com/data/.../NAC_ROI_APOLLO11HIB_E006N0235.TIF` answered 200 and a
download. The orthophoto URL answers 302 to `pds.mcp.nasa.gov` (the archive moved) and the served
file there has a modification date of 2026-08-14, so the host can change again. The record fixes the
size and SHA-256, so a changed file fails `fetch-source`. Public domain data is not at risk, only the path.

## Compare pair

Partner: `moon-apollo-11-lroc-nac-ortho-2011-01-22` (M150361817, 0.50 m/px, 8440 x 55908, 62.6 deg,
afternoon) against M175124932 (0.40 m/px, 41 deg, morning).

- Different sunlight: yes, and from opposite sides. The shadow of the lander falls east in the
  orthophoto (measured: dark pixels from x 6120 to 6138, 19 px or 9.5 m, at the value floor) and
  west in the mosaic. The tracks are clear at 41 degrees and not visible at 62.6 degrees.
- Both are map-projected equirectangular images on a 1737.4 km sphere, north up, no rotation, so a
  registration is a scale and shift per axis. The grids differ (0.40 and 0.50 m/px, other centres), so
  the pair needs a transform and the mathematician has to produce it. Parallax differs for tall
  things: the mosaic is projected onto a coarser surface than the orthophoto.
- One measurement only: the lander deck centroids differ by about 2.4 m east and 0.6 m north (5 px
  of the orthophoto), from the saturated deck, which is a single point and not a registration.
- Alternative not examined: the low-sun mosaic LOA (73 and 80 deg). It mixes 1.2 m/px and 0.47 m/px
  frames, and the README gives 6 to 7 degrees between them, over its own rule of 5.
- M131494509 (79.2 deg, 2010-06-18) is the image LROC says has "lighting ... within a degree of the
  lighting when Apollo 11 landed" (https://www.lroc.asu.edu/images/1115). It is not map-projected
  in the RDR index, so it is not usable here.

## Credit and terms

- Credit, verbatim from the LROC terms page (https://lroc.im-ldi.com/about/terms, section 2): "For
  news media or educational purposes, credit LROC images with the text tag NASA/GSFC/Arizona State
  University. If space is limited, the shorter credit NASA/GSFC/ASU is also acceptable."
- Terms, section 1: "Data products available through the LROC Data Node of the PDS or through NASA PDS
  interfaces are in the public domain", and "Images available on the LROC website, including but not
  limited to Featured Images, Featured Sites, curated products, downloads and non-PDS interfaces
  listed above, are copyrighted." The files above come from `pds.lroc.im-ldi.com`, which that page
  lists as a PDS source. The page does not say whether the `EXTRAS/BROWSE` files count as
  PDS products; they sit in the same PDS volume. Status: supported, not stated outright.
- Do not take images from the featured-site pages (`/data/support/featured_sites/...`): copyrighted.
- The product pages carry no credit line; it is copied from the terms page.

## What a stop can say

Each claim with its source. Position of the lander and the trail in the chosen file is read off a
crop and must be refined before it is a marker.

| Feature | What the sources say | Source | Status |
|---|---|---|---|
| Landing point | "Mare Tranquillitatis [0.67416° N, 23.47314° E], at 20:17:40 UTC 20 July 1969" | https://lroc.im-ldi.com/featured_sites/apollo-11/flip-book | verified (and measured in the file: within 3 m) |
| Descent stage and its shadow | "The deck of the Lunar Module descent stage is 3.7 meters on a side"; "The top of the descent stage is 3 meters above the surface" (page about 1 to 1.4 m/px images). On the 0.53 m/px image: "Material on the deck of the descent stage is highly reflective and is more than five times brighter than the mare ... the deck is saturated" | https://www.lroc.asu.edu/images/157 and https://www.lroc.asu.edu/images/65 | verified for the quotes; in the chosen file the deck is saturated (255) |
| Lunar Laser Ranging retroreflector | "Just north lies the Laser Ranging RetroReflector ( LRRR ), which is still in use today" (relative to the PSEP) | https://www.lroc.asu.edu/images/65 | verified. The name is "Laser", not "Lunar", Ranging RetroReflector |
| EASEP and PSEP | "components of the Early Apollo Science Experiments Package (EASEP) are easily seen"; "the Passive Seismic Experiment Package ( PSEP ) is seen"; "The dark halo surrounding the PSEP is a result of the repeated footsteps of the astronauts" | https://www.lroc.asu.edu/images/65 | verified for the quotes. The page spells it "Experiments"; the brief wrote "Scientific". The app uses NASA's "Early Apollo Scientific Experiments Package" (Validation of J-01, fix 2) |
| Little West crater | "Little West crater (40 meters diameter)"; "Armstrong would visit and photograph this crater during his extra-vehicular activity (EVA)"; "a small crater, dubbed Little West, that he'd flown over just before landing" | https://www.lroc.asu.edu/images/1115 and https://svs.gsfc.nasa.gov/4185 | verified for the quotes; east of the lander in the chosen file |
| West crater and landing | "the Lunar Module Eagle approached the aim point on the northeast flank of West crater (190 meters diameter)"; Armstrong flew on "about 500 meters down track" | https://www.lroc.asu.edu/images/1115 | verified for the quotes. West crater is not in the crop (about 500 m east of the lander) |
| Tracks | "The trails of disturbed regolith created by the astronauts' boots are still clearly visible in photographs of the landing site taken by the Lunar Reconnaissance Orbiter ( LRO ) narrow-angle camera ( LROC ) more than four decades later"; "Note how the astronaut paths stand out clearly" (2 deg incidence image) | https://svs.gsfc.nasa.gov/4185 and https://www.lroc.asu.edu/images/65 | verified for the quotes; seen in the chosen file as a clear trail from the lander toward Little West; not visible in the afternoon orthophotos |
| Why the shadow is long or short | The 2009 page says the shadow of the 3 m stage is "roughly 18 pixels long" at 1 m/px with a late-afternoon sun | https://www.lroc.asu.edu/images/157 | verified for the quote; at 41 degrees the shadow should be about 2.6 m (6 px at 0.4 m/px): computed from 3 m x tan(41), a stop should not state it as measured |

## Unchecked

- Registration of the two files, beyond the single deck centroid above.
- The scaling used for the 8-bit browse TIFs (RDRSIS.PDF not read), and whether browse files are
  counted as PDS public domain.
- The EDR/CDR volumes, so the other images are only "not in the RDR index".
- Why LOA mixes sun conditions, and the location and look of the LRRR (position in pixels not located).
- The 2011 orbit as the reason for the better scale; the sign convention of the incidence column.
- The Sigma0 of 1.40 of the chosen mosaic: what accuracy it implies on the ground was not computed.
- Henriksen et al. 2017 (Icarus 283, 122-137), the paper the PDS labels cite for the DTM, was not
  read. The labels cite it as `[HENRIKSENETAL2017]` and the README as Icarus (2016), the page as 2017.

## Registration and crops (mathematician, 2026-11-18)

Status: **verified** (recomputed from the PDS labels and measured on the originals in
`.cache/sources/`, with NumPy and SciPy outside the repository). Records written:
`data/staging/images/moon-apollo-11-lroc-nac-2011-11-05.json`,
`data/staging/images/moon-apollo-11-lroc-nac-ortho-2011-01-22.json` and
`data/staging/pairs/moon-apollo-11-2011.json` (texts TODO). This section supersedes two points
above: West crater is inside the crop chosen here, and the registration is no longer unchecked.

### Conventions

Pixel coordinates are OpenSeadragon edge coordinates: origin at the top-left corner of the top-left
pixel, x east, y south, the center of pixel index i at i + 0.5. "Mosaic" is the HIB product
(reference), "orthophoto" is M150361817 (moving). Unless said otherwise, pixels are those of the
cropped images, as the app sees them.

### Map projections, from the labels

Read from the PDS3 labels at the head of the two `.IMG` files (range request) and checked against
the GeoTIFF keys of the two browse TIFs, which agree to the half pixel the two conventions differ by
(PDS counts offsets from the center of pixel (1, 1), GeoTIFF ties the corner, `PixelIsArea`).

| | Mosaic | Orthophoto |
|---|---|---|
| `MAP_PROJECTION_TYPE`, sphere | EQUIRECTANGULAR, 1737.4 km | EQUIRECTANGULAR, 1737.4 km |
| `CENTER_LATITUDE` (standard parallel), `CENTER_LONGITUDE` | 0.6, 23.5 | 1.0, 180.0 |
| `MAP_SCALE` | 0.4 m/px | 0.5 m/px |
| `SAMPLE_PROJECTION_OFFSET`, `LINE_PROJECTION_OFFSET` | 3929.5, 84579.5 | 9497505.5, 74989.5 |
| GeoTIFF corner (x, y) in m | (-1572, 33832) | (-4748753, 37495) |

With R = 1737400 m, phi_s the standard parallel and lambda_0 the center longitude:
X = R cos(phi_s) (lambda - lambda_0), Y = R phi, and for a full file u = (X - X0) / s,
v = (Y0 - Y) / s. The latitude origin is the equator, not `CENTER_LATITUDE`: the label's
`MAXIMUM_LATITUDE` 1.11569 equals 84579.5 x 0.4 m / R. Eliminating lambda and phi:

- u_mosaic = 1.250121861 u_ortho - 5749.5364, where 1.250121861 = (0.5 / 0.4) cos 0.6 / cos 1.0
- v_mosaic = 1.25 v_ortho - 9157.5

The analytic transform is anisotropic by 1.0000975 (0.4 px over the crop width); a similarity
cannot hold that, but it is far below the measured misfit below. True east-west ground scale at
the lander is 0.399997 m/px in the mosaic and 0.500043 m/px in the orthophoto (cos 0.674 / cos
phi_s), so 0.4 and 0.5 m/px are right in both axes to 0.01%.

### Crops

| Image | `crop` (source pixels) | Size | Ground |
|---|---|---|---|
| Mosaic | x 300, y 31425, 4350 x 4350 | 18.9 Mpx | 1.74 x 1.74 km, 23.45211 to 23.50950 E, 0.64379 to 0.70118 N |
| Orthophoto | x 4839, y 32466, 3480 x 3480 | 12.1 Mpx | the same ground |

Why this box: it holds the descent stage (1598, 2047), the EASEP 55 to 72 px south of it, the
trail and Little West about 150 px east, and West crater at about (2985, 2300), some 480 px
across, 557 m east and 100 m south of the lander, with at least 1000 px of mare on every side of
the subjects. Its east edge is set by the orthophoto, whose valid data end at mosaic x 4665
(source) in these rows; the crop stops 15 px short of that. Its west edge is set by the mosaic,
whose no-data margin reaches source x 288; the crop starts at 300. Neither cropped image holds a 0
(no-data) pixel, so no footprint is needed.

The orthophoto box is the mosaic box mapped through the analytic transform, rounded to whole
pixels: its corners land at mosaic source (299.8, 31425.0) and (4650.2, 35775.0), within 0.2 px
of the mosaic crop. In cropped pixels the analytic transform is u_mosaic = 1.250121861 u_ortho
- 0.1967, v_mosaic = 1.25 v_ortho + 0.0000.

Caveat for the build: `generate-tiles.ts` chooses random access from the size of the whole source
file (510 and 472 Mpx, both over its 200 Mpx limit), not from the crop, so as written these crops
are still read sequentially. That was read in the code, not run.

### Method

1. Resample the cropped orthophoto onto the cropped mosaic grid with the analytic transform
   (bilinear).
2. Sunlight comes from the east in the mosaic (shadows fall west of the lander, the LRRR and
   boulders) and from the west in the orthophoto, so slope shading is reversed. Matching uses the
   orthophoto's negated high-pass image (Gaussian background removed), and, as a second estimator,
   the absolute high-pass of both. Pixels at 255 or at the floor (cast shadows, saturated rims)
   and 2 px around them are set to zero before matching. The lander, its blast zone (350 px) and
   West crater (380 px) are left out.
3. Dense check: 746 patches of 128 px on a 150 px grid, normalized cross-correlation over +-12 px,
   parabolic subpixel peak. Repeated at background sigma 3, 6 and 12 px.
4. Control points: one small crater (4 to 8 m) per cell of a 4 x 4 grid, the strongest compact
   feature in the cell with no clipped pixel within 30 px. Mosaic position: midpoint of the
   centroids of its bright and dark lobes; orthophoto position: that point plus the 48 px
   correlation offset, mapped back through the analytic transform. All 16 were inspected in a
   cutout sheet (same crater in both). The 740 dense patches are the holdout.

### Results

Shift test (the sun lies along x, so x is the axis an illumination bias would move). Median offset
of the orthophoto from the analytic transform, mosaic px:

| Estimator | sigma 3 | sigma 6 | sigma 12 |
|---|---|---|---|
| negated high-pass, x | +0.16 | +0.17 | +0.19 |
| absolute high-pass, x | +0.11 | +0.14 | +0.16 |

Stable with scale and method, so the x offsets are geometry, not lighting. The y offsets are not a
constant: they fall linearly from +3.5 px at the west edge to -2.0 px at the east edge
(-1.42e-3 px per px, a shear of 2.2 m across the crop), while x hardly depends on y (-7e-5). A plane
fit leaves 0.29 px in x and 0.34 px in y.

| Transform (ortho to mosaic, cropped px) | RMS | p95 | worst |
|---|---|---|---|
| Analytic, from the labels alone, on the 740 patches | 1.87 px (0.75 m) | 3.34 | 3.88 |
| Similarity from the 16 craters, on the 740 patches (holdout) | 1.39 px (0.56 m) | 2.03 | 2.60 |
| Same, patches within 1100 px of (2300, 2200), the subjects | 0.86 px | 1.41 | |
| Affine on the 740 patches (not representable in `Registration`) | 0.45 px | 0.71 | |

Similarity, as in `src/content/types.ts` (q = scale R(theta) p + t, y down), refit by
`scripts/register-pair.ts` and by an independent script, which agree:

```json
{ "scale": 1.2500355885315508, "rotationDeg": 0.03945903026646997, "tx": 1.2822116209081287, "ty": -1.8484240338375457 }
```

On its 16 control points: RMS 1.31 mosaic px, worst 1.91 px (crater 30, south-west corner). The
points are in the pair record. The scale matches the label ratio (1.25004 against 1.25 and
1.25012 per axis); the rotation of +0.04 degrees is half the shear, which the similarity cannot
remove.

Verdict: **correct with caveats.** One similarity aligns the two products to 0.56 m RMS, about 1.1
orthophoto pixels, and to 0.34 m around the lander, Little West and West crater. Near the image
edges features can be 2 to 2.6 mosaic px apart across the divider. The two products agree in
absolute position, without any fit, to 0.75 m RMS: both georeferences are good. An affine
registration would bring the whole crop to 0.45 px; the app has no affine type, and that is the
Foundation's call.

The lander does not line up. Its saturated deck (centroid 1598.2, 2047.0 in the mosaic) and the
orthophoto's deck mapped through the similarity (1595.5, 2048.7) are 2.7 px east and 1.7 px north
apart (1.1 m, 0.7 m), while the ground around it agrees to 0.3 px: the deck is 3 m above the
surface and the two images saw it from different directions. A caption must not use the lander to
show the alignment.

### Positions in the cropped mosaic (pixels)

Measured on the mosaic, then checked against the Apollo 11 mapping shapefiles in the same PDS
volume (`EXTRAS/SHAPEFILE/APOLLO_11/`, Gonzales et al. 2019, LPSC abstract 3089), which give the
equipment and Armstrong's path in the orthophoto's own projection. Those points were moved into the
mosaic with the similarity above (local residual there 0.3 px).

| Feature | Marker (x, y) | How measured | Shapefile, mapped | Uncertainty |
|---|---|---|---|---|
| Descent stage (deck) | 1598, 2047 | centroid of the 94 px saturated deck blob, bbox x 1592 to 1605, y 2041 to 2053 | 1595.1, 2047.2 | 1 px; 3 px east of the ground position (parallax, above) |
| LRRR | 1592.5, 2101.5 | 5 px bright object (x 1592 to 1594, y 2100 to 2103) with its shadow pixel to the west | 1591.0, 2100.6 | 1.5 px (the object is about 1 m, 2 px) |
| PSEP | 1598, 2119 | object box x 1596 to 1601, y 2116 to 2122: two bright panel columns and dark pixels between | 1596.7, 2117.5 | 1.5 px |
| End of the trail toward Little West | 1743, 2068.5 | dark trail traced column by column at y 2068; it stops at x 1742, where the bright west wall of Little West begins | 1743.7, 2067.6 (Armstrong's easternmost path point) | 2 px along the trail |

Distances from the deck: LRRR 22 m, PSEP 29 m, trail end 58 m (at 0.4 m/px). A bright 14 px object at
(1601, 2105) between LRRR and PSEP is where the shapefile puts the LRRR cover (mapped 1599.2,
2103.9). Another bright 4 px point at (1593, 2095), 2.8 m north of the LRRR, is not in the
shapefile and is unidentified. All four mapped points sit 1 to 2.5 px west-north-west of the
objects in the mosaic, consistently with the shapefile having been drawn on the orthophoto, whose
lit faces point west.

### Not checked

- The cause of the shear (mosaic L/R control, orthophoto pointing or the terrain models). It does
  not change the numbers above.
- Whether the browse TIF stretch differs between the two files (photometry is out of scope; see
  above).
- The emission angles of the two images, so the deck parallax was measured, not predicted. (Superseded in Validation of J-01: ODE gives 1.1 deg for November, 9.4 to 12.2 deg for January.)
- West crater's center and diameter are read off a 1:8 overview (about 480 px, 190 m published),
  not fitted.

## Journey and pair texts (physicist, 2026-11-18)

Status of every record: `draft`. Records: `data/staging/journeys/moon.json` (8 stops),
`data/staging/pairs/moon-apollo-11-2011.json` (texts and caveats) and the two image records
(title, target, band, processing, caveats). Positions are the mathematician's refined ones above.

### Differs flags

| Flag | Value | Reasoning | Status |
|---|---|---|---|
| instrument | false | Both are LROC NAC left and right frames (M150361817, M175124932) | verified (labels) |
| band | false | The NAC has one broadband channel, "Sensitivity 400-750 nm", panchromatic (LROC fact sheet, NAC specifications table) | verified |
| date | true | 2011-01-22 and 2011-11-05, 287 days apart | verified (labels) |
| illumination | true | Incidence 62.61 (afternoon) and 40.98 (morning) on the flip-book; shadows fall east in January and west in November, measured on the pixels | verified |
| geometry | true | Different orbits: emission 1.1 deg (November) and 9.4 to 12.2 deg (January), PDS Orbital Data Explorer (ODE); the 3 m deck sits 1.3 m apart across the divider while the ground agrees to 0.3 px (measured) | verified |
| processing | true | Mosaic onto the stereo DTM against orthophoto onto its own 2 m DTM; separate 8-bit browse stretches with unknown scaling | verified (READMEs) |

### Claims

| Claim (where) | Reasoning and source | Status |
|---|---|---|
| Landed 20:17 UTC 20 July 1969, Mare Tranquillitatis (stop 1) | Flip-book, refetched 2026-11-18: "landed the Apollo 11 Lunar Module (LM) in Mare Tranquillitatis [0.67416° N, 23.47314° E], at 20:17:40 UTC 20 July 1969." | verified |
| One broad visible band, so gray; 400 to 750 nm (stop 1, image `bands`) | LROC fact sheet, https://lroc.im-ldi.com/assets/LROC_factsheet-1ea25e00953a1dc6e26774f2e6925bf5f4534712da4ce1c2dfc70f49c41acab6.pdf, read 2026-11-18. The search lead of 400 to 760 nm (Robinson et al. 2010) was not confirmed; the fact sheet is cited | verified |
| Sun from the east in November, from the west in January; morning and afternoon (stops 1, 4, image caveats) | Shadow directions measured (reviewer, mathematician). At 0.67 N the sun in the east means local morning | verified for direction; supported for the time of day |
| Sun about 49 and 27 degrees above the horizon (stops 3, 4, pair) | 90 minus the flip-book incidence (41, 62.6). Incidence is to the local vertical; on level mare it equals the zenith angle | supported (computed, assumes level ground) |
| Shadow about 2.6 m past the stage; January shadow more than twice as long (stops 3, 4) | 3 m x tan 41 = 2.6 m; tan 62.6 / tan 41 = 2.2. Stated as our calculation, not measured. The January dark run of 19 px (9.5 m) is not used: it mixes shadow, legs and value floor | supported (computed) |
| Deck 3.7 m, top 3 m, about 9 px (stop 3) | lroc.im-ldi.com/images/157 (refetched); 3.7 / 0.4 = 9.25, consistent with the 94 px blob | verified |
| Deck "plain white" (stop 3, caveats) | 255 in the browse file. Page 65 says the deck saturates the camera on a 0.53 m image; whether 255 here is camera saturation or the 8-bit stretch is unknown, so the text says "plain white", not "saturates" | verified (pixels) |
| Lander shifts about 1.3 m across the divider (stop 4, pair) | Measured: 1.1 m east, 0.7 m north (1.3 m), ground within 0.3 px. Cause: partly the viewing angle (emission 1.1 deg against about 10 deg, ODE), partly the sunlit side of the lander switching sides; not the ground alignment. Direction of the shift not predicted | supported |
| West crater 190 m, Eagle aimed at its rocky northeast flank, landed about 500 m on, past Little West (stop 2) | images/1115 (refetched): "northeast flank of West crater (190 meters diameter)", "rocky northeastern flank", "about 500 meters down track", "flew over what would later be called Little West crater"; measured 557 m from the deck to the crater center | verified |
| West crater marker r 240 px (stop 2) | Read off a 1:8 overview (mathematician), 190 m / 0.4 = 475 px diameter | supported |
| LRRR north, PSEP south, 20 to 30 m south of the deck; EASEP; dark halo from footsteps (stop 5) | images/65 (refetched): names, "Just north lies the Laser Ranging RetroReflector", "still in use today", "dark halo ... repeated footsteps"; distances 22 and 29 m measured; shapefile agrees to 1 to 2.5 px | verified |
| LRRR: laser pulses from Earth, travel time gives the distance (stop 5) | NASA SP-214, ch. 7 (UCSD mirror, read): "compact array of high-precision optical retroreflectors (cube corners) ... reference point in measuring precise ranges between the array and points on the Earth by using the technique of short-pulse laser ranging". "Still in use" is attributed to the LROC page, whose date was not found | verified; currency of "still in use" unverified |
| Trail east about 60 m to Little West's rim; Little West 40 m; Armstrong walked there to photograph it (stop 6) | Trail end measured 58 m; shapefile puts Armstrong's easternmost point there (Gonzales et al. 2019); images/1115 for 40 m and the visit | verified |
| Trail darker, most likely from packed-down powder (stop 6) | lroc.im-ldi.com/posts/70 (Apollo 12, refetched): "areas of heaviest activity have the lowest albedo", "most likely due to compaction of a very loose surface powder". Transferred from Apollo 12 to Apollo 11; the stop says so | supported |
| Trails visible from orbit four decades later (stop 6) | SVS 4185, reviewer's quote. Not refetched: the page failed a certificate check here | verified by the reviewer only |
| Trail does not stand out in January because of the light (stops 7, pair) | Not visible at 62.6 deg on the same crop (reviewer). Reasoning: the trail is an albedo feature; page 65 notes paths "stand out clearly" at 2 deg incidence, posts/70 that high sun minimizes shadows; at lower sun slope shading dominates. The 8-bit stretches also differ, so contrast loss is partly processing | supported |
| Crater walls swap lit and shaded (stop 8, pair) | Opposite sun azimuth; the registration needed negated contrast to match (mathematician) | verified |
| "What you see change is the light and the view, not the ground" (stop 8, pair) | 740 patches agree after inverting contrast; no change was sought beyond that. A meter-scale new impact was not searched for | supported |
| Alignment 0.6 m mean, 0.3 m near the subjects, up to 1 m at edges (pair) | 1.39, 0.86 and 2.6 mosaic px x 0.4 m (mathematician) | verified |

### Not claimed, on purpose

- No brightness or reflectance number: both files are 8-bit with unknown scaling, deck at 255,
  shadows at 1.
- No measured shadow length; no shadow marker (its position was not measured).
- No purpose of the PSEP: no source was read for it.
- No position for Little West's center: only the trail end, at its west rim, was measured.

## Validation of J-01 (2026-11-18)

Verdict from the science review: accepted with caveats, once the fixes below are in. All
records stay `draft` until the humans promote them. This section supersedes the physicist's
section above where they differ.

1. Stop 5, LRRR: "It still works, though dust has dimmed it", sourced to University of Maryland,
   15 Jan 2025 (https://cmns.umd.edu/news-events/news/douglas-currie-next-generation-lunar-retroreflector)
   and NASA, 2 Jan 2025
   (https://www.nasa.gov/missions/artemis/clps/nasa-anticipates-lunar-findings-from-next-generation-retroreflector).
   "The LROC team notes it is still in use" is dropped; the currency gap above is closed by these
   sources (read by the reviewer, not by the physicist).
2. Stop 5: the package is named "Early Apollo Scientific Experiments Package", NASA's name
   (LROC's page 65 writes "Experiments", quoted above as it stands). The halo "comes from the
   astronauts' repeated footsteps".
3. Stop 1: the 20:17 UTC landing time is kept. The flip-book states it ("at 20:17:40 UTC 20 July
   1969"), refetched 2026-11-18; the stop gives the seconds as LROC does.
4. Image records: `fieldOfView` cites the PDS label of each product (map scale 0.4 and 0.5 m/px);
   the value carries the computation, 4350 px x 0.40 m = 3480 px x 0.50 m = 1.74 km.
5. Lander offset: "about 1.3 meters" in stop 4 and the pair caveat. Cause: partly the viewing
   angle (1.1 deg against about 10 deg off vertical, ODE), partly the sunlit side of the lander
   switching sides; not the ground alignment. Stop 4 cites ODE.
6. Pair caveat: the deck is "clipped to pure white in both". Alignment near the lander about
   0.4 m; the overall figure is the 95th percentile, 2.03 px (about 0.8 m), not the in-sample
   RMS. The `alignment` line follows.
7. Trail in January: "faint", not absent (pair caveat and `whatDiffers`). Stop 7 drops "and on
   the other side", adds the coarser 0.5 m pixels and the separate brightness scaling as causes,
   and labels "still there" as our reading of the two pictures. Status of "still there":
   supported (our reading).
8. Shadow: "under 10 pixels" instead of "a few pixels" (2.6 m / 0.4 m = 6.5 px, computed).
9. Stop 2 viewport (2700, 2200, z 1.7), so the lander at x 1598 stays in view on a phone.
10. Emission angles, from the PDS Geosciences Orbital Data Explorer (ODE), as given by the
    review: M175124932 (November) 1.1 deg; M150361817 (January) 9.4 to 12.2 deg. Not read by the
    physicist. The geometry flag row above is now `verified` on that basis.
