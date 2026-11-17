# Compare and Light: physical feasibility

Checked 2026-11-17. Statuses: `verified`
(read at a primary source), `supported` (consistent with sources, not checked end to
end), `assumption`, `unverified`. Sources at the end, numbered [n].

## 0. Problems found in the current design

| Finding | Verdict | Status |
|---|---|---|
| Light rail mock (5.7) labels "Ultraviolet, 171 nm" and 7.4 uses `aria-valuetext` "171 nanometers, ultraviolet". AIA 171 is 171 Å = 17.1 nm, extreme ultraviolet (EUV). | implausible, fix to "Extreme UV, 171 Å" | verified [1] |
| "Shows: the corona at about one million degrees" for 171 Å. SDO lists Fe IX, quiet corona and upper transition region, log T = 5.8 (about 630,000 K). | plausible with caveats: say "about 600,000 K" | verified [1] |
| "Visible 617 nm" stop. That is HMI's Fe I 6173 Å line (617.3 nm), photosphere. Correct, but it is HMI, not AIA: say so in the label. | plausible | verified [1] |
| Compare mock "2004, Hubble ACS" vs "2022, Webb NIRCam". The Hubble Pillars releases are 1995 (WFPC2) and 2014 (WFC3). Placeholder text must not survive into a shipped label. | implausible as a label | verified [2][3] |

## 1. Proposed pairs and band sets

### Compare A: Pillars of Creation, Hubble 1995 (WFPC2) vs Hubble 2014 (WFC3)

- **What differs**: camera (WFPC2 vs WFC3), resolution and field (2014 is sharper and
  wider, a mosaic of several pointings), date (about 19 years). Same telescope, and
  ESA/Hubble released it as a comparison of the same region. `verified` [2][3]
- **Real physical change**: ESA/Hubble describes a gaseous fragment at the top of the
  left pillar heated and flying away; Eos reports a jet stretched more than 96 billion
  km at over 700,000 km/h. `verified` [2] for the fragment, `supported` [4] for the
  numbers (secondary source; find the paper before quoting them).
- **Wrong conclusions to prevent**: sharper detail read as change (it is the camera);
  the missing-corner "staircase" of the 1995 frame read as structure (it is the WFPC2
  detector layout) `supported` [5]; the pillars "evaporating visibly" across the whole
  frame (only localized changes are claimed).
- **Why it is the best Compare pair**: the only candidate where a physical change over
  time is published by the source. Matches the brief's "galaxy taken years apart"
  idea in spirit.

### Compare B: Pillars of Creation, Hubble 2014 (WFC3 visible) vs Webb 2022 (NIRCam)

- **What differs**: telescope, band (Hubble visible emission lines of oxygen, hydrogen
  and sulfur [2]; NIRCam F090W to F470N, 0.9 to 4.7 µm [6]), resolution, color
  assignment, date (8 years). Webb NIRCam data were taken in 2022, released
  2022-10-19. `verified` [6][7]
- **Wrong conclusions to prevent**:
  - "Webb found new stars": dust is more transparent in the near infrared, so embedded
    and background stars appear. Same sky, different band. `supported` [2][7]
  - "The pillars thinned between 2014 and 2022": the difference is band, not time.
    Real motion over 8 years at the Eos speed is about 330 AU, about 0.16 arcsec at
    6,500 light-years (recomputed; an upper bound); it exists but cannot
    be separated from band differences in a wipe. `supported` [4][2]
  - "The pillars are red/gold": every color is assigned per filter (F470N red, from
    H2 emission). `verified` [6][7]
- Note text must say "different light, not different time".

### Compare C (optional): Mars, HiRISE repeat imaging of Nili Patera dunes

- **What differs**: date (2007-06-30 vs 2007-10-13, PSP_004339_1890 vs
  PSP_005684_1890), plus illumination, season and viewing angle that change between
  any two HiRISE observations. `verified` for IDs and dates [8]
- **Real change**: ripple and dune migration, meters per year; NASA published an
  orthorectified blink pair with traced crests. `verified` [8][9]
- **Wrong conclusions to prevent**: shadow length or direction changes read as
  topography change; seasonal frost or dust-devil tracks read as landform change;
  off-nadir parallax read as motion. `supported` (standard HiRISE caveat, no single
  source read).
- Use only the team-released orthorectified pair (see section 2).

### Light 1 (recommended first): the Sun from SDO, one instant, AIA + HMI

- **Set**: HMI 6173 Å (photosphere), AIA 1700 Å (UV, temperature minimum), 304 Å
  (He II, chromosphere), 171 Å (Fe IX, about 0.6 MK), 193 Å (Fe XII, about 1.3 MK),
  211 Å (Fe XIV, about 2 MK), 94 Å (Fe XVIII, flaring, about 6 MK). Ordered by
  wavelength on the rail, the temperature sentence in "Shows". `verified` [1]
- **What differs**: band, so height and temperature in the atmosphere. Instrument
  differs only for HMI vs AIA. Frames taken seconds apart. `supported` [1][10]
- **Wrong conclusions to prevent**: AIA colors (gold, green, red) are standard
  colortables on single-band grayscale data, not what an eye would see;
  "Shows" must say "false color". `supported` (AIA colortables are a convention,
  source not read). The Sun "looks bigger" in EUV: off-limb coronal emission, not a
  bigger Sun. Rail order by wavelength is not order by height or temperature
  (304 Å is cooler than 171 Å). `verified` from the temperature table [1].
- **Pick a time with an active region**; a quiet-Sun date makes the hot channels
  nearly empty. `assumption`

### Light 2: Pillars of Creation, Hubble visible / Webb NIRCam / Webb MIRI

- **Set**: Hubble WFC3 visible (2014), NIRCam six filters (0.9 to 4.7 µm), MIRI
  F770W, F1130W, F1500W (7.7 to 15 µm). `verified` for Webb filters [6]; Hubble 2014
  filter IDs `unverified` (release page does not list them; read the MAST header).
- **Wrong conclusions to prevent**: stars "vanish" in MIRI (most stars are faint in the
  mid infrared, dust dominates) `supported` [11]; MIRI looks blurrier because
  diffraction scales with wavelength, not because the camera is worse `supported`
  (λ/D physics, standard); it is one region, observed 2014 and 2022, not one
  instant `verified` [2][6].

## 2. Registration and reprojection load (one engineer)

| Item | Load | Status |
|---|---|---|
| SDO set | Light. AIA level 1.5 puts every channel on 0.6 arcsec pixels, Sun centered, north up [10]; Helioviewer JP2 headers show CDELT 0.6 arcsec [12]. Use frames within one cadence (12 s EUV). | `supported`; whether Helioviewer applies the north-up step is `unverified` |
| Compare A (Hubble 1995 vs 2014) | Moderate. Release images differ in crop and scale; a similarity transform from star control points is enough (proper motion over 19 years is negligible at this scale, `assumption`). ESA's pre-aligned comparison exists [3]. | `supported` |
| Compare B and Light 2 (Hubble vs Webb, NIRCam vs MIRI) | Moderate on release images (control points, affine). **Heavy** if done properly from MAST drizzled FITS with WCS reprojection: different pixel scales, mosaics, field shapes. Do release images only. | `supported` |
| Compare C (HiRISE) | **Too heavy** to do from raw RDRs: sub-meter co-registration needs orthorectification on a DTM (ISIS / SOCET SET pipeline). Feasible only with the HiRISE team's pre-made orthorectified pair [9]. | `supported` |
| Any multi-observatory set (e.g. Crab from radio to X-ray) | **Too heavy**: different resolutions over orders of magnitude, independent WCS. Do not plan. | `assumption` |

## 3. Minimum metadata per image

Each field carries its own source and status; a caption may only state a field that
has one.

1. `target`: name and object type.
2. `observatory`, `instrument`, `camera or channel`.
3. `bands`: filter or channel IDs, central wavelength with the unit the source uses
   (Å, nm, µm), and line or continuum.
4. `colorMapping`: per band the displayed color, or "grayscale" / "standard colortable".
   Never empty: empty would imply natural color.
5. `observedAt`: UTC date or range of the exposures (distinct from `releasedAt`).
6. `releasedAt` and `releaseId` (e.g. heic1501, weic2216).
7. `productType`: single exposure, stack, mosaic or multi-instrument composite.
8. `processing`: level and who processed it (e.g. "AIA level 1.5", "PDS RDR",
   "release image, STScI imaging team").
9. `pixelScale` at native resolution (arcsec/px or m/px) and `fieldOfView`.
10. `orientation`: north direction (compass) or map projection.
11. `center`: RA/Dec, latitude/longitude, or helioprojective; WCS when available.
12. Planetary only: `incidenceAngle`, `emissionAngle`, `localSolarTime`, `solarLongitude` (season).
13. Pairs only: `differs` flags (instrument, band, date, illumination, geometry,
    processing), `registration` (method, transform, residual in pixels), and the
    validated "What differs?" note.
14. `sourceUrl`, `credit`, `license`.

Status of this list: `assumption` (a team design choice), derived from what a caption has to state to stay honest.

## Sources

1. SDO, "AIA and HMI channels": https://sdo.gsfc.nasa.gov/data/channels.php (read)
2. ESA/Hubble heic1501: https://esahubble.org/news/heic1501/ (read)
3. ESA/Hubble heic1501d, 1995 and 2015 comparison: https://esahubble.org/images/heic1501d/ (search result only)
4. Eos, "Hubble's legacy: the Pillars of Creation": https://eos.org/features/hubbles-legacy-the-pillars-of-creation (search summary only; secondary)
5. WFPC2 detector layout (chevron): `unverified`, find the WFPC2 Instrument Handbook
6. NASA, Pillars NIRCam and MIRI composite: https://science.nasa.gov/asset/webb/pillars-of-creation-nircam-and-miri-composite-image (search summary)
7. ESA/Webb weic2216: https://esawebb.org/news/weic2216/ (read)
8. NASA Photojournal, ripples in Nili Patera: https://science.nasa.gov/photojournal/changes-in-ripples-on-martian-dunes-in-nili-patera/ (search summary)
9. HiRISE ESP_028575_1890: https://hirise.lpl.arizona.edu/ESP_028575_1890 (search summary)
10. aiapy, preparing level 1 to 1.5: https://aiapy.readthedocs.io/en/stable/preparing_data.html (search summary)
11. NASA, Pillars MIRI image: https://science.nasa.gov/asset/webb/pillars-of-creation-miri-compass-image/ (not read; claim on stars `supported` only)
12. Helioviewer API v2, JPEG2000: https://api.helioviewer.org/docs/v2/api/api_groups/jpeg2000.html (search summary)

Still open: read [3], [5], [8], [11] and the MAST header of the 2014 Hubble
mosaic.
