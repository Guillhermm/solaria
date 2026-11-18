# Nili Patera dunes: sources, registration and Journey

Science record for the HiRISE pair PSP_004339_1890 (30 June 2007) and PSP_005684_1890
(13 October 2007) and the Mars Journey `nili-patera`, from the checks of 2026-11-17. Working
files are not in this repository. Records live in `data/staging/` with validation status
`approved` after science review: verdict accepted with caveats for the pair and for the Journey copy.

## Sources

- Product pages: https://www.uahirise.org/PSP_004339_1890 and https://www.uahirise.org/PSP_005684_1890
  (dates, geometry, usage policy; read raw).
- Products and labels, same folder for both:
  https://hirise-pds.lpl.arizona.edu/PDS/DTM/ESP/ORB_017700_017799/ESP_017762_1890_ESP_018039_1890/
  (`*_RED_C_01_ORTHO.JP2` and `.LBL`). Both are orthorectified by the HiRISE team against one
  terrain model (Socet_Set 5.5.0), so they share one grid.
- HiRISE team text on this pair (credits S. Silvestro, L. K. Fenton and D. A. Vaz, LPSC 2010, not Bridges et al.): https://pds-rings.seti.org/press_releases/pages/PIA12xxx/PIA12860.html
  ("The three images on the left are excerpts from a June 30, 2007, observation ... The three on the
  right are of the same ground observed 15 weeks later, on Oct. 13, 2007").
- Bridges et al. 2012, Nature 485, https://doi.org/10.1038/nature11022, which used this pair.
- Credit: "NASA/JPL-Caltech/UArizona", as asked on each product page. Usage: "within the public
  domain ... We do ask for a credit line where possible". The usage-policy page
  https://www.uahirise.org/media/usage.php says the same but asks "NASA/JPL/University of Arizona";
  the records use the product-page form and point `terms.url` at the policy page. PIA12860 has a
  different credit line, which applies only if that graphic is shown (it is not).
- Release date: none is published for these products (no field on the product pages or labels). A
  directory timestamp (10 July 2012) is a file date, and the RDR label creation date is a
  reprocessing; neither is used, so `releasedAt` is null.

## Products

| | PSP_004339_1890 | PSP_005684_1890 |
|---|---|---|
| File | RED_C_01_ORTHO.JP2, 30,767,933 bytes | RED_C_01_ORTHO.JP2, 18,200,032 bytes |
| SHA-256 | cf90159b...dc11 | f0634bca...3451 |
| Size | 7035 x 15282 px | 7035 x 15282 px |

Grid (both labels): equirectangular, planetocentric, radius 3396.04 km, 1.0114 m/px, 8 bit,
red filter (700 nm), north up. The scale is true at latitude 5 degrees; the scene lies at
8.65 to 8.91 degrees N at 67.33 degrees E (label CENTER_LONGITUDE), so east-west ground scale is 0.8% smaller (1.0034 m/px at 8.79 degrees N). Ignored here. The 0.25 m/px
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
The overlap is a parallelogram of about 3.4 x 5.4 km; 4 x 6 km is its bounding box. PSP_004339
has data gaps (value 0) inside the overlap near x 3390-3654 y 4532-4577 and x 3413-3677 y 4723-4763
(top) and x 1406-1670 y 6257-6298 (upper left of the crop). PSP_005684 has a strip of no data up
to 6 px wide along part of its right edge inside the polygon.

## Crop used by the app

Both images are cut to the bounding box of the overlap, product x 667-4601, y 4310-10057
(3934 x 5747 px). The image records carry `crop` (`x: 667, y: 4310`): add it to a pixel of the
tiled image to get the product pixel. The `footprint` of both images is the overlap polygon in
cropped coordinates: [[3308,0],[3934,5337],[633,5747],[0,406]].

## Change between the dates

- Sand surface (ripples): the ripple pattern shifted a median 1.6 to 2.2 m, depending on the method,
  toward bearing 240 degrees (west-southwest), in 105 days, about 3 times the bedrock 95th
  percentile. This is the cross-correlation shift of the pattern on 128 px tiles, not tracked crests:
  at about half a ripple wavelength a single crest cannot be followed. A second method
  (Lucas-Kanade) gave 2.2 px at bearing 243. Not an
  illumination artifact: the shading shift on bedrock points northeast and grows with scale, the
  sand shift points the opposite way and is about the same at every scale.
- Published: ripples moving "up to 4.5 m" in 105 days (Bridges et al. 2012, same pair). Ripple
  wavelength about 4.6 m, a few pixels at 1 m/px. Individual tiles can alias; the median is the
  number to use.
- Dune bodies: no measurable motion apart from isolated avalanches (new grainflow streaks on slip
  faces in October). One slip-face brink advanced 0.6 m or less, at the residual level. The paper
  gives lee-front rates of 0.18 to 0.92 m/yr, measured over the following 941 days at 11 selected
  fronts, which is 5 to 26 cm in 15 weeks. The paper says they may not represent the whole field.
- Slip faces point southwest, so the prevailing winds are northeasterly (inferred from shape).

## What differs without being change

- Incidence 53.8 and 39.1 degrees; sun bearing 230 and 238 degrees; solar longitude 267.5 and 330.0.
- Emission 0.4 and 4.4 degrees: orthorectification removes parallax for the terrain in the model,
  but the model comes from 2010 images, so a small shift can remain where the sand changed height
  since. The size is not settled (an upper bound of about 1 m against an estimate of 0.1 to 0.15 m
  for a 1 to 2 m height change), so the copy gives no number.
- A separate 8-bit stretch per product (A: I/F = 0.0905 + 6.04e-5 DN, B: 0.0971 + 1.48e-4 DN), so
  brightness cannot be compared.
- Footprints overlap only partly (16.7% of the frame).

## Caveats shipped with the images and the pair

- The pair note says what differs and gives the alignment limit (0.27 m median, 0.55 m at the
  95th percentile; `residualPx` is the 95th percentile, 0.545 px).
- Each image says its brightness stretch is its own and how to trace a pixel to the product.
- The 2007-06-30 image says the thin black bars are gaps in the data; the 2007-10-13 image
  mentions its no-data strip.

## Journey `nili-patera`

Six stops (where, dunes and wind, ripples, ripples moved, dunes stayed, your turn), positions
in cropped pixels. The coordinates of the dune stops come from the crops checked on the pixels.

- The "typically about 2 meters" in the fourth stop is our measurement above and says so. It has
  no https source of its own; the stop cites the paper and the team text for the published figures.
- The wind direction is inferred from the dunes' shape (the paper reports the same), and the stop
  cites the paper.
- Stops 3 and 4 use z 10, which is at or above native resolution on a phone, so both render at
  the viewer's 1:1 cap.
- The barchans stop frames one whole, isolated barchan (2465 to 2795 x 2940 to 3155) at view
  (2265, 3500, z 2.5), marker (2630, 3048, r 250). The whole image holds only four separate
  barchans and no view inside the overlap shows three whole, so the stop describes this one.
  Its slip face points about 250 degrees +/- 10 (west-southwest), measured from the horn tips
  and the crest normal, so its shape implies wind from the east-northeast; the field-wide
  statement above stays southwest and northeasterly.

## Validation (2026-11-17)

Verdict for the pair: accepted with caveats. Verdict for the Journey copy: accepted with caveats,
with the fixes above applied (no overclaim of the shift, the wind as an inference, the caveats
on the Compare stop and the pair note, the 941-day basis of the front rates, the alignment as
a 95th percentile).

Not checked: the emission azimuth (not in the labels), a dark streak on bedrock in the October
image (seen, not measured), the paper's supplementary information, and a general source for
"slip face" and the barchan description.
