# Nili Patera dunes: sources, registration and Journey

Science record for the HiRISE pair PSP_004339_1890 (30 June 2007) and PSP_005684_1890
(13 October 2007) and the Mars Journey `nili-patera`, from the checks of 2026-11-17. Working
files are not in this repository. Records live in `data/staging/` with validation status
`draft`: the pair is accepted with caveats, the Journey copy is pending review.

## Sources

- Product pages: https://www.uahirise.org/PSP_004339_1890 and https://www.uahirise.org/PSP_005684_1890
  (dates, geometry, usage policy; read raw).
- Products and labels, same folder for both:
  https://hirise-pds.lpl.arizona.edu/PDS/DTM/ESP/ORB_017700_017799/ESP_017762_1890_ESP_018039_1890/
  (`*_RED_C_01_ORTHO.JP2` and `.LBL`). Both are orthorectified by the HiRISE team against one
  terrain model (SOCET Set 5.4.1), so they share one grid.
- HiRISE team release of this pair: https://pds-rings.seti.org/press_releases/pages/PIA12xxx/PIA12860.html
  ("The three images on the left are excerpts from a June 30, 2007, observation ... The three on the
  right are of the same ground observed 15 weeks later, on Oct. 13, 2007").
- Bridges et al. 2012, Nature 485, https://doi.org/10.1038/nature11022, which used this pair.
- Credit: "NASA/JPL-Caltech/UArizona". Usage: "within the public domain ... We do ask for a credit
  line where possible" (usage block of each product page). The separate usage-policy page was
  not opened.

## Products

| | PSP_004339_1890 | PSP_005684_1890 |
|---|---|---|
| File | RED_C_01_ORTHO.JP2, 30,767,933 bytes | RED_C_01_ORTHO.JP2, 18,200,032 bytes |
| SHA-256 | cf90159b...dc11 | f0634bca...3451 |
| Size | 7035 x 15282 px | 7035 x 15282 px |

Grid (both labels): equirectangular, planetocentric, radius 3396.04 km, 1.0114 m/px, 8 bit,
red filter (700 nm), north up. The scale is true at latitude 5 degrees; the scene lies at
8.65 to 8.91 degrees N, so east-west ground scale is 0.4% smaller. Ignored here. The 0.25 m/px
versions are over 135 MB and were not used.

## Registration (verified on the pixels)

Both files were decoded at full resolution. The grid is identical, so the transform is the
identity (`transform: "none"`). Measured by cross-correlation on 344 bedrock tiles of 128 px:

- Residual on bedrock: median 0.27 m (0.263 px), 95th percentile 0.55 m (0.545 px).
- No scale or rotation error (slopes up to 0.02 px per 1000 px).
- At coarser scales bedrock appears shifted by up to about 2 px toward the northeast. This is the
  change in shading with incidence, not a grid error.

Overlap polygon in product pixels (edge coordinates, origin top-left):
[[3975,4310],[4601,9647],[1300,10057],[667,4716]], 17.9 Mpx, about 18 km2, 16.7% of the frame.
PSP_004339 has data gaps (value 0) inside the overlap near x 3390-3654 y 4532-4577,
x 3413-3677 y 4723-4763 and x 1406-1670 y 6257-6298.

## Crop used by the app

Both images are cut to the bounding box of the overlap, product x 667-4601, y 4310-10057
(3934 x 5747 px). The image records carry `crop` (`x: 667, y: 4310`): add it to a pixel of the
tiled image to get the product pixel. The `footprint` of both images is the overlap polygon in
cropped coordinates: [[3308,0],[3934,5337],[633,5747],[0,406]].

## Change between the dates

- Sand surface (ripples): shifted a median 1.6 to 2.0 m (95th percentile 3.4 to 3.6 m) toward
  bearing 240 degrees (west-southwest), in 105 days, 3 times the bedrock 95th percentile. Not an
  illumination artifact: the shading shift on bedrock points northeast and grows with scale, the
  sand shift points the opposite way and is about the same at every scale.
- Published: ripples moving "up to 4.5 m" in 105 days (Bridges et al. 2012, same pair). Ripple
  wavelength about 4.6 m, a few pixels at 1 m/px. Individual tiles can alias; the median is the
  number to use.
- Dune bodies: no measurable motion apart from isolated avalanches (new grainflow streaks on slip
  faces in October). One slip-face brink advanced 0.6 m or less, at the residual level. The paper
  gives lee-front rates of 0.18 to 0.92 m/yr.
- Slip faces point southwest, so the prevailing winds are northeasterly (inferred from shape).

## What differs without being change

- Incidence 53.8 and 39.1 degrees; sun bearing 230 and 238 degrees; solar longitude 267.5 and 330.0.
- Emission 0.4 and 4.4 degrees: up to about 1 m of parallax on moving slopes (the terrain model
  comes from 2010 images).
- A separate 8-bit stretch per product (A: I/F = 0.0905 + 6.04e-5 DN, B: 0.0971 + 1.48e-4 DN), so
  brightness cannot be compared.
- Footprints overlap only partly (16.7% of the frame).

## Caveats shipped with the images and the pair

- The pair note says what differs and gives the alignment limit (0.27 m median, 0.55 m at the
  95th percentile).
- Each image says its brightness stretch is its own and how to trace a pixel to the product.
- The 2007-06-30 image says the thin black bars are gaps in the data.

## Journey `nili-patera`

Six stops (where, dunes and wind, ripples, ripples moved, dunes stayed, your turn), positions
in cropped pixels. The coordinates of the dune stops come from the crops checked on the pixels.

- The "about 2 meters" in the fourth stop is our measurement above. It has no https source of its
  own; the stop cites the paper and the team release for the published figures.
- The wind direction is inferred from the slip faces, not measured.
- Pending review: every stop is `draft`.

## Validation (2026-11-17)

Verdict for the pair: accepted with caveats. Verdict for the Journey copy: pending review.

Not checked: the usage-policy page itself, the emission azimuth (not in the labels), a dark
streak on bedrock in the October image (seen, not measured), and whether the product release date
is published (the source records carry none).
