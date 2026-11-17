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
  older stars do, dark dust lanes); a single dot's color does not give one star's age or
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

## Half-resolution file (H-01)

Checked on 2026-11-17 for H-01 step 1 (`docs/architecture.md`, section 15). Verdict:
**do not show**. The quarter set stays. The half file resolves more stars in the outer
disk, but its single 256-color palette cannot carry the smooth bulge: it either bands or
adds grain, and no real bulge pixel of the half file has been checked yet.

Method: a ranged `GET` of bytes 0 to 99,999,999 of the NASA `Half Res (For Display).png`
(206) gave 4,031 complete rows of 19,739 (the top 20% of the image, outer disk and the
stepped no-data border). They were decoded with Python `zlib` and an own PNG unfilter
(filters seen: None, Sub, Up, Paeth). Each 2 x 2 block of the half file was averaged and
compared with the same rows 0 to 2,014 of the quarter TIFF. The bulge lies near half-file
row 12,900, outside the downloaded range, so the bulge was tested by mapping a quarter crop
(rows 5,900 to 6,999, columns 16,600 to 18,399, nucleus and inner dust lanes) onto the half
file's own palette, with and without Floyd-Steinberg dithering (Pillow `quantize`).

| Claim | Value | Status | Source |
|---|---|---|---|
| Palette | one 256-entry palette for the whole image; 255 entries used in the decoded rows; dark grays step 0, 8, 24, 40, 56 | verified | `PLTE` chunk and index histogram of the decoded rows |
| Transparency | `tRNS` makes only index 255 (white) fully transparent; every other entry, including black index 0, is opaque | verified | `tRNS` chunk (255 entries 255, one entry 0) |
| Where it is transparent | no transparent pixel in the decoded rows, including the black stepped no-data border, which is opaque black (index 0) | verified for rows 0 to 4,030 only | decoded rows |
| Index 255 elsewhere | not known; index 1 is also white but opaque, so flattening onto black (section 15) would turn any index-255 pixel inside the footprint, such as a star core, black | unverified | |
| Resolution gain | the half file resolves stars that the quarter blends, in the outer disk | verified | 1:1 crops at matched scale, half rows 3,600 to 3,700 |
| Color error from the palette | quarter-file colors in the decoded rows lie a median 8.8, 99th percentile 19.3, at most 34.5 RGB units (0 to 255 scale) from the nearest palette entry | verified | nearest-entry distance, every 97th footprint pixel |
| Dark sky | faint levels collapse to a few steps (no half-file pixel with mean level 3 to 6, 9 to 12, 15 to 18 or 21 to 24, where the quarter is continuous) | verified | luminance histograms of both files in the footprint |
| Bulge, no dithering | 13,893 colors become 50; the nucleus becomes a flat patch and the gradient falls into contour bands with steps of 4 to 13 levels | supported (simulation on the quarter file, not the half file) | palette-mapped quarter crop |
| Bulge, dithered | low-frequency color kept (8 x 8 block error median 0.6) but per-pixel error up to 32.7 units: grain at pixel scale that reads like unresolved stars | supported (simulation) | same crop |
| Whether the half file is dithered | not known | unverified | |
| Half against quarter at matched scale | the half file is darker by about 8 levels per channel and more saturated (mean saturation 0.60 against 0.51); palette mapping explains only about 1 level and no saturation change, so the two renditions were processed differently | verified (measurement); cause unverified | decoded rows against quarter rows 0 to 2,014 |

Why this misleads: false contour bands in the bulge read as isophotes or structure that is
not in the data, and dither grain at the deepest zoom, the only zoom the half file adds,
reads as stellar texture. Both fall on the bulge and inner dust lanes, the regions users
explore most.

Open items:

- Decode the real bulge rows of the half file (about rows 12,000 to 14,000) to see whether
  it bands or dithers. That needs the stream up to about 0.75 GB, decoded without storing
  it, and is the only check that could turn this verdict into "show with caveat".
- Count index 255 over the whole file before any flattening.
