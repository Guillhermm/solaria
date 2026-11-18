# Solaria

Solaria is a web app for exploring very large NASA images in the browser. It began as an
entry to the NASA Space Apps Challenge 2025 ("Embiggen Your Eyes!") and is being relaunched
as a guided, shareable way to zoom into one giant image at a time. The original challenge
repository is archived, read-only, at
[Guillhermm/nasa-2025-solaria](https://github.com/Guillhermm/nasa-2025-solaria); this one
carries its full history forward. The plan is in
[docs/vision.md](docs/vision.md), the design direction in [docs/design.md](docs/design.md),
the work items in [docs/roadmap.md](docs/roadmap.md) and the checked facts about the images
in [docs/science/](docs/science/).

## Built today

- A viewer page per image at `/<image id>/` (for now `/andromeda-phat-phast-2025/`), linked
  from Home: OpenSeadragon over pre-cut tiles of the Hubble Andromeda (M31) PHAT+PHAST
  panorama released on 2025-01-16 (42208 x 9870 px, a quarter-resolution rendition), full
  window, with rulers in image pixels, an overview sized to the image's shape, a readout
  of the center and the zoom relative to fit, and zoom, reset and fullscreen controls.
  The URL carries the view (`?mode=explore&x=&y=&z=`, center in image pixels, zoom relative
  to fit) and the share button copies it, so a shared link reopens the same view.
  "About this image" opens a panel with the target, observatory, camera, filters and the
  colors assigned to them, observation and release dates, credit, every caveat and a link
  to the source page, all taken from the manifest and its source record.
  Keyboard: `+` and `-` zoom, arrows pan (Shift for larger steps), `0` or Home fits, `F`
  toggles fullscreen, Esc closes the panel; a live region announces the zoom once it
  settles. A progress line shows while tiles load, a note appears when they are slow or
  when ten of them fail (with Retry), a full-screen message with Retry replaces the viewer
  if it cannot load at all, and an unknown address shows a 404 page. After 5 s without input
  the chrome fades on pointer devices and the rulers and zoom buttons dim (on phones only
  the zoom buttons dim); nothing fades while a panel is open or the pointer or focus is in
  the chrome, and the credit never fades. On phones the full credit line stays in the sheet. On a phone the rulers go and a bottom sheet holds
  the overview with its readout: drag its handle up for About this image (credit included)
  or down to minimize it, or use its buttons instead of dragging; pinch, drag and double tap work
  on the image.
- Content from JSON files in `data/` (sources, image manifests), checked by a validator at
  build time. The site is a static export (`out/`).
- Scripts: `npm run fetch-source -- <sourceId>` downloads an original into `.cache/` and
  checks its size and sha256; `npm run generate-tiles -- <input> <imageId> [--no-pyramid]`
  cuts the tile pyramid, a thumbnail and a preview (of the record's `crop` when it has one),
  and writes the manifest's `tiles` block.
  `npm run validate` runs the content checks and the production gate alone; `next build`
  runs them too and fails on any draft, mock or unverified content.
  `npm run generate-mock` rewrites the synthetic mock content in `data/mock/` (one Compare
  pair, one Light band set, flagged `mock: true`, tiles in `public/tiles/mock-*`); `next dev`
  loads it, production builds never read it, `postbuild` drops its tiles from `out/`, and the
  gate rejects a leaked mock.
  `npm run sync-r2` pushes `public/tiles/` to a Cloudflare R2 bucket: a dry run by default
  (it lists what it would upload), `--apply` to upload, skipping objects whose size and MD5
  already match. It reads `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
  `R2_BUCKET` from the environment, or from a `.env` file in the repository root when one
  exists (copy `.env.example`), and has no dependency. `npm run sync-r2 -- --create-bucket`
  checks `R2_BUCKET` and, with `--apply`, creates it with a read-only CORS rule for the
  site's origins; a bucket that already exists is left untouched. Ready and unit-tested with a mocked
  `fetch`, but not yet run against a real bucket (the bucket is roadmap item R-01).
  `TILE_BASE_URL` (a root-relative path or an https URL, default `/tiles`) is read at build
  time and sets where the viewer loads tiles from; a build serves one base.
  Architecture: [docs/architecture.md](docs/architecture.md).
- Look: design tokens in `src/styles/tokens.css` (direction C of the design), Geist and
  Geist Mono self-hosted through the `geist` package, so no font request leaves the site.
  Dark by default; the light theme follows the system setting until the header toggle
  stores a choice. `public/theme-init.js` applies it before the first paint. A unit test
  checks the token pairs against WCAG 2.2 AA contrast. Components style themselves with
  CSS Modules next to them; there is no CSS framework. The footer prints each image's
  credit line unaltered from its source record.
- The Andromeda Journey at `/andromeda/`: Story mode tells seven validated stops in a
  column beside the image (a bottom sheet on phones, with the credit under it). Next and
  Previous, the stop list, the numbered stops on the overview's route, a swipe on the
  phone card, and `J`/`K` or Page Down/Page Up move between stops; the camera flies there
  and the URL holds the stop (`?mode=story&stop=3`). Touching the image pauses the story
  and a "back to the story" pill resumes it. The last stop, or the Story/Explore switch,
  hands the same view to Explore. With reduced motion set, the camera cuts to each stop
  with a short fade instead of flying.
- Home: the hero shows the whole Andromeda panorama as a strip with the Journey's route and
  stops, and on wider screens a lens that magnifies one stop from the same tiles, with its
  zoom, field and center computed from the Journey file. Hovering or focusing a stop aims the
  lens (arrow keys move between stops), and a click, tap or Enter opens the Journey there.
  Below it, the Journeys index lists each published Journey from `data/journeys`. The poster
  is pyramid level 1 stitched into `poster.jpg` on phones (`generate-tiles` writes it; `npm run
  generate-tiles -- <imageId> --poster-only` stitches it from tiles already on disk) and the
  2048 px `preview.jpg` on wider screens.
- About at `/about/`: what Solaria is, who made it, how images are prepared, each source's
  credit and terms copied from `data/sources` at build time, an accessibility statement
  limited to what is built and tested, and contact links. The header links Journeys and
  About; the footer links About, its credits and accessibility sections, and states that
  Solaria is not endorsed by NASA or ESA.
- Light mode on the page of a band set's first image (`?mode=light&band=<imageId>`): a rail
  of bands in wavelength order, labeled in text; dragging it crossfades between neighboring
  bands and settles on the nearer one, the keyboard steps band by band, and the URL holds the
  band. The Sun from SDO in seven channels (2024-05-10) is the published band set, with a
  checked note per band.
- The Sun Journey at `/sun/`: seven stops through the SDO bands; each stop can switch the band,
  with a crossfade (a cut under reduced motion), and the rail stays in hand to switch freely.
- The Mars Journey at `/nili-patera/`: six stops over the Nili Patera dune field from two
  HiRISE orthorectified images (30 June and 13 October 2007), ending on what changed: the sand
  ripples shifted, the dunes did not measurably move. The same pair opens in Compare with the
  alignment limit and a "what differs" note. Both images are cut to the part they share; an
  image record's `crop` gives the offset of its pixels in the source product, and the
  science record is `docs/science/mars-nili-patera.md`.
- Feature labels in Explore and Light: the Feature labels button (above Reset view) draws
  the validated labels of `data/labels/` on the image, as rings or measured circles with
  chips placed clear of the controls; a chip opens its description, and About this image
  lists every label with a Show button. `labels=1` in the URL keeps them on.
- Search: the Search button in the Home header and in the viewer's top bar, or `/`, opens a
  dialog that finds image titles, feature labels and Journey stop titles as you type (accents
  and case ignored, every word a prefix), and goes to a pixel when you type two numbers
  (`17461, 6482`). Results open the image, the stop or the labeled feature; on the page
  already open the view moves in place. The index is built from validated content at build
  time and travels in the page, so searching makes no request. Sky coordinates (RA and Dec)
  are planned.
- Detail of the week on Home: one stop from a validated pool (`data/weekly.json`, checked by
  the content validator) is picked by the ISO week of the build date (`SOLARIA_BUILD_DATE`,
  else today in UTC) and drawn as a square crop from the tile pyramid with its rulers,
  readout, credit and a link to the stop. It changes when the site is rebuilt; a weekly
  scheduled rebuild is planned and waits on the host decision.
- Kiosk mode, awaiting the maintainers' sign-off and not linked from the app: `?kiosk=1` on
  any page turns it on for the browser session (`?kiosk=0` ends it). It is always dark, shows
  no link that leaves the app, no Share, Fullscreen or theme toggle, uses 3.5rem targets,
  plays every Journey's Story in a loop until the first touch, and after 90 s without input
  counts down 10 s and starts over at Home.
- Unit and integration tests (Vitest) and end-to-end tests (Playwright). The end-to-end suite
  also runs axe-core on Home and About and measures LCP, CLS and interaction latency on a
  throttled phone profile (`tests/e2e/quality.spec.ts`; results in `docs/design.md` section 9).
  `npm start` and the test server gzip text, as static hosts do.

## Planned

More Journeys, tiles served from R2, a weekly scheduled rebuild for the detail of the week,
and sky coordinates in search. See the roadmap for order and status.

## Run it

Needs Node.js 22 or later.

```bash
npm install
npm run dev
```

The app is at [http://127.0.0.1:8434](http://127.0.0.1:8434). To serve the static export
instead, run `npm run build && npm start` (same port).

## Test it

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # unit and integration tests (Vitest)
npm run test:e2e      # builds the app and runs Playwright against it
npm run build
```

Install the end-to-end browser once with `npx playwright install chromium`. No test uses
the network: the end-to-end tests abort every browser request that is not to the local
server, and Next.js telemetry is off during their build. `E2E_PORT` changes the port they
use (default 8434, so set it while the dev server is running).

CI (`.github/workflows/ci.yml`) runs the same checks plus `npm audit --audit-level=high`.

## Authors

- Kauê Melo <kaue.cmelo@gmail.com>
- Guilherme Almeida Zeni <guillhermm_zenni@hotmail.com, g146284@dac.unicamp.br>