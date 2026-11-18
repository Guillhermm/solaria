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
| Filters | The NASA page has no filter field. Release text gives only species. ESA opo9544a lists O III, H-alpha, S II (WFPC2) without wavelengths. Filter IDs (F502N, F656N, F673N) are not on any page I read. Superseded 2026-11-17: Hester et al. 1996, AJ 111, 2349, section 2 lists F656N, F502N, F673N (and F547M) | supported (see Validation) |
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

## Validation (2026-11-17)

Verdict: accepted with caveats. Two checks, against the primary pages listed in Sources and
Hester et al. 1996, AJ 111, 2349, section 2
(https://articles.adsabs.harvard.edu/pdf/1996AJ....111.2349H).

Fixes applied:

- Pair `differs`: `band` true (the 1995 green filter F656N passes nearly pure H-alpha; the 2014
  F657N also passes [N II], transmission at 6583 Å 0.06 against 0.94) and `processing` true
  (two teams, separate stretches; every 2014 star core clips at 255).
- `whatDiffers` replaced: "Same telescope, two cameras: WFPC2 in 1995 and WFC3 in 2014, about
  19 years apart. Both map oxygen to blue, hydrogen to green and sulfur to red, but through
  different filters: the 2014 green filter is wider and also lets in nitrogen light. Each image
  was processed separately, so differences in color, brightness and how stars look come from
  the cameras and processing, not from the nebula. The 2014 image is sharper and covers a wider
  field."
- Pair caveat: "Aligned on 15 stars to about 0.1 arcsecond on average. The 1995 picture is a
  mosaic of four detectors that do not line up perfectly with each other, so in places the two
  images can be offset by up to 0.3 arcsecond, about 3 pixels of the 1995 image. A shift that
  small is an alignment limit, not motion in the nebula." Divider line: "Alignment: about 0.1
  arcsecond, up to 0.3 in places."
- 1995 image: filters F502N, F656N, F673N (Hester 1996, section 2, `supported`); product type
  mosaic cites the same paper; caveats add the charge bleed, ghost ring and line blemish, the
  diffraction spikes, and "Colors are assigned, not seen by eye."
- 2014 image: product type mosaic cites the NASA 2014 asset page ("Astronomers combined several
  Hubble exposures"); caveats add "In this published version the cores of the stars are
  saturated, so their brightness is not comparable with the 1995 image." and the assigned
  colors. The label year 2014 is the observation year; the release date stays 2015-01-05.
- 1995 source: terms "NASA Media Usage Guidelines",
  https://www.nasa.gov/nasa-brand-center/images-and-media/. The NASA page for this image states
  no terms of its own; the guidelines say NASA content is generally not subject to copyright
  and ask for acknowledgement of NASA.
- No claim about the fragment or the jet, and no pillar length (the NASA pages give 1, 4 and 5
  light-years).

Open: where the jet is; WFPC2 filter bandpasses beyond the three compared; whether the Hester
and Scowen credit needs more than the credit line.

## Part 3. Pillars of Creation: Webb 2022 NIRCam source (checked 2026-11-17)

Closes the open items of Part 1 section 4 for the band comparison with Hubble 2014 ("different
light, not different time"). Staged as `data/staging/sources/pillars-webb-2022-nircam.json`,
validation pending.

Original chosen: ESA/Webb weic2216b TIF. Reason: the ESA copyright page states the license and
the credit rule; the NASA asset page states no usage terms of its own and only links to the
NASA Brand and Usage Guidelines. The NASA PNG (152.33 MB, same 8423 x 14589) is the fallback.

| Claim | Value | Status | Source |
|---|---|---|---|
| File | `.cache/sources/pillars-webb-2022-nircam.tif`, 171,385,582 bytes, sha256 `3a0b5a62fa7f27d292d7e87c483a9faea0e7aa70829e6de28b61229a12b509d8`, 8423 x 14589 px | verified (downloaded; `sips` read the pixel size) | https://esawebb.org/media/archives/images/original/weic2216b.tif |
| Instrument | NIRCam on Webb | verified | ESA page; NASA page "JWST>NIRCam" |
| Filters | F090W, F187N, F200W, F335M, F444W, F470N | verified | NASA page "Filters"; https://science.nasa.gov/asset/webb/pillars-of-creation-nircam-image/ |
| Colors | "Purple: F090W, Blue: F187N, Cyan: F200W, Yellow: F335M, Orange: F444W, Red: F470N." | verified | NASA page "Color Info" |
| Wavelengths (ESA labels) | z 900 nm purple, P-alpha 1.87 um blue, 2.0 um cyan, PAH 3.35 um yellow, 4.44 um orange, molecular hydrogen 4.7 um red | verified (ESA page) | https://esawebb.org/images/weic2216b/ |
| Observation date | "14 Aug 2022" (NASA "Exposure Dates"); ESA page gives none; program 2739 (Pontoppidan), a Cycle 1 outreach campaign | verified (NASA); proposal record seen in a search result, not opened | NASA page |
| Release date | 19 October 2022, 16:00 (ESA); "October 19, 2022" (NASA) | verified | both pages |
| Credit | "NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI)." | verified | ESA page |
| Terms | CC BY 4.0; "The full image or footage credit must be presented in a clear and readable manner to all users, with the wording unaltered" | verified | https://esawebb.org/copyright/ |

Open:
- The NASA page credit differs in wording ("Image Processing: Joseph DePasquale (STScI), ..."). The
  app uses the ESA wording because the ESA terms govern the file used.
- The 14 Aug 2022 date is one date from a NASA field; per-filter exposure dates were not checked
  in MAST. The STScI program 2739 PDF was not opened.
- The Hubble 2014 and Webb frames are different footprints (Webb 4.21 x 7.30 arcmin); registration
  between them is not done here.

## Part 4. Pillars of Creation: Webb 2022 NIRCam registered onto Hubble 2014 WFC3 (2026-11-17)

Registration check for C-05. Status: **verified** (measured on the downloaded originals, refit
with `scripts/register-pair.ts`).

### Inputs

| Role | File | Size | SHA-256 |
|---|---|---|---|
| reference (2014) | `.cache/sources/pillars-hubble-2014.tif` (heic1501a) | 6780 x 7071 RGB 8-bit | eaaae93a1d671808add79216c5c12a229218fb5d8a7c8e8931ba01b3d8a46b2a |
| moving (2022) | `.cache/sources/pillars-webb-2022-nircam.tif` (weic2216b) | 8423 x 14589 RGB 8-bit | 3a0b5a62fa7f27d292d7e87c483a9faea0e7aa70829e6de28b61229a12b509d8 |

Neither image record has a `crop`, so file pixels are product pixels. Conventions as in Part 2
(OpenSeadragon edge coordinates, y down, `q = s * R(theta) * p + (tx, ty)`, theta > 0
clockwise), with p in Webb pixels and q in 2014 pixels. Measured with NumPy, SciPy and Pillow
outside the repository.

### Method

1. Star candidates in both images: luminance minus a Gaussian background (sigma 10 px),
   smoothed, local maxima in a 21 px box above 8 sigma: 2008 in Hubble, 101,418 in Webb (most
   are nebula texture and the far denser near-infrared star field).
2. Coarse transform from the published orientations (theta = -2.6 - 35.0 = -37.6 deg, scale
   about 0.748) and one star pair picked by eye (2014 about (707, 1885), Webb about (3985,
   2090)); it predicted a second bright star within 20 px, which fixes translation and parity.
3. Matching starts from the Hubble candidates only, so every point is a star visible in both:
   a star bright in the near-infrared but faint in visible light never enters. Each Hubble
   candidate is predicted into Webb, the brightest Webb pixel within 40 px is taken, and both
   positions are fit with a 2D Gaussian plus a tilted plane (25 x 25 px boxes), excluding
   saturated pixels, cross-checked against a flux-weighted centroid.
4. Saturation differs from Part 2: Webb star cores plateau at 247 to 254 in the release
   stretch and never reach 255, so a 255 test censors nothing there. The fit excludes pixels
   with any channel >= 245 in Webb and >= 250 in Hubble.
5. Robust iterative similarity (3 x 1.4826 x median) on the 465 good-quality matches: 232
   inliers, RMS 0.715 px (2014).
6. The 18 reported points were picked from the inliers by image quality only, not by
   residual: one per cell of a 4 x 4 grid over the 2014 frame (14 cells hold a usable star),
   plus four more at least 900 px from the others; few clipped pixels, centroid and Gaussian
   agreeing within 0.8 px, no brighter neighbor within 16 Webb px, low local gradient. Each
   pair was inspected in a cutout sheet. Holdouts W16 to W18 were chosen by position before
   the fit.

### Control points (Webb to 2014)

```json
[
  {
    "id": "W01",
    "xWebb": 3884.47,
    "yWebb": 740.24,
    "x2014": 32.44,
    "y2014": 1134.72
  },
  {
    "id": "W02",
    "xWebb": 3064.46,
    "yWebb": 2716.66,
    "x2014": 448.06,
    "y2014": 2684.85
  },
  {
    "id": "W03",
    "xWebb": 2263.96,
    "yWebb": 3575.75,
    "x2014": 364.76,
    "y2014": 3561.82
  },
  {
    "id": "W04",
    "xWebb": 7444.35,
    "yWebb": 3306.16,
    "x2014": 3322.56,
    "y2014": 1033.69
  },
  {
    "id": "W05",
    "xWebb": 5322.33,
    "yWebb": 3712.49,
    "x2014": 2246.28,
    "y2014": 2245.54
  },
  {
    "id": "W06",
    "xWebb": 4130.22,
    "yWebb": 6489.73,
    "x2014": 2805.12,
    "y2014": 4441.64
  },
  {
    "id": "W07",
    "xWebb": 3458.7,
    "yWebb": 8591.47,
    "x2014": 3368.95,
    "y2014": 5999.52
  },
  {
    "id": "W08",
    "xWebb": 8115.51,
    "yWebb": 3952.68,
    "x2014": 4016.98,
    "y2014": 1111.48
  },
  {
    "id": "W09",
    "xWebb": 7221.69,
    "yWebb": 5137.85,
    "x2014": 4027.27,
    "y2014": 2224.89
  },
  {
    "id": "W10",
    "xWebb": 4038.54,
    "yWebb": 9360.93,
    "x2014": 4064.83,
    "y2014": 6191.39
  },
  {
    "id": "W11",
    "xWebb": 8343.52,
    "yWebb": 7096.96,
    "x2014": 5589.81,
    "y2014": 2877.11
  },
  {
    "id": "W12",
    "xWebb": 8325.33,
    "yWebb": 8807.81,
    "x2014": 6360.45,
    "y2014": 3902.64
  },
  {
    "id": "W13",
    "xWebb": 7072.32,
    "yWebb": 10649.75,
    "x2014": 6457.67,
    "y2014": 5570.98
  },
  {
    "id": "W14",
    "xWebb": 6183.32,
    "yWebb": 1545.66,
    "x2014": 1767.81,
    "y2014": 563.27
  },
  {
    "id": "W15",
    "xWebb": 7798.77,
    "yWebb": 2049.53,
    "x2014": 2958.18,
    "y2014": 124.31
  },
  {
    "id": "W16",
    "xWebb": 4826.81,
    "yWebb": 7592.26,
    "x2014": 3724.84,
    "y2014": 4779.69,
    "holdout": true
  },
  {
    "id": "W17",
    "xWebb": 5091.63,
    "yWebb": 2130.9,
    "x2014": 1385.85,
    "y2014": 1410.28,
    "holdout": true
  },
  {
    "id": "W18",
    "xWebb": 6211.58,
    "yWebb": 8536.51,
    "x2014": 4980.14,
    "y2014": 4708.21,
    "holdout": true
  }
]
```

### Fit (15 points, W01 to W15)

| Quantity | Value |
|---|---|
| scale | 0.750077 (2014 px per Webb px) |
| rotationDeg | -37.5464 (Webb turned counterclockwise onto 2014) |
| tx, ty | -2616.17, 2470.32 (2014 px; where Webb corner (0, 0) lands) |
| RMS residual | 0.58 px (2014) = 0.77 px (Webb) = 0.023 arcsec |
| worst residual | 1.45 px (W06) |
| leave-one-out RMS | 0.66 px, worst 1.59 px |
| holdouts W16, W17, W18 | 0.54, 0.09, 0.53 px (RMS 0.44 px) |
| all 232 inliers under this fit | RMS 0.75 px, 95th percentile 1.51 px, worst 1.91 px (0.077 arcsec) |

Independent recomputation: linear least squares on (a, b, tx, ty) in a scratch script and
`scripts/register-pair.ts` (closed form in `src/content/registration.ts`) agree to 6e-9 px.

| id | use | dx | dy | r |
|---|---|---|---|---|
| W01 | fit | -0.13 | 0.24 | 0.27 |
| W02 | fit | 0.01 | 0.32 | 0.32 |
| W03 | fit | -0.07 | 0.17 | 0.18 |
| W04 | fit | -0.28 | 0.02 | 0.29 |
| W05 | fit | -0.25 | -0.21 | 0.33 |
| W06 | fit | 1.43 | 0.24 | 1.45 |
| W07 | fit | -1.05 | -0.77 | 1.30 |
| W08 | fit | -0.04 | -0.07 | 0.08 |
| W09 | fit | -0.15 | -0.09 | 0.17 |
| W10 | fit | -0.38 | -0.08 | 0.39 |
| W11 | fit | -0.02 | -0.00 | 0.02 |
| W12 | fit | 0.55 | 0.24 | 0.60 |
| W13 | fit | 0.11 | 0.06 | 0.13 |
| W14 | fit | -0.20 | -0.13 | 0.24 |
| W15 | fit | 0.47 | 0.06 | 0.47 |
| W16 | holdout | -0.06 | -0.54 | 0.54 |
| W17 | holdout | 0.04 | -0.08 | 0.09 |
| W18 | holdout | -0.21 | -0.48 | 0.53 |

Higher-order models on the 232 inliers: affine RMS 0.713, quadratic 0.675, cubic 0.670 px. The
mean residual per quadrant of the 2014 frame is at most 0.21 px. No shear, distortion or
per-detector offset is left to model, unlike the 1995 mosaic: one similarity is enough.

### Plausibility against the published orientation and pixel scale

- Rotation: page values give -2.6 - 35.0 = -37.6 deg; measured -37.546. North in the Webb frame
  (2.6 deg right of up) lands at 34.95 deg left of up in 2014. Matches within 0.06 deg.
- Scale: page fields give 4.21' / 8423 = 0.029989"/px for Webb and 4.53' / 6780 = 0.040088"/px
  for 2014, ratio 0.7481; from the heights 7.30' / 14589 and 4.72' / 7071, 0.7496. Measured
  0.75008: +0.27 % and +0.06 %. Rounding the fields to 0.01' allows about +-0.23 % on the
  width ratio, so the width figure sits just outside it and the height figure inside. Within
  the 0.5 deg / 2 % gate.
- Measured Webb pixel scale with the 2014 scale: 0.04009 x 0.75008 = 0.0301"/px (0.0300 with
  the height). The staged image record states 0.03 arcsec/px from this.
- No reflection: 232 stars at 0.75 px RMS rule out a parity flip.

### Overlap

Webb corners in 2014 pixels: (0, 0) to (-2616.2, 2470.3); (8423, 0) to (2393.0, -1379.8);
(8423, 14589) to (9061.7, 7296.3); (0, 14589) to (4052.5, 11146.5). Webb is larger than the
2014 frame but turned 37.5 deg against it, so it covers 83.6 % of the 2014 frame, not all of
it. Overlap in 2014 pixels:

```json
[[0, 459.5], [597.8, 0], [3453.6, 0], [6780, 4327.8], [6780, 7071], [920, 7071], [0, 5874.1]]
```

Three corners of the 2014 frame have no Webb data: a large triangle at the top right (x >
3453.6 on the top edge down to y = 4327.8 on the right edge) and two small ones at the top
left and bottom left. On the Webb side of the divider those show the viewer background. The
overlap is 58 % of the Webb frame; the rest is unreachable in Compare because the home bounds
stay the reference's (architecture-compare.md, section 9).

No footprint and no crop on the Webb image: it holds data to every edge (no black blocks;
0.05 % of pixels have every channel <= 3, scattered, not traced). The 2014 frame's bounding
box in Webb pixels spans every column and rows 0 to 12497, so a crop would save at most 14 %
of the tiles and would change the moving pixel origin; not needed for the registration.

### Verdict on a single similarity

Correct. RMS 0.58 px (2014) = 0.77 Webb px = 0.023", holdouts 0.44 px, 95 % of 232 stars within
1.51 px (0.06"): under the 1 moving pixel bar. The remaining scatter is consistent with
centroid noise on saturated cores plus 7.9 years of stellar proper motion (Sep 2014 to Aug
2022; a field star at 5 mas/yr moves 0.04", 1 px of 2014). W06 and W07 (1.3 to 1.45 px) may be
such stars.

### Not checked

- Stellar proper motions (no catalog cross-match).
- Saturation thresholds 245 and 250 are read from the core plateaus, not from the processing
  notes; a centroid of a flat-topped core still depends on the PSF being symmetric.
- Whether any Webb control star is an unresolved blend in Hubble (the cutouts show none).
- The near-black pixels in Webb (0.05 %) were not mapped; they are assumed to be dark sky or
  dense dust, not missing data.
- Pair caveats, labels, headline, `alignment`, `whatDiffers` and `differs` are left for the
  physicist; the image record's `productType` (mosaic) is unverified.

## Part 5. Pillars of Creation: Hubble 2014 and Webb 2022 pair, and the Pillars Journey (2026-11-17)

Physics review for C-05 and the Journey draft. Status: **draft**, awaiting the validate ritual.
Pages fetched on 2026-11-17 (raw HTML read for the ESA releases); pixels inspected on the two
cached originals with the Part 4 similarity applied (Webb resampled into the 2014 frame).

### Records written

- `data/staging/pairs/pillars-hubble-2014-webb-2022.json`: headline, labels, caveats,
  alignment, whatDiffers.
- `data/staging/images/pillars-webb-2022-nircam.json`: caveats; productType status.
- `data/staging/journeys/pillars.json`: eight stops on the 2014 image; stops `webb` to
  `your-turn` carry `compare` with the Webb pair, `hubble-1995` with the 1995 pair.

### Headline

"Different light, not a change in the pillars" replaces "Different light, not different time".
Reason: `differs.date` is true (September 2014 to 14 August 2022, 7.9 years), so "not different
time" is literally false. What the wipe shows is dominated by band: the upper bound on real motion
over 8 years is about 0.16 arcsec (compare-and-light.md, Compare B, `supported`), and in a wipe it
cannot be separated from features that look different in each band. The headline states which
difference dominates, as architecture-compare.md section 5 asks.

### `differs` flags

| Flag | Value | Reasoning | Status |
|---|---|---|---|
| instrument | true | WFC3/UVIS against NIRCam | verified (Part 1, Part 3) |
| band | true | 502, 657, 673 nm against 0.9 to 4.7 µm | verified |
| date | true | Sep 2014 against 14 Aug 2022 | verified (NASA pages) |
| illumination | false | The nebula is lit by the same nearby stars in both; nothing like a Sun angle changes | supported |
| geometry | false | Low Earth orbit against L2, a baseline of about 1.5 million km, about 0.01 au: parallax at 6,500 light-years is microarcseconds. Rotation and scale are removed by the registration | supported (computed) |
| processing | true | Two teams, separate stretches, stars clipped in both (Part 2, Part 4) | verified |

Confirmed as staged; no flag changed.

### Claims

| Claim (where used) | Status | Source or check |
|---|---|---|
| Webb covers about 84% of the 2014 frame; no data in a large top-right and two small top-left, bottom-left corners (pair caveat, stop `webb`) | verified | Part 4 overlap 83.6 %; seen on the warped Webb image |
| Aligned to about 0.02", all 232 stars within 0.08" (pair caveat, alignment) | verified | Part 4: RMS 0.58 px x 0.0401"/px = 0.023"; worst 1.91 px = 0.077" |
| Gas moves too little in 8 years to tell apart from band in a wipe | supported | compare-and-light.md Compare B (0.16" upper bound, from a secondary speed) |
| Near-infrared passes dust more easily; visible light bounces off and is absorbed by dust | verified | NASA Infrared astronomy explainer: "Visible light's short, tight wavelengths are prone to bouncing off dust particles"; "Longer wavelengths of infrared light slip past dust more easily"; "Dust absorbs ultraviolet and visible light". ESA/Webb wordbank says the same |
| Grain size comparable to visible wavelengths as the reason | not used | No primary source fetched; the stop text keeps to the NASA wording |
| Webb's mirror collects more than six times Hubble's light | verified | NASA "Hubble vs. Webb": "more than six times the light collecting area" |
| Extra stars are not new | supported | Stars do not form and brighten in 8 years at this rate; the Webb release attributes the view to near-infrared and the star population, not to change |
| No galaxies in the view; the Milky Way's gas and dust block it | verified | weic2216: "there are no galaxies in this view. Instead, a mix of translucent gas and dust known as the interstellar medium stands in the way" |
| Pillars partly see-through in near-infrared | verified | weic2216: "appear – at times – semi-transparent in near-infrared light" |
| Webb filters invisible to the eye | verified | NASA Visible light: the eye detects "380 to 700 nanometers"; shortest Webb filter is 900 nm |
| Webb colors in wavelength order, purple to red | verified | NASA asset "Color Info"; ESA wavelengths (Part 3) |
| Hubble colors: oxygen blue, hydrogen (with nitrogen) green, sulfur red | verified | NASA 2014 asset page; F657N passes [N II] (Validation) |
| Diffraction spikes come from each telescope's structure | verified | NASA "Webb's Diffraction Spikes" (primary mirror and struts); NASA "Hubble Spies a Star-Studded Cluster" (Hubble's secondary-mirror supports) |
| Star cores saturated in both releases | verified (2014), supported (Webb) | Part 2: every 2014 core reaches 255; Part 4: Webb cores plateau at 247 to 254 |
| Webb productType mosaic | supported | Field 4.21 x 7.30' = 30.7 arcmin² (ESA weic2216b) against 9.7 arcmin² per NIRCam pointing (JDox, NIRCam Imaging); NASA "a composite of separate exposures". Pointing count not read from the program |
| Eagle Nebula, Messier 16, 6,500 light-years (stop `where`) | verified | heic1501 and weic2216 both say 6,500 light-years |
| New stars forming inside the pillars | verified | heic1501: "newborn stars ... can be seen forming within the pillars themselves" |
| View about 8.5 light-years across | supported | Computed: 4.53' x 6,500 ly = 8.6 ly; depends on the distance. NASA gives "approximately 8 light-years across" for the narrower Webb image (4.21') |
| UV from massive young stars makes the gas glow and is why Hubble sees the pillars (stop `edges`) | verified | heic1501: "they are also the reason Hubble sees the structures at all. They radiate enough ultraviolet light to illuminate the area and make the clouds of oxygen, hydrogen and sulphur glow" |
| Haze at the edges is material heated and evaporating; "pillars of destruction" | verified | heic1501 (the release says "bluish haze"; in this rendering the rim is green-yellow, so the stop says "glowing haze") |
| 1995 vs 2014: sharper and wider; colors, filters, processing differ; alignment 0.1 to 0.3" (stop `hubble-1995`) | verified | heic1501 "even sharper and wider view"; approved 1995 pair record |
| Four bright Webb stars at 2014 px (4365, 4774), (4421, 4648), (4527, 4808), (4599, 4683); Hubble shows two as faint red dots, the other two not at all (stop `hidden-stars`) | verified | Measured: Hubble 9 x 9 max 201 and 188 against local medians 69 and 74 at the first two; 116 and 117 against 99 and 91 at the others (noise level); inspected 1:1 |
| Dust dims blue more than red more than near-infrared, so the light reaching Hubble looks red | supported | Follows from the NASA explainer wording on wavelength; the dots are red in the composite (more F673N than F502N) |
| Inside or behind the dust is not decidable from these images | assumption | No distance or spectral data used |
| Red glow at the middle pillar tip, centered near 2014 px (3965, 2075) (stop `red-glow`) | verified | Red-excess mask on the warped Webb image: centroid (3960, 2029), box x 3913 to 4026, y 1968 to 2181 |
| Webb red is F470N, molecular hydrogen | verified | NASA "Red: F470N"; ESA "molecular hydrogen 4.7 um red" |
| The glow is from energetic hydrogen molecules from jets and shocks of forming stars | supported | weic2216 states it for "the crimson glow" in general and names "the second and third pillars from the top"; applying it to this particular patch is ours |
| Hubble red at the same place is sulfur | verified | Red excess in the 2014 image around (3994, 2060); red is F673N [S II] |

### Webb image caveats

Assigned colors, invisible filters; saturated cores; spikes from mirror and struts; no
galaxies. `productType` stays `mosaic`, status raised from `unverified` to `supported`.

### Viewports

Chosen from the pixels (2014 frame, full resolution, x and y the view center): `where` and
`webb` and `your-turn` at the fit view; `edges` (2550, 1150, z 5) on the left pillar's top;
`hubble-1995` (3550, 2370, z 1.6) on the 1995 footprint (corners from Part 2); `more-stars`
(1300, 1600, z 5) on open sky left of the left pillar, inside the Webb overlap;
`hidden-stars` (4478, 4729, z 8) on the mean of the four stars, marker r 170 covering them;
`red-glow` (4000, 2100, z 6), marker on the red-excess centroid.

### Not used

- The heated fragment at the top of the left pillar (heic1501): its exact position is not
  given, so no stop points at it.
- Webb's "bright red orbs" (protostars): not located in the pixels, so not pointed at.
- Any statement that Webb is sharper: NIRCam's long-wavelength filters are coarser than WFC3 in
  visible light, and the per-filter resolution was not checked.

### Open

- Which pillars weic2216 means by "the second and third pillars from the top".
- Per-filter Webb exposure dates and the number of pointings (MAST, program 2739).
- Whether the compare `split` reads as intended on a phone, where the divider covers less.

### Revision after validation (2026-11-18)

Verdict: accepted with caveats. Fixes applied to the three staged records:

1. Stop `where`: "about 8.5 light-years wide", derived (4.53' at 6,500 ly = 8.6 ly), `supported`.
2. Stop `edges`: "the reason Hubble sees the pillars at all" dropped.
3. Webb filters: "mostly near-infrared; the shortest, at 0.9 µm, sits just past the red end of
   what our eyes see" (stop `webb`, image caveat, pair caveat, whatDiffers). Disagreement kept on
   record: the review asked for "at the edge of visible light". F090W spans 788 to 1024 nm (SVO
   Filter Profile Service, fetched 2026-11-18) and NASA puts the eye's range at 380 to 700 nm, so
   the filter lies wholly outside the visible band; "just past the red end" is the physically
   correct form of the same point. `verified`
4. More stars: the biggest cause added. Hubble's filters are narrowband, effective widths
   F502N 6.5 nm, F657N 12.1 nm, F673N 11.8 nm; Webb's broad ones are F090W 177 nm, F200W 419 nm,
   F444W 1068 nm (SVO, `verified`). A narrowband filter passes a correspondingly small share of
   a star's continuum, while the line emission of the nebula stays bright (`supported`, from the
   widths). "Not new" became "they were already there in 2014"; "far more" became "more" (no star
   count was made).
5. Stop `hidden-stars`: pixel claims cite the two images (heic1501a, weic2216b); measured by the
   physicist, checked by the mathematician, `verified`. The reddening sentence was reworded to
   what the NASA explainer says (longer wavelengths slip past dust more easily). The "red dots"
   description stays an observation, with no cause stated.
6. Stop `red-glow`: viewport (3930, 2120, z 6) from the review, marker kept. Placement softened to
   the ESA wording ("especially in the second and third pillars from the top"); that this patch is
   one of them stays `supported`. Note: on a full-width 16:9 view at z 6 the top-right corner
   would still fall outside Webb data; the review measured the desktop layout with the story
   column, so the value is taken from it.
7. Stop `your-turn` and the colors caveat: "a red glow"; small red dots in Webb are mostly young
   stars still in dust (weic2216: "bright red orbs" are newly formed protostars; "mostly" is
   `supported`).
8. Pair caveat 3: the fastest jets may move a few Hubble pixels in 8 years (about 0.16", 4 px, at
   a typical literature jet speed: `assumption`), but the pictures record different light, so a
   wipe cannot show it.
9. Alignment: "95% of 232 well-measured stars within 0.06 arcsecond" (Part 4); "all" and "at
   most" dropped.
10. Saturation caveat: Part 2 (every 2014 core reaches 255 in a channel) and Part 4 (Webb cores
    plateau at 247 to 254), measured on the files. Spike caveat: NASA "Webb's Diffraction Spikes"
    (primary mirror and struts) and NASA "Hubble Spies a Star-Studded Cluster" (Hubble's
    secondary-mirror supports), fetched 2026-11-17.

`tsx scripts/validate-content.ts development`: Content OK.

## Validation of C-05 (2026-11-18)

Verdict: accepted with caveats. Reviewed independently by the reviewer (sources and quotes),
the mathematician (registration, viewports, coverage, distances) and the physicist (physical
meaning, pixel checks), against Parts 3 to 5 and the sources they cite.

- The reviewer rejected the hidden-stars stop as first drafted, for want of a source; the
  physicist and the mathematician confirmed its four stars in the pixels of both originals, so
  the stop now cites the images themselves.
- Ten fixes were applied before approval (Part 5, "Revision after validation"), among them: the
  width marked as derived, Webb's shortest filter placed just past visible red, Hubble's
  narrowband filters named as the main reason it shows fewer stars, "already there in 2014"
  instead of "not new", the red-glow viewport moved to (3930, 2120, z 6) so the view stays
  inside Webb's data, the jet-motion caveat rewritten, and the alignment stated for the 232
  well-measured stars.
- Caveats users see: Webb covers about 84% of the Hubble frame; the wipe compares different
  light 7.9 years apart and cannot show motion; colors are assigned differently in each image;
  star cores are saturated in both.

