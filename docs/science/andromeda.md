# Andromeda panorama: validation record

Image: Hubble M31 PHAT+PHAST panorama, ESA heic2501a, released 2025-01-16.
Checked on 2026-11-17 against the release pages, the image metadata and an independent
recomputation from the tiles. Verdict: **accepted with caveats**.

## Facts the app may state

| Claim | Value | Status | Source |
|---|---|---|---|
| Target | M31, the Andromeda Galaxy | verified | ESA heic2501, NASA asset page |
| Distance | about 2.5 million light-years | verified | ESA release text ("approximately 2.5 million light-years"); ESA's metadata table says 2 million, so cite the release text |
| Observatory and camera | Hubble, Advanced Camera for Surveys (ACS) | verified | NASA asset page ("Instrument: ACS"), ESA release text, Dalcanton et al. 2012. ESA's metadata table says WFC3, which contradicts both |
| Filters and assigned colors | F475W shown blue, F814W shown yellow | verified | NASA asset page |
| Observations | July 2010 to December 2022 | verified | NASA asset page |
| Release | 2025-01-16, heic2501a | verified | ESA, NASA |
| Product | mosaic of about 600 fields of view | verified | ESA release |
| Resolved stars | about 200 million | verified | ESA release |
| Original size | at least 2.5 billion pixels | verified | ESA release |
| Size shown | 42208 x 9870 px, quarter-resolution rendition | verified | NASA asset page, ESA image page, recomputed from tiles |
| Field of view | 140.60 x 32.88 arcmin | verified | ESA image metadata |
| Orientation | north is 125.0 degrees right of vertical | verified | ESA image metadata |
| Pixel scale of the file shown | about 0.20 arcsec per pixel | derived: 140.60 x 60 / 42208 = 0.1999, and 32.88 x 60 / 9870 = 0.1999 | computed from the two rows above; not published |
| Credit | NASA, ESA, Benjamin Williams (UWashington), Zhuo Chen (UWashington), L. Clifton Johnson (Northwestern); Image Processing: Joseph DePasquale (STScI) | verified | NASA asset page |
| Terms | ESA copy CC BY 4.0; NASA copy under NASA media guidelines | verified | esahubble.org/copyright, nasa.gov brand center |

## Caveats users must see

- Colors are assigned to two filters, not natural color.
- The mosaic covers the disk, not the whole galaxy; the black stepped border is where no
  data were taken, not structure.
- The viewer shows a quarter-resolution rendition, not the 2.5 billion pixel original.
- Color describes regions on average (bluer where young stars dominate, yellower where
  older stars do, brown dust lanes); a single dot's color does not give one star's age or
  temperature.
- The bright bulge is the blended light of many stars, not one object.

## Not stated

- "Spiral galaxy": not found on the pages read.
- Bright spiked stars being Milky Way foreground stars: an assumption, not checked.
- The six-band survey ("UV to near-IR") describes PHAT and PHAST, not this image.

## Tiling (recomputed)

Levels 0 to 6 at 256 px tiles; grids 3x1, 6x2, 11x3, 21x5, 42x10, 83x20, 165x39, matching
OpenSeadragon 5.0.1. The tiler rounds level sizes to the nearest pixel, so levels 0 and 1
are 154 and 308 px high. Zoom shown to users is relative to fit:
`(viewportWidth / visibleWidth) / min(viewportWidth / W, viewportHeight / H)`.

## Correction

`docs/science/compare-and-light.md` estimates the Pillars jet motion as about 0.17 arcsec;
recomputed, it is about 0.16 arcsec (328 AU at 1993 pc), as an upper bound.
