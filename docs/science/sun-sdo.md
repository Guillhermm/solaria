# The Sun from SDO, 2024-05-10 12:00 UTC: validation record (G-02 to G-04)

## Verdict

Approved on 2026-11-17: the seven sources and image manifests, the band set
`sun-sdo-2024-05-10` with its note and band notes, and the Sun Journey (`data/journeys/sun.json`)
with its seven stops. The app shows only the wording below, unaltered. Statuses: **verified**
means read at a primary source (or measured on the files); **supported** means consistent with
sources that do not state it in those words.

## 1. Sources read

- [CH] SDO channels page, https://sdo.gsfc.nasa.gov/data/channels.php: per-channel ion,
  region of the atmosphere and characteristic log T.
- [CN] SDO AIA and HMI browse page, https://sdo.gsfc.nasa.gov/data/aiahmi/: the color names
  (171 gold, 193 bronze, 304 red, 211 purple, 094 green, 1700 pink, HMI intensitygram gray).
- [L12] Lemen et al. 2012, Solar Physics 275, 17, doi 10.1007/s11207-011-9776-8 (AIA): the seven
  extreme ultraviolet band passes (94 to 335 Å), the two ultraviolet channels near 1600 and
  1700 Å, and coronal imaging up to 0.5 solar radii above the limb.
- [S12] Schou et al. 2012, Solar Physics 275, 229, doi 10.1007/s11207-011-9842-2 (HMI): HMI
  observes the photosphere in the Fe I 6173 Å line, at a visible wavelength.
- [C16] Couvidat et al. 2016, Solar Physics 291, 1887, arXiv:1606.02368: HMI's continuum
  intensity is computed by reconstructing the line, not observed beside it.
- [SRS] NOAA SWPC Solar Region Summaries, NGDC mirror,
  https://www.ngdc.noaa.gov/stp/space-weather/swpc-products/daily_reports/solar_region_summaries/2024/05/20240510SRS.txt
  and `20240511SRS.txt`: region 3664 (NOAA 13664) at S19W34, valid 2024-05-09 24:00 UTC, and at
  S17W48, valid 2024-05-10 24:00 UTC.
- [HDR] Helioviewer JP2 headers, `https://api.helioviewer.org/v2/getJP2Header/?id=<id>`, for the
  seven frames: DATE-OBS, WAVELNTH, CDELT, CRPIX, CROTA2, RSUN_OBS.
- [RULES] SDO rules of the road, https://sdo.gsfc.nasa.gov/data/rules.php: the credit line and
  the browse-product rule.

## 2. Files

Seven colorized JPEGs from the Helioviewer API, one per channel, nearest to
2024-05-10T12:00:00Z, from `https://api.helioviewer.org/v2/downloadImage/?id=<id>&type=jpg`. The
API returns the same bytes on every request, so `fetch-source` checks the sha256.

| Channel | Helioviewer id | DATE-OBS (UTC) | Bytes | Pixels |
|---|---|---|---|---|
| AIA 94 Å | 156611806 | 12:00:11.122 | 3,372,967 | 4096 x 4096 |
| AIA 171 Å | 156611963 | 12:00:09.349 | 1,201,503 | 4096 x 4096 |
| AIA 193 Å | 156611919 | 11:59:52.843 | 1,175,050 | 4096 x 4096 |
| AIA 211 Å | 156611895 | 11:59:45.632 | 1,281,673 | 4096 x 4096 |
| AIA 304 Å | 156611996 | 12:00:05.132 | 2,485,050 | 4096 x 4096 |
| AIA 1700 Å | 156611797 | 11:59:40.718 | 1,219,444 | 4096 x 4096 |
| HMI 6173 Å | 156614210 | 11:59:50.500 | 988,077 | 4096 x 4096 |

All seven within 30.4 s [HDR]: verified.

No source gives these frames a release date: they are archive frames. The source records set
`releasedAt` to null and the image manifests leave it out, so the app shows no release date.

## 3. One grid

Every header: 4096 px, CRPIX 2048.5, CDELT 0.6 arcsec/px, CROTA2 0; AIA at level 1.5
(common pointing and plate scale, solar north up). Measured on the files:

- Limb fits of all seven channels: centers within 3.5 px (2.1 arcsec) of (2048, 2048). The
  extreme ultraviolet limbs sit 7 to 10 px above the HMI limb (304 Å further out): the
  atmosphere, not a scale difference.
- HMI 6173 against AIA 1700 on 15 sunspots: scale 1.00081, rotation 0.0157 degrees, RMS 2.05 px.
  No flip, no roll; north up, west right.
- HMI disk radius 1583.3 px against 1583.6 px from the header: the 0.6 arcsec/px scale holds.

Every channel is drawn at x 0, y 0, width 4096 with no transform; the band set's
`registration` records the check and the 2.05 px residual. Status: verified.

## 4. Browse products

[RULES]: SDO images are not copyrighted unless noted; credit "Courtesy of NASA/SDO and the AIA,
EVE, and HMI science teams." Browse products are not for science analysis or publication without
the PI's consent. These 8-bit colorized frames are treated as browse grade, so the app states no
number read from their pixels: every number shown comes from a document (log T from [CH],
wavelengths and times from [HDR]). The grid check above is internal and not shown.

## 5. Claim statuses in the manifests

| Claim | Status | Source |
|---|---|---|
| Target (Sun), observatory (SDO), instrument (AIA or HMI) | verified | [HDR] |
| Wavelength per band | verified | [HDR] WAVELNTH |
| Band kind: extreme ultraviolet (94, 171, 193, 211, 304 Å) | verified | [L12] |
| Band kind: ultraviolet (1700 Å) | verified | [L12] |
| Band kind: visible (6173 Å) | verified | [S12] |
| Band notes (section 6) | verified | [CH], [L12], [S12], [C16], [CN] |
| Color tables and names | verified | [CN] |
| Observed 2024-05-10 | verified | [HDR] |
| Pixel scale 0.6 arcsec/px, orientation north up | verified | [HDR], section 3 |
| Product type, AIA: "single exposure" | supported | [HDR] (one FSN, T_OBS and EXPTIME per frame), [L12] section 3 |
| Product type, HMI: "stack" | supported | [C16] sections 2.1, 2.2.1 and 2.9 |
| Processing, HMI: "Continuum intensity computed from 12 filtergrams over 45 s (Couvidat et al. 2016)" | supported | [C16] |
| Release date | none | no source states one |

Product types. Each AIA header names one frame serial number, one observation time and one
exposure time (between 1.0 and 2.9 s; automatic exposure control varies the duration, not the
number of exposures, [L12] section 3), so "single exposure" holds; the app states no exposure
time. HMI's continuum intensity is not an exposure: the standard 45 s sequence takes 12
filtergrams, two at each of six wavelengths, which are combined into the observables and the
continuum is reconstructed from the line ([C16] sections 2.1, 2.2.1 and 2.9). "Stack" is the
nearest allowed value, and `processing` says what the frame is. The quick-look series this frame
comes from (QLOOK 1) is not documented by a source that could be read; that it uses the same
algorithm rests on its 45 s cadence, time grid and CONTENT keyword: supported.

## 6. Band notes and the set note, as shown

| Band | Kind | Note |
|---|---|---|
| 94 Å | extreme ultraviolet | Mostly flaring regions of the corona, light from Fe XVIII, log T 6.8 (about 6.3 million K). Green is an assigned color on a single-band image. |
| 171 Å | extreme ultraviolet | Mostly the quiet corona and upper transition region, light from Fe IX, log T 5.8 (about 630,000 K). Gold is an assigned color on a single-band image. |
| 193 Å | extreme ultraviolet | Mostly the corona, light from Fe XII, log T 6.1 (about 1.3 million K); Fe XXIV adds hot flare plasma, log T 7.3 (about 20 million K). Bronze is an assigned color. |
| 211 Å | extreme ultraviolet | Mostly the corona over active regions, light from Fe XIV, log T 6.3 (about 2 million K). Purple is an assigned color on a single-band image. |
| 304 Å | extreme ultraviolet | Mostly the chromosphere and transition region, light from He II (ionized helium), log T 4.7 (about 50,000 K). Red is an assigned color on a single-band image. |
| 1700 Å | ultraviolet | Mostly the photosphere and the temperature minimum, in ultraviolet continuum rather than one ion's line; log T 3.7 (about 5,000 K). Pink is an assigned color. |
| 6173 Å | visible | Mostly the photosphere, the Sun's visible surface: the continuum intensity computed from the Fe I 6173 Å line, log T 3.7 (about 5,000 K). Shown in gray. |

Kelvin values are 10^logT, rounded. The temperatures follow [CH]; [L12] Table 1 gives 193 Å as
log T 6.2, which would read about 1.6 million K.

Set note ("What differs?"): "Stops run by wavelength, not by temperature or height: 304 Å is
cooler than 171 Å. The seven frames were taken within about 30 seconds, around 12:00 UTC on
2024-05-10. In the extreme ultraviolet bands the glow reaches past the Sun's visible edge,
because hot gas above the limb shines there too. Colors are assigned to the AIA bands. NOAA
active region 13664 is on the disk, lower right."

- Cooler 304 than 171, the 30 s window, assigned colors: verified.
- The glow above the limb: supported ([L12] images the corona up to 0.5 solar radii above the
  limb; no source states the sentence as written).
- Region 13664 on the disk, lower right: verified [SRS]. At 12:00 UTC on 2024-05-10 it lies
  between W34 and W48; the app names no position beyond "on the disk, lower right".
- `differs`: band, and instrument (HMI against AIA). Date, illumination, geometry and
  processing: no.

## 7. The Sun Journey

Seven stops, text unaltered from the checked file. Stop 1 (the disk in HMI) and the limb
sentence of stop 6: verified. Stop 2 (region 13664 on the disk, lower right; the HMI band's
layer and temperature): verified. The band sentences of stops 3 to 5 restate the band notes:
supported. Stop 7 (1700 Å and 94 Å): verified. The stops are ordered as a story, not by
temperature: 193 Å (log T 6.1) follows 211 Å (6.3), and no text claims an order of
temperature or height.

Viewports, checked on the files: the active-region stops at x 3010, y 2510, z 4.5 frame the
spots and the bright regions of 304, 171, 211 and 193 Å with at least 61 px to spare in every
layout, and stay below one image pixel per screen pixel on a 1440 x 900 window. The limb stop
at x 3481, y 2724, z 4 holds the limb and a band of sky above it in every layout.

## 8. Not checked

- Lemen 2012 and Schou 2012 were read for the quoted passages only.
- Whether a flare was in progress at 12:00 UTC (relevant to the "flaring" wording of 94 Å and
  the Fe XXIV part of 193 Å, both hedged with "mostly").
- Which HMI timestamp is the center of its 45 s window; both fall inside the 30.4 s span.
