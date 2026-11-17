# Solaria

Solaria is a web app for exploring very large NASA images in the browser. It began as an
entry to the NASA Space Apps Challenge 2025 ("Embiggen Your Eyes!") and is being relaunched
as a guided, shareable way to zoom into one giant image at a time. The plan is in
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
  cuts the tile pyramid, a thumbnail and a preview, and writes the manifest's `tiles` block.
  `npm run validate` runs the content checks and the production gate alone; `next build`
  runs them too and fails on any draft, mock or unverified content.
  `npm run generate-mock` rewrites the synthetic mock content in `data/mock/` (one Compare
  pair, one Light band set, flagged `mock: true`, tiles in `public/tiles/mock-*`); `next dev`
  loads it, production builds never read it, `postbuild` drops its tiles from `out/`, and the
  gate rejects a leaked mock.
  `npm run sync-r2` pushes `public/tiles/` to a Cloudflare R2 bucket: a dry run by default
  (it lists what it would upload), `--apply` to upload, skipping objects whose size and MD5
  already match. It reads `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
  `R2_BUCKET` from the environment and has no dependency. Ready and unit-tested with a mocked
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
  hands the same view to Explore. Not linked from Home yet (L-01).
- Unit and integration tests (Vitest) and end-to-end tests (Playwright).

## Planned

More Journeys, tiles served from
R2, the rest of the new design (Home, Journeys), and Compare and Light modes once a pair or band set
is validated. See the roadmap for order and status.

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