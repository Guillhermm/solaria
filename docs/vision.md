# Solaria: product vision

Date: 2026-11-17. Target: solaria.zenus.systems.

Solaria started as an entry to the NASA Space Apps Challenge 2025 ("Embiggen Your Eyes!").
The relaunch is no longer bound by the challenge brief. This document is the product
plan; `docs/design.md` holds the experience and visual direction, `docs/roadmap.md` the
work, and `docs/science/` what has been checked about the images.

## 1. Where the app stood before the relaunch (2026-11-17)

A snapshot of the starting point. Sprint 1 fixed the metadata and removed the fake filters
and the unidentified pair; `docs/roadmap.md` tracks what has changed since.

- One long page with three stacked tools: Deep Viewer (OpenSeadragon over Hubble
  Andromeda tiles), a before/after Comparison Slider, and a Spectral Gallery.
- The Andromeda tiles come from the Hubble M31 PHAT+PHAST panorama released on
  2025-01-16 (ESA heic2501a). `hubble-mosaic-high` is 42208 x 9870 px and `hubble-mosaic`
  10552 x 2468 px, both with levels 0 to 6. That is a quarter-resolution rendition of
  about 417 megapixels, not the 2.5 gigapixel original. `src/app/api/images/route.ts`
  states wrong sizes, levels and date. See `docs/science/sources.md`.
- The Spectral Gallery's "Infrared" and "UV" are CSS filters on visible-light photos, so
  they show something false.
- The Comparison Slider pair is an unidentified Webb image pair with two different
  frames; it cannot support a "same place" claim.
- Next.js 15, React 19, react-bootstrap, OpenSeadragon. No tests.

## 2. Who it is for

| User | What they want |
|---|---|
| Curious visitor, mostly on a phone | Something beautiful with a reason to zoom, in a few minutes |
| Student or teacher | A guided explanation they can follow and share in class |
| Enthusiast | Free exploration of the full image, shareable views, real credits |
| Museum or event screen | A walk-up loop that runs without staff |

Researchers are served by honest metadata and links to the source, not by analysis tools.

## 3. The story: Journeys

A giant image has no obvious first thing to look at, so people zoom twice, see noise and
leave. Solaria answers that with **Journeys**: one giant image and a guided path of 5 to 8
stops. Each stop flies the camera to a place and says what is there and why it matters.
After the last stop the same viewer is free to explore.

Three ideas carry it:

1. **The image is the page.** Full-bleed viewer, text in small panels over it.
2. **Story drives the camera, never locks it.** Touching the image pauses the story; a
   "Back to the story" control resumes it.
3. **Every view is a place.** The URL holds the image, the mode and the viewport.

Andromeda is the first image, not the only one. The viewer, the panorama strip, the
minimap and the manifests work for any massive image of any aspect ratio, wide or tall,
so a new image is added by adding its manifest and tiles, not by changing code.

The viewer has four modes on the same image: **Story**, **Explore**, **Compare** (only
with a validated pair) and **Light** (only with a validated band set).

## 4. Pages

```
/                Home: live zoom hero, Journey cards
/[slug]          Journey viewer; ?mode=story|explore|compare|light, ?x=&y=&z= viewport
/about           What Solaria is, credits, data sources, accessibility statement
```

The site is a static export. The `/api/*` routes go away; content comes from JSON
manifests read at build time.

## 5. Data pipeline

`source -> fetch -> tile -> manifest -> publish`. Built now against local files; the
same tree moves to Cloudflare R2 later without touching content.

1. **Source registry**: `data/sources/<id>.json` with origin URL, release ID, credit line
   exactly as the source page prints it, license or terms, retrieval date and checksum.
   No image enters without its terms recorded.
2. **Fetch**: a script downloads the original into an ignored local cache and checks the
   checksum. Originals are never committed.
3. **Tile**: `scripts/generate-tiles.ts` builds the pyramid, a thumbnail and a low
   resolution preview, and writes dimensions and levels into the manifest itself, so
   they are never typed by hand.
4. **Manifest**: `data/images/<id>.json` with the fields in section 3 of
   `docs/science/compare-and-light.md` (target, observatory, instrument, bands, color
   mapping, observation and release dates, product type, processing, pixel scale,
   orientation, center, source, credit, license) plus `validation: {status, date, notes}`.
   Journeys live in `data/journeys/<slug>.json`.
5. **Validate**: a build step checks every manifest against its schema and fails the
   production build when a published image, caption or label is not `approved`. Mock
   manifests (`mock: true`) are allowed in development only.
6. **Publish**: tiles sit in `public/tiles/` today. A sync script pushes the same tree to
   an R2 bucket, and the app reads one `TILE_BASE_URL` (local path now, R2 public URL
   later). R2 credentials live in environment variables only.

## 6. Features

### Launch

1. Visual base: tokens, fonts, new header and footer, Bootstrap and the fake filters gone.
2. Viewer as a page with Explore mode, URL viewport, info panel with credit and source.
3. Story mode and the Andromeda Journey with validated text.
4. Home with live hero and Journey cards; About with credits.
5. Data pipeline with manifests, validation gate and the `TILE_BASE_URL` switch.

### Next

6. Compare mode inside OpenSeadragon, synced at any zoom. First pair: Pillars of
   Creation, Hubble 1995 vs 2014, the one candidate with a published real change over time.
7. Light mode. First set: the Sun from SDO (HMI and AIA channels at one instant).
8. Tiles on R2.
9. A second and third Journey (Pillars of Creation; the Sun).

### Later

10. Kiosk mode (attract loop, idle reset).
11. Detail of the week, rotated at build time.
12. Labeled features on images, each label validated.
13. Search by feature name, then by coordinates.
14. Mars Journey from HiRISE, using only the HiRISE team's orthorectified pairs.
15. Brazilian Portuguese.

### Out of scope

User accounts, uploads, comments, a backend server, paid services, stitching or
reprojecting raw mission data, multi-observatory composites.

## 7. Rules for content

- Every fact the app states about an image (caption, credit, date, band, scale, label,
  comparison note) is checked against the source before it ships, and the manifest
  records that check.
- Color is never presented as natural unless it is; the color mapping is always shown.
- A Compare pair always carries a "What differs?" note naming every difference
  (instrument, band, date, lighting, geometry, processing).
- Credit lines are copied unaltered from the page the file came from.

## 8. Success signals

Measured with cookie-free analytics if the chosen host offers it; baselines set in the
first month, no targets claimed up front.

- Journey start rate from Home, and completion rate.
- Time and zoom depth in Explore after a Journey ends.
- Share-link opens.
- Return visits within 30 days.
- Share of phone sessions and their completion rate.
- Time to the first sharp tile on a mid-range phone.

## 9. Decisions

| Decision | Status |
|---|---|
| Journeys as the organizing concept | decided 2026-11-17 |
| Dark-first palette with amber accent | decided 2026-11-17 |
| Direction C "Instrument" (Geist and Geist Mono, technical readouts, lens on Home) | chosen 2026-11-17, pending final mockup approval |
| English only at launch | decided 2026-11-17 |
| Host: GitHub Pages or Vercel, static export works on both | open, decided at launch |
| Which Journeys follow Andromeda | proposed: Pillars of Creation, the Sun |
| Launch without Light if no band set is validated | open |
| Analytics | open |
| Kiosk scope | proposed: later |
