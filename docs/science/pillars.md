# Pillars of Creation: sources and registration

Science records for the Hubble 1995 and 2014 Compare pair (C-02, C-03), from the source
check and the registration of 2026-11-17. Working files are not in this repository.

## Part 1. Pillars of Creation: sources for Compare C-02 (checked 2026-11-17)

Statuses: verified (read at primary page or measured on the downloaded file), supported, no source found.
Pages and downloads were kept outside the repository.

### 1. Hubble 2014 (WFC3), left side of the pair

Page to take it from: https://esahubble.org/images/heic1501a/ (read raw HTML)

| Claim | Value | Status |
|---|---|---|
| Full-res file | https://esahubble.org/media/archives/images/original/heic1501a.tif (HTTP 200, 8-bit TIFF, 114.9 MB on page) | verified (downloaded, `sips`) |
| Pixel size | 6780 x 7071. Page "Size: 6780 x 7071 px"; NASA asset also lists 6780 x 7071 tif 122.7 MB and a 69.73 MB jpg | verified |
| Release ID, date | heic1501a, 5 January 2015, 23:15 (ESA); NASA release Jan 5, 2015 | verified |
| Observation | "September 2014, Exposure Time: 30.5 hours", HST proposal 13926, P.I. Z. Levay (NASA asset page https://science.nasa.gov/asset/hubble/2014-hubble-wfc3uvis-image-of-m16/, "About the Data"). ESA page gives no date | verified (NASA page) |
| Camera | WFC3/UVIS ("HST>WFC3/UVIS"). ESA says "Wide Field Camera 3, installed in 2009" | verified |
| Filters and colors | NASA: "Blue: F502N ([O III]) / Green: F657N (Hα + [N II]) / Red: F673N ([S II])". ESA lists O III 502 nm, H-alpha 657 nm, S II 673 nm, no colors | verified (NASA page) |
| Field, orientation | 4.53 x 4.72 arcmin, North 35.0 deg left of vertical (ESA). Derived scale 0.040 arcsec/px | verified (page); scale derived |
| Credit (ESA page) | "NASA, ESA/Hubble and the Hubble Heritage Team". Release adds "Acknowledgement: P. Scowen (Arizona State University, USA) and J. Hester (formerly of Arizona State University, USA)" | verified |
| Credit (NASA page) | "NASA, ESA, and the Hubble Heritage Team (STScI/AURA)" | verified |
| Terms | ESA/Hubble: CC BY 4.0, credit "clearly and visibly", "wording unaltered", no implied endorsement (https://esahubble.org/copyright/) | verified |

Note: the NASA Science news page for the release gave a third variant credit ("NASA/ESA/Hubble Heritage Team (STScI/AURA)/J. Hester, P. Scowen (Arizona State U.)"); I could not open the NASA release page at the URL I guessed (404), so that wording came through a summarizer. Use the credit printed on the page the file comes from.

### 2. Hubble 1995 (WFPC2), right side of the pair

Release: STScI-PRC95-44a, 2 November 1995. NASA Hubble asset page: https://science.nasa.gov/asset/hubble/gas-pillars-in-the-eagle-nebula-m16-pillars-of-creation-in-a-star-forming-region

| Claim | Value | Status |
|---|---|---|
| Full-res file | https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/1995/11/STScI-01EVVG1MZH7Z68H34YMACHEHZE.tif (HTTP 200, 6.8 MB, 8-bit) | verified (downloaded) |
| Pixel size | 1518 x 1497 (page "1518 × 1497 tif (6.51 MB)"; measured with `sips`) | verified |
| ESA mirror | https://esahubble.org/images/opo9544a/ , 1518 x 1497, `/media/archives/images/original/opo9544a.tif` (6.5 MB). Its "Release date 5 January 2015" is the ESA archive date, NOT the 1995 release | verified; trap |
| Release ID, date | STScI-PRC95-44a, "FOR RELEASE: November 2, 1995" (https://nssdc.gsfc.nasa.gov/photo_gallery/caption/hst_pillars_m16.txt); NASA page "Release Date November 2, 1995" | verified |
| Observation | "The picture was taken on April 1, 1995 with the Hubble Space Telescope Wide Field and Planetary Camera 2." NASA page: "Exposure Dates April 1, 1995" | verified |
| Camera | WFPC2 | verified |
| Filters | The NASA page has no filter field. Release text gives only species. ESA opo9544a lists O III, H-alpha, S II (WFPC2) without wavelengths. Filter IDs (F502N, F656N, F673N) are not on any page I read | no source found for IDs |
| Colors | "Red shows emission from singly-ionized sulfur atoms. Green shows emission from hydrogen. Blue shows light emitted by doubly-ionized oxygen atoms." (release text, same on NASA page). Same assignment as 2014 (S II red, H-alpha green, O III blue) | verified |
| Field, orientation | ESA opo9544a: 2.51 x 2.47 arcmin, North 42.3 deg left of vertical. Derived 0.099 arcsec/px | verified (page); scale derived |
| Credit (NASA page) | "NASA, ESA, STScI, J. Hester and P. Scowen (Arizona State University)" | verified |
| Credit (ESA opo9544a) | "Jeff Hester and Paul Scowen (Arizona State University), and NASA / ESA" | verified |
| Terms | NASA page states none, only links "NASA Brand & Usage Guidelines". Not-copyrighted status per earlier memory of nasa.gov guidelines page, not re-read today. If taken from ESA, CC BY 4.0 applies to that page | NASA terms: supported; ESA: verified |

Traps:
- Mosaic with the WFPC2 staircase: yes. The file is a 4-chip mosaic with the top right corner empty. Viewed at full frame: the black block starts at about x=760 of 1500 and the notch is stepped (3 levels). Black is baked into the pixels (RGB, no alpha). A slider must mask it or the wipe shows a black block. verified (viewed the downloaded file and the heic1501d panel).
- Orientation differs: 1995 North is 42.3 deg left of vertical, 2014 is 35.0 deg left, a 7.3 deg rotation. Scale differs 2.5x (0.099 vs 0.040 arcsec/px) and field 2.5 vs 4.5 arcmin. Registration needs rotation + scale + translation (similarity), not a plain overlay. verified from ESA page values.
- Same release image, two vintages of caption: the 1995 text says the tallest pillar "is about a light-year long"; the current NASA page says "about 4 light-years long". Also 7,000 vs 6,500 light-years. Do not copy a length without choosing one and citing it.
- Page labels in heic1501d say "2015" for the WFC3 panel; the data are from September 2014, released January 2015. Say "observed 2014".
- Same 1995 data was re-released/reprocessed? Not checked. Third-party processors: none found for these three; R. Gendler credit appears on PHAT, not here.

### 3. ESA pre-aligned comparison heic1501d

Page: https://esahubble.org/images/heic1501d/

- Type: "Collage", ONE image, 4320 x 2234 px (page; TIFF `original/heic1501d.tif` 55.6 MB, measured 4320 x 2234 16-bit RGB). Two panels side by side with a black border, thin white frames and burned-in captions "Visible • WFC3 • 2015" and "Visible • WFPC2 • 1995" (viewed). verified
- Release date 5 January 2015, 23:15. Text: "The new image, on the left, captures almost exactly the same region as in the 1995, on the right." and "taken with Hubble 20 years apart". verified
- Credits (two lines): "WFC3: NASA, ESA/Hubble and the Hubble Heritage Team" and "WFPC2: NASA, ESA/Hubble, STScI, J. Hester and P. Scowen (Arizona State University)". verified
- Usable as our pair: only after splitting it. Panel size estimated from the 1600 px preview, about 2085 x 2050 px each (estimate, not measured on the file; run a pixel crop to get exact bounds). The panels are matched in crop, not in raw pixels: the 2014 panel is cropped to the 1995 footprint. Cost: 2014 data downsampled from 0.040 to about 0.07 arcsec/px (about 1.8x), 1995 data upsampled from 0.099 to about 0.07 (about 1.4x), so we lose most of the 2014 resolution (6780 px to about 2050) and the 1995 half carries interpolation, plus burned-in labels and frames to crop out. The two halves are not guaranteed pixel-registered to each other (ESA says "almost exactly the same region"); a similarity transform from star control points would still be needed, but the residual is smaller than with the raw files. supported (estimate)
- Alternative: use heic1501a (6780 x 7071) and opo9544a / NASA 1518 x 1497 and register ourselves. The 2014 file keeps full resolution; the pair is limited by 1995 at 0.099 arcsec/px anyway, so a tile pyramid depth is set by the 2014 side. Recommendation: for a wipe at native detail use the two originals; for a fast, honest first pair use the heic1501d panels with the label and crop disclosed. assumption

### 4. Webb 2022 (NIRCam), optional

Page: https://esawebb.org/images/weic2216b/ (ESA) and https://science.nasa.gov/asset/webb/pillars-of-creation-nircam-image/ (NASA)

| Claim | Value | Status |
|---|---|---|
| Full-res file | ESA: https://esawebb.org/media/archives/images/original/weic2216b.tif (HTTP 200, 171,385,582 bytes, 163.4 MB). NASA: https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/10/STScI-01GGF8H15VZ09MET9HFBRQX4S3.png (PNG 152.33 MB; TIF 163.43 MB) | verified (HEAD request, page) |
| Pixel size | 8423 x 14589 on both | verified (pages); file dimensions not opened |
| Release ID, date | weic2216b, 19 October 2022, 16:00 | verified |
| Observation | NASA page "Exposure Dates 14 Aug 2022", proposal 2739 (K. Pontoppidan). ESA page gives none | verified (NASA page) |
| Camera | NIRCam | verified |
| Filters and colors | NASA: "Purple: F090W, Blue: F187N, Cyan: F200W, Yellow: F335M, Orange: F444W, Red: F470N". ESA lists z 900 nm purple, P-alpha 1.87 um blue, 2.0 um cyan, PAH 3.35 um yellow, 4.44 um orange, molecular hydrogen 4.7 um red | verified |
| Field, orientation | 4.21 x 7.30 arcmin, North 2.6 deg right of vertical (ESA). Derived 0.030 arcsec/px | verified (page); scale derived |
| Credit (ESA page) | "NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI)." | verified |
| Credit (NASA page) | "NASA, ESA, CSA, STScI; Image Processing: Joseph DePasquale (STScI), Anton Koekemoer (STScI), Alyssa Pagan (STScI)" | verified |
| Terms | ESA/Webb CC BY 4.0, credit "with the wording unaltered" (https://esawebb.org/copyright/) | verified |

Traps: ESA says weic2216b is the "Full View". Webb's frame is tall (4.21 x 7.30 arcmin), 4.5 x 4.7 arcmin Hubble 2014 frame is only part of it. Webb file is 8423 x 14589 (123 megapixels): too big for a browser decode, needs tiling. Webb dates differ from Hubble 2014 (Aug 2022 vs Sep 2014), and the colors encode different filters, so the band compare must say "different light, not different time". Release ESA text says "first imaged ... by Hubble in 1995, and again in 2014" (weic2216). NASA also has a separate Webb composite with MIRI (not checked here).

### Unchecked
- WFPC2 filter IDs for 1995 (no primary source found); 2014 proposal data in MAST not opened.
- Exact panel bounds in heic1501d (estimated from preview).
- NASA usage page wording for the 1995 file (page links, no text).
- Webb tif pixel dimensions opened locally (only page values).
- NASA release page for the 2015 release (guessed URL 404).

## Part 2. Pillars of Creation: 1995 WFPC2 registered onto 2014 WFC3 (2026-11-17)

Registration check. Status: **verified** (measured on the downloaded originals, refit two ways).

### Inputs

| Role | File | Size | SHA-256 |
|---|---|---|---|
| reference (2014) | heic1501a.tif | 6780 x 7071 RGB 8-bit | eaaae93a1d671808add79216c5c12a229218fb5d8a7c8e8931ba01b3d8a46b2a |
| moving (1995) | STScI-01EVVG1MZH7Z68H34YMACHEHZE.tif (saved as wfpc2_1995.tif) | 1518 x 1497 RGB 8-bit | 0387db9501a19a261a1286e5e9819d75c0fad083d0966b2deac6da2ffcd9e4e5 |

Measured on the downloaded originals with NumPy, SciPy and Pillow, outside the repository.

### Conventions

- Image coordinates as OpenSeadragon uses them: origin at the top-left corner of the image, x right, y down, pixel (i, j) spans [i, i+1] x [j, j+1], so its center is (i + 0.5, j + 0.5). Full-resolution pixels of each file.
- Transform: `q = s * R(theta) * p + (tx, ty)`, `R = [[cos, -sin], [sin, cos]]`, p in 1995 pixels, q in 2014 pixels. With y down, theta > 0 turns the 1995 image clockwise on screen (same sign as OpenSeadragon degrees), as in docs/architecture-compare.md section 2.
- Residual = predicted (fit applied to the 1995 point) minus measured 2014 position, in 2014 pixels.

### Method

1. Star candidates in 1995: peaks of the luminance (mean of R, G, B) minus a 15 px median background, Gaussian-smoothed, above 8 sigma; 614 candidates.
2. Coarse transform from one bright star seen in both (1995 (466, 886) to 2014 (2786, 2627) array indices), with scale 2.47 and rotation +7.3; the prediction landed a second star (1995 top-left) within a few px of its 2014 counterpart, which fixes the sign of the rotation and the parity (no reflection).
3. Each candidate predicted into 2014, searched within 25 px, then both positions fit with a 2D Gaussian plus a tilted plane (11 x 11 px box in 1995, 25 x 25 px in 2014), **excluding every pixel where any channel is 255** (censored fit). Cross-checked against a flux-weighted centroid (disagreement below 0.5 px in 1995 and 1 px in 2014 required).
4. Robust (3 x 1.4826 x median) iterative fit on the 110 good-quality matches: 90 inliers. Those 90 stars give the per-chip analysis below.
5. The 18 reported points were picked from the 90 inliers by image quality only, not by residual: fewest clipped pixels, lowest local background gradient (away from pillar rims), spread over all four chips, and each pair inspected in a cutout sheet. Two picks were dropped on inspection (one PC "star" on a filament, one elongated 2014 image) and one pillar-rim star replaced.

Saturation caveat: in the 2014 heritage stretch every star core reaches 255 in at least one channel (4 to 69 clipped px per star in a 11 x 11 box), so "unsaturated" is not achievable there; the censored fit uses only the unclipped wings, which is unbiased for a symmetric PSF. 1995 picks have 0 clipped pixels, except S10 (2 px).

### Control points (1995 to 2014)

```json
[
  {
    "id": "S01",
    "x1995": 399.12,
    "y1995": 109.2,
    "x2014": 2869.7,
    "y2014": 682.64,
    "holdout": false
  },
  {
    "id": "S02",
    "x1995": 610.7,
    "y1995": 580.64,
    "x2014": 3240.94,
    "y2014": 1910.03,
    "holdout": false
  },
  {
    "id": "S03",
    "x1995": 77.65,
    "y1995": 142.3,
    "x2014": 2069.5,
    "y2014": 664.58,
    "holdout": false
  },
  {
    "id": "S04",
    "x1995": 324.93,
    "y1995": 429.31,
    "x2014": 2586.74,
    "y2014": 1447.33,
    "holdout": false
  },
  {
    "id": "S05",
    "x1995": 714.47,
    "y1995": 689.72,
    "x2014": 3461.62,
    "y2014": 2210.81,
    "holdout": false
  },
  {
    "id": "S06",
    "x1995": 1084.49,
    "y1995": 473.32,
    "x2014": 4439.09,
    "y2014": 1799.12,
    "holdout": false
  },
  {
    "id": "S07",
    "x1995": 1037.86,
    "y1995": 620.81,
    "x2014": 4279.15,
    "y2014": 2145.88,
    "holdout": false
  },
  {
    "id": "S08",
    "x1995": 137.16,
    "y1995": 1150.04,
    "x2014": 1899.04,
    "y2014": 3165.13,
    "holdout": false
  },
  {
    "id": "S09",
    "x1995": 343.23,
    "y1995": 962.85,
    "x2014": 2467.65,
    "y2014": 2771.63,
    "holdout": false
  },
  {
    "id": "S10",
    "x1995": 277.39,
    "y1995": 1461.71,
    "x2014": 2144.2,
    "y2014": 3974.33,
    "holdout": false
  },
  {
    "id": "S11",
    "x1995": 722.88,
    "y1995": 1082.63,
    "x2014": 3355.65,
    "y2014": 3182.35,
    "holdout": false
  },
  {
    "id": "S12",
    "x1995": 1452.87,
    "y1995": 1434.35,
    "x2014": 5042.7,
    "y2014": 4278.71,
    "holdout": false
  },
  {
    "id": "S13",
    "x1995": 1445.5,
    "y1995": 1006.84,
    "x2014": 5161.74,
    "y2014": 3225.1,
    "holdout": false
  },
  {
    "id": "S14",
    "x1995": 1339.68,
    "y1995": 812.93,
    "x2014": 4961.06,
    "y2014": 2714.27,
    "holdout": false
  },
  {
    "id": "S15",
    "x1995": 1358.63,
    "y1995": 1249.09,
    "x2014": 4871.54,
    "y2014": 3792.92,
    "holdout": false
  },
  {
    "id": "S16",
    "x1995": 486.44,
    "y1995": 195.24,
    "x2014": 3057.02,
    "y2014": 922.66,
    "holdout": true
  },
  {
    "id": "S17",
    "x1995": 264.62,
    "y1995": 1179.22,
    "x2014": 2203.6,
    "y2014": 3276.26,
    "holdout": true
  },
  {
    "id": "S18",
    "x1995": 1193.62,
    "y1995": 1330.51,
    "x2014": 4439.43,
    "y2014": 3940.82,
    "holdout": true
  }
]
```

### Fit (15 points, S01 to S15)

| Quantity | Value |
|---|---|
| scale | 2.48041 (2014 px per 1995 px) |
| rotationDeg | +7.3167 (1995 turned clockwise onto 2014) |
| tx, ty | 1922.68, 290.55 (2014 px; where 1995 corner (0, 0) lands) |
| RMS residual | 2.50 px (2014) = 1.01 px (1995) = 0.100 arcsec |
| worst residual | 6.07 px (S09, WF-BL) |
| leave-one-out RMS | 2.81 px, worst 6.74 px |
| holdouts S16, S17, S18 | 2.02, 2.59, 0.50 px (RMS 1.92 px) |

Independent recomputation: linear least squares on (a, b, tx, ty) with `x' = a x - b y + tx`, `y' = b x + a y + ty` and the closed form in complex numbers from the architecture doc agree to 1e-9.

| id | chip | use | dx | dy | r |
|---|---|---|---|---|---|
| S01 | WF-TL | fit | 0.41 | 2.64 | 2.67 |
| S02 | WF-TL | fit | 0.78 | 1.93 | 2.08 |
| S03 | WF-TL | fit | -0.73 | 0.58 | 0.94 |
| S04 | WF-TL | fit | -0.27 | 2.05 | 2.07 |
| S05 | WF-TL | fit | 0.94 | 2.29 | 2.47 |
| S06 | PC | fit | 2.15 | -1.53 | 2.64 |
| S07 | PC | fit | 0.78 | -0.16 | 0.8 |
| S08 | WF-BL | fit | -2.2 | -1.91 | 2.92 |
| S09 | WF-BL | fit | -4.7 | -3.85 | 6.07 |
| S10 | WF-BL | fit | -0.82 | -0.04 | 0.82 |
| S11 | WF-BL | fit | 3.48 | 0.04 | 3.48 |
| S12 | WF-BR | fit | 1.25 | -0.42 | 1.32 |
| S13 | WF-BR | fit | -0.87 | -0.9 | 1.25 |
| S14 | WF-BR | fit | 0.72 | -0.55 | 0.91 |
| S15 | WF-BR | fit | -0.91 | -0.17 | 0.93 |
| S16 | WF-TL | holdout | 0.73 | 1.88 | 2.02 |
| S17 | WF-BL | holdout | -2.4 | -0.99 | 2.59 |
| S18 | WF-BR | holdout | -0.48 | 0.11 | 0.5 |

Corners of the 1995 image mapped into 2014: (0,0) to (1922.7, 290.5); (1518,0) to (5657.3, 770.1); (1518,1497) to (5184.4, 4453.0); (0,1497) to (1449.8, 3973.5). The whole 1995 frame lies inside the 2014 frame.

### Plausibility against the published orientation

- Rotation: page values give 42.3 - 35.0 = +7.3 deg; measured +7.317. North in the 1995 frame (42.3 deg left of up) lands at 34.98 deg left of up in 2014. Matches.
- Scale: page fields give 2.51' / 1518 = 0.09921"/px and 4.53' / 6780 = 0.04009"/px, ratio 2.475 (2.472 from the heights). Measured 2.4804, +0.2 %; the page fields are rounded to 0.01', which alone allows about +-0.3 %. Measured 1995 scale with the 2014 width: 0.04009 x 2.4804 = 0.0994"/px, close to the WFPC2 WF nominal 0.0996"/px (supported, handbook value not re-read today). Within the 0.5 deg / 2 % gate.
- No reflection: a parity flip would leave residuals of hundreds of px.

### Per-chip residuals (90 inliers)

Chips in the 1995 mosaic, by 1995 pixels: WF-TL x < 768, y < 746; PC 768 <= x < 1113, 407 <= y < 746; WF-BL x < 768, y >= 746; WF-BR x >= 768, y >= 746. The PC chip was resampled to the WF scale in the release mosaic (its 345 x 339 px area at 0.0994"/px is about 34", the PC field).

| model | RMS (2014 px) |
|---|---|
| one similarity | 2.56 (scale 2.4806, rot 7.310) |
| one rotation and scale, plus a translation per chip | 1.66 (scale 2.4761, rot 7.294) |
| each chip fit alone | WF-TL 1.22, WF-BR 1.26, WF-BL 2.32, PC 1.99 (n=5) |

Chip translations relative to WF-BR (shared scale): WF-TL (-2.8, -6.9), WF-BL (-2.6, -1.2), PC (-1.6, -2.5) 2014 px; standard error of the chip means 0.2 to 0.5 px for the WF chips, 1.0 for the PC. So yes: **the mosaic leaves per-chip offsets**, up to about 7.5 2014 px (3 1995 px, 0.3") between WF-TL and WF-BR. A single similarity absorbs part of that by inflating the scale by 0.18 % and leaves about 1 1995 px RMS.

The PC's own scale (2.4719, n=5) is not distinguishable from the WF chips (2.475 to 2.477): the mosaic already resampled it, so its different native pixel scale does not show beyond the noise.

Cropping to the WF chips does not help: the large offset is between two WF chips (WF-TL against WF-BR). Only a single-chip crop or a per-chip (piecewise) transform removes it.

The remaining 1.66 px with per-chip shifts is consistent with centroid noise plus 19.4 years of stellar proper motion (a field star at 5 mas/yr moves 0.1", 2.4 2014 px); S09 (6.1 px) may be such a star. Not checked against a proper-motion catalog.

### Verdict on a single similarity

Correct with caveats. RMS 2.50 px (2014) = 1.01 px (1995) = 0.10", holdout RMS 1.92 px: at the proposed bar of 1 moving pixel, not under it. Acceptable for the wipe and blink if the copy says "aligned to about 0.1 arcsec" and does not claim star-exact alignment; at deep zoom on the 2014 side, stars will step by up to 2 to 3 1995 px (0.2 to 0.3") at the divider, mostly in WF-TL vs the lower chips. If that is not acceptable, the fix is a per-chip similarity with the four chip polygons below (schema change: one Similarity per footprint polygon), not a WF-only crop.

### Crop polygon for the 1995 data area

Measured on the file: every pixel with max(R, G, B) <= 3 forms exactly two rectangles, columns 768 to 1517 for rows 0 to 406, and columns 1113 to 1517 for rows 407 to 745 (pixel indices). Edges are sharp (no partial pixels). Data area, image coordinates (edges), clockwise from the top-left:

```json
[[0, 0], [768, 0], [768, 407], [1113, 407], [1113, 746], [1518, 746], [1518, 1497], [0, 1497]]
```

The two columns just left of x = 768 (rows 0 to 406) are 10 to 15 % darker than the columns 4 px inside (measured over rows 50 to 400) (chip-edge vignetting); an inset of 2 px on that edge (768 to 766) hides it if wanted. The other notch edges show no darkening. Chip seams below the notch are blended, no black.

Per-chip polygons (only needed for a piecewise transform): WF-TL [[0,0],[768,0],[768,746],[0,746]]; PC [[768,407],[1113,407],[1113,746],[768,746]]; WF-BL [[0,746],[768,746],[768,1497],[0,1497]]; WF-BR [[768,746],[1518,746],[1518,1497],[768,1497]]. The seam positions x = 768 and y = 746 come from the notch corners; the true blended seams were not traced separately.

### Not checked

- Stellar proper motions (no catalog cross-match).
- Where exactly the blended chip seams run below the notch (taken as x = 768, y = 746).
- WFPC2 handbook pixel scale (0.0996"/px from memory, supported).
