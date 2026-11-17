# Solaria roadmap

Owner of every item: Guilherme. Status is `todo`, `doing`, `done` or `blocked`, and is
updated in the same commit that finishes the item. Plan: `docs/vision.md`; design:
`docs/design.md`; checked facts: `docs/science/`.

"Validated" below means the claim was checked against its source and the manifest
records that check (see `docs/vision.md`, section 7).

## Sprints

Sprints run back to back. Each one ends with a short report, and the next starts right away.

| Sprint | Goal | Items | Status |
|---|---|---|---|
| 1 | Clean, tested base | B-01 to B-07 | done |
| 2 | Next 16, content from manifests, static export | B-08, B-09, D-01 to D-07 | doing |
| 3 | New visual base; R2 sync and mock data ready | V-01 to V-03, D-08, D-09 | todo |
| 4 | Viewer as a page | X-01 to X-05 | todo |
| 5 | Story mode and the Andromeda Journey | S-01 to S-04 | todo |
| 6 | Home and About, launch-ready | L-01, L-02, L-05 | todo |
| 7 | Compare | C-01 to C-05 | todo |
| 8 | Light | G-01 to G-04 | todo |

Waiting on the maintainer: host and analytics (L-03), deploy and domain (L-04, L-06), and
the R2 bucket and its credentials (R-01, R-02).

## M0. Plan

| ID | Item | Status | Done when |
|---|---|---|---|
| P-01 | Product vision, design direction, science checks of sources and comparisons | done | `docs/vision.md`, `docs/design.md`, `docs/science/` committed |
| P-02 | Mockup of Home and Andromeda Journey (desktop and phone, dark and light) | done | Direction C "Instrument" with the lens approved on 2026-11-17 |

## M1. Clean base

Each item leaves the app working.

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| B-01 | Test setup: unit and integration runner, end-to-end runner, `npm test` | done | | One passing test of each kind; no network in the suite |
| B-02 | CI on push: lint, type check, tests, build, `npm audit` | done | B-01 | Workflow green on a local run, including `npm audit --audit-level=high` |
| B-03 | Remove the CSS "Infrared" and "UV" filter modes | done | | No filter mode in the app |
| B-04 | Fix the Andromeda metadata (42208 x 9870 and 10552 x 2468, levels 0 to 6, released 2025-01-16) and the credit line | done | | Values match `docs/science/sources.md`, with a test |
| B-05 | Remove the unidentified Webb pair from the slider | done | | No unlabeled pair shipped |
| B-06 | Remove unused `react-leaflet` | done | | Not in `package.json` |
| B-07 | Dev server on 127.0.0.1:8434 in `npm run dev`; README rewritten for the relaunch | done | | README states what is built and links the plan |
| B-08 | Upgrade to Next 16 to clear the PostCSS advisory bundled with Next 15 (critical Next advisories already fixed by 15.5.29) | done | B-02 | `npm audit --audit-level=high` clean; CI green |
| B-09 | Remove the Spectral Gallery (its titles are not validated; Light replaces it) and the unused slider component; clear lint warnings | todo | | No unvalidated image text on the page; 0 lint warnings |

## M2. Data pipeline

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| D-01 | JSON schemas for source, image manifest and Journey; validator script | done | B-01 | Invalid fixtures fail, valid ones pass |
| D-02 | `data/sources/andromeda-phat-phast-2025.json` | done | D-01 | Origin URL, credit, terms, checksum recorded |
| D-03 | Fetch script into an ignored cache with checksum check | todo | D-02 | Cache ignored; tests use a local fixture |
| D-04 | `generate-tiles` writes thumbnail, preview and the manifest's dimensions and levels | todo | D-01 | Manifest generated for a small test image |
| D-05 | Manifests replace `/api/images`; app reads them at build time; static export | todo | D-04 | `next build` produces a static site; API routes gone |
| D-06 | Validation gate: production build fails on any unapproved or mock content | todo | D-05 | Test proves both outcomes |
| D-07 | `TILE_BASE_URL` with local default | todo | D-05 | Same build works against a local or remote base |
| D-08 | R2 sync script (dry run by default, credentials from env only) | todo | D-07 | Dry run lists the files it would upload |
| D-09 | Mock manifests for Compare and Light development, flagged `mock: true` | todo | D-06 | Visible in dev, blocked in production |

## M3. Visual base

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| V-01 | Design tokens, fonts, dark-first theme with light chrome | todo | P-02 | Contrast meets WCAG 2.2 AA |
| V-02 | Remove react-bootstrap and Bootstrap; CSS Modules | todo | V-01 | Not in `package.json`; same features work |
| V-03 | New header and footer | todo | V-01 | Matches the approved mockup |

## M4. Viewer as a page

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| X-01 | `/[slug]` route with full-bleed Explore mode | todo | D-05, V-03 | Andromeda opens full-bleed |
| X-02 | Viewport and mode in the URL; share button | todo | X-01 | Reloading a shared link restores the view |
| X-03 | Info panel: target, instrument, dates, color mapping, credit, source link | todo | X-01, D-02 | Fields come from the manifest only |
| X-04 | Keyboard control, live region, loading and error states | todo | X-01 | End-to-end test covers keyboard zoom and pan |
| X-05 | Phone layout with bottom sheet and gestures | todo | X-01 | Works at 390 px wide |

## M5. Story and the Andromeda Journey

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| S-01 | Journey player: stops, camera flights, pause and resume, progress | todo | X-02 | Unit tests on stop logic; end-to-end test runs a Journey |
| S-02 | Reduced-motion version (cuts instead of flights) | todo | S-01 | Honors `prefers-reduced-motion` |
| S-03 | Andromeda Journey text, 5 to 8 stops, with sources | todo | S-01 | Every stop validated |
| S-04 | Decide whether to tile the half-resolution file (84416 x 19739) for more depth | todo | D-04 | Decision recorded with tile count and size |

## M6. Home, About and launch

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| L-01 | Home: live zoom hero with a poster image, Journey cards | todo | S-03 | Matches mockup; hero respects reduced motion |
| L-02 | About: what Solaria is, credits and terms per source, accessibility statement | todo | D-02 | Credits copied unaltered |
| L-03 | Choose host (GitHub Pages or Vercel) and analytics | todo | | Decision recorded; GitHub Pages cannot set headers, so CSP goes in a meta tag there |
| L-04 | Security headers, deploy workflow, domain solaria.zenus.systems | todo | L-03 | Headers checked on the live site |
| L-05 | Performance and accessibility pass on a mid-range phone | todo | L-01 | Targets in `docs/design.md` section 9 met |
| L-06 | Launch | todo | L-01 to L-05 | Site live |

## M7. Compare

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| C-01 | Compare mode in OpenSeadragon: wipe and side by side, synced at any zoom | todo | X-02, D-09 | Works on mock pair; drop `@img-comparison-slider/react` |
| C-02 | Pillars of Creation, Hubble 1995 (WFPC2) vs 2014 (WFC3): source, fetch, tile | todo | D-08 | Sources and credits recorded |
| C-03 | Register the pair from star control points; record transform and residual | todo | C-02 | Residual recomputed independently |
| C-04 | "What differs?" note for the pair | todo | C-03 | Validated |
| C-05 | Pillars Journey (adds Webb 2022 as a band comparison, labeled "different light, not different time") | todo | C-04 | Every stop validated |

## M8. Light

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| G-01 | Light mode: band rail, crossfade, keyboard stops | todo | X-02, D-09 | Works on mock set |
| G-02 | Sun from SDO: HMI 6173 Å and AIA 1700, 304, 171, 193, 211, 94 Å at one instant with an active region | todo | D-08 | Frames, orientation and credit recorded |
| G-03 | Band notes (false color, temperature, wavelength order is not temperature order) | todo | G-02 | Validated |
| G-04 | Sun Journey | todo | G-03 | Every stop validated |

## M9. R2

| ID | Item | Status | Depends | Done when |
|---|---|---|---|---|
| R-01 | Create the R2 bucket, public domain for tiles, CORS for the site | todo | D-08 | Tiles load from R2 in a preview build |
| R-02 | Switch production to R2; stop committing new tiles (ignore rule) | todo | R-01 | New images never enter git |

## Later

| ID | Item | Status |
|---|---|---|
| F-01 | Kiosk mode: attract loop, idle reset, no links out | todo |
| F-02 | Detail of the week, rotated at build time | todo |
| F-03 | Labeled features on images, each label validated | todo |
| F-04 | Search by feature name, then by coordinates | todo |
| F-05 | Mars Journey from HiRISE orthorectified pairs only | todo |
| F-06 | Brazilian Portuguese | todo |
