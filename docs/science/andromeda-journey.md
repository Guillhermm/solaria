# Andromeda Journey: validation record

Content: `data/journeys/andromeda.json`, seven stops over the Hubble M31 PHAT+PHAST
panorama. Checked on 2026-11-17 against the release pages (re-read in full), sky
coordinates from the NASA/IPAC Extragalactic Database (NED) projected onto the image, and
the tiles themselves. Verdict: **accepted with fixes**; the shipped text includes every fix.

## Sources

- NASA image page: https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/
- ESA release heic2501: https://esahubble.org/news/heic2501/
- Image record and caveats: `docs/science/andromeda.md`

## Positions

The core and M32 were located as brightness peaks in the tiles, and NED coordinates were
projected with the field of view, center and 125 degree north angle from the image
metadata. A fit on those two control points gives 0.200 arcsec per pixel with normal sky
parity.

| Stop | Center (px) | Zoom | Check |
|---|---|---|---|
| whole-galaxy, your-turn | 21104, 4935 | 1 | image center |
| central-core | 17461, 5600 (marker on the core at 17461, 6482) | 6 | core within 83 px of NED |
| dust-lanes | 13190, 7935 | 10 | the broad lane south of the core, seen in the tiles |
| m32 | 11412, 2448 | 12 | within 53 px of NED |
| ngc-206 | 5330, 7260 | 15 | within 44 px of the fitted NED position, on the blue star cloud |
| toward-single-stars | 26880, 3586 | 29 | 1:1 at a 1440 px wide viewport is z 29.3; higher zoom only magnifies |

On a phone the viewer keeps each view inside the image, which moves some features off
center by up to 243 CSS px; all stay on screen.

## Corrections made to the draft

- A quoted line ("200 million stars that are hotter than our Sun") is on neither page; the
  pages say "about 200 million stars" and that only stars "brighter than our Sun" are
  detected.
- "Single stars" overstated what this view shows: at about 0.20 arcsec per pixel many
  specks blend several stars. The stop now says so.
- "From a whole galaxy" contradicted the disk-only coverage; the closing stop now says
  "from Andromeda's disk".
- "Older stars dominate the core" became NASA's wording: yellowish older stars toward the
  center, young blue stars around the outer rim.
- "Brown" dust lanes is not source wording; the pages say "dark". The image record now says
  "dark" too.
- M32 sits upper left of the center, not near the top edge.
- The dust stop moved from a faint patch in the bulge onto a real lane.
- The whole-image stops were centered on the image.

## Statuses

Every sentence is verified against the NASA or ESA page, except two that are supported:
the general statement that dust blocks part of the light behind it (standard physics, not
on the Andromeda pages), and the reading of color by region, which rests on NASA's own
description.
