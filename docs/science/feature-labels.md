# Feature labels: validation record (F-03)

Content: `data/labels/*.json`. Checked on 2026-11-17. Coordinates are full-image pixels,
origin top-left, x right, y down; the radius is in the same pixels. Verdict: **approved**
for the four labels below, text as shipped.

| id | text | x | y | radius |
|---|---|---|---|---|
| andromeda-core | Andromeda core | 17461 | 6482 | none |
| andromeda-m32 | Satellite galaxy M32 | 11412 | 2448 | none |
| andromeda-ngc206 | NGC 206 | 5330 | 7260 | none |
| sun-ar-13664 | Active region 13664 | 3020 | 2508 | 240 |

## Evidence

- Core: NASA image page (https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/):
  "The outer edges are blue, while the inner two-thirds are yellowish with a bright, central
  core." Position within 83 px of NED (`andromeda-journey.md`, Positions).
- M32: ESA heic2501 (https://esahubble.org/news/heic2501/): "the compact satellite galaxy
  Messier 32". The label is NASA's wording, from the release article's image alt text,
  "(d) The satellite galaxy M32". "Small, fuzzy yellow patch to the upper left": the NASA
  image page, "At 10 o'clock, a smaller dwarf elliptical galaxy forms a fuzzy, yellow blob."
  Position within 53 px of NED.
- NGC 206: NASA release article
  (https://science.nasa.gov/missions/hubble/nasas-hubble-traces-hidden-history-of-andromeda-galaxy/),
  image alt text: "(b) NGC 206, a concentration of bright blue stars". Position within 44 px
  of the fitted NED position.
- Active region 13664: the description is the checked sentence of the Sun Journey stop
  `sdo-ar-photosphere` (`sun-sdo.md`, sections 6 and 7, NOAA SWPC Solar Region Summaries of
  2024-05-10 and 2024-05-11). Position and radius from the measured spot box in `sun-sdo.md`
  section 7. HMI frame pixels; the AIA bands share the grid within 3.5 px, so one file serves
  the seven images of the band set.

## Not checked

- Andromeda labels have no radius: no record gives an extent.
- The area of the region.
