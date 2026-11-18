# The Sun from SDO, 2024-05-10 12:00 UTC (G-02)

Status: draft, in science review. Nothing here is shown in the app until the records in
`data/staging/` are approved and moved to `data/`. The band notes ("Shows" lines, regions,
captions) are G-03 and are not written yet. Checked on 2026-11-17.

## 1. Files

Seven colorized JPEGs from the Helioviewer API, one per channel, nearest to
2024-05-10T12:00:00Z (`getClosestImage`), downloaded with
`https://api.helioviewer.org/v2/downloadImage/?id=<id>&type=jpg`. The API returns the same
bytes on every request (checked twice for AIA 171), so `fetch-source` can check the sha256.

| Channel | sourceId | Helioviewer id | DATE-OBS (UTC) | Bytes | Pixels |
|---|---|---|---|---|---|
| AIA 94 Å | 8 | 156611806 | 12:00:11.122 | 3,372,967 | 4096 x 4096 |
| AIA 171 Å | 10 | 156611963 | 12:00:09.349 | 1,201,503 | 4096 x 4096 |
| AIA 193 Å | 11 | 156611919 | 11:59:52.843 | 1,175,050 | 4096 x 4096 |
| AIA 211 Å | 12 | 156611895 | 11:59:45.632 | 1,281,673 | 4096 x 4096 |
| AIA 304 Å | 13 | 156611996 | 12:00:05.132 | 2,485,050 | 4096 x 4096 |
| AIA 1700 Å | 16 | 156611797 | 11:59:40.718 | 1,219,444 | 4096 x 4096 |
| HMI 6173 Å continuum | 18 | 156614210 | 11:59:50.500 | 988,077 | 4096 x 4096 |

All seven fall within 30.4 s (11:59:40.718 to 12:00:11.122). DATE-OBS from each file's JP2
header (`getJP2Header/?id=<id>`). Status: verified.

The wavelength in each image manifest is the channel's name as Helioviewer's
`getDataSources` and the JP2 header state it, in Å.

## 2. Color

AIA images are colorized by Helioviewer with the `SDO_AIA_<n>` color tables
(Helioviewer-Project `AIAImage.php`); HMI has no color table and is gray (`HMIImage.php`).
The colors are assigned, not seen. Status: tables verified by decoding.

## 3. Frame, scale and orientation

- Every JP2 header: NAXIS 4096, CRPIX1/2 2048.5, CDELT 0.6 arcsec/px, CROTA2 0,
  RSUN_OBS about 950.18 arcsec; AIA LVL_NUM 1.5 (common pointing, 0.6 arcsec/px, solar north
  up, per the aiapy level 1.5 definition). Status: verified.
- HMI against AIA 1700, measured on the pixels: limb fit radius 1583.3 px against 1583.6
  expected from the header (0.6 arcsec/px holds), center (2048.0, 2048.1); 15 sunspots fit
  HMI onto AIA 1700 with scale 1.00081, rotation 0.0157 degrees and RMS 2.05 px. No flip, no
  roll; north up, west right. The largest spot group lies at the lower right, where HEK
  places NOAA AR 13664 (supported). Status: verified.
- Decision: every channel is placed at x 0, y 0, width 4096 with no transform. The band set's
  `registration` records the method and the 2.05 px residual.
- Not measured on the pixels: the other five AIA channels (their headers match).

## 4. Credit and terms

SDO rules of the road, https://sdo.gsfc.nasa.gov/data/rules.php (read 2026-11-17): "SDO
images and movies are not copyrighted unless explicitly noted", and use should be
attributed as "Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams." The same page
says browse products are not for science analysis or publication without the PI's consent;
these files are treated as browse grade, so the app states no number read off their pixels.
No Helioviewer terms page was found.

## 5. Open for review

- `releasedAt` in the records is the observation date: these are archive frames with no
  release.
- `differs` in the band set marks band and instrument only; whether processing (color tables
  against gray) also counts is for review.
- Band regions, the "What differs?" note and every caption: G-03.
