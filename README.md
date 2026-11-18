# Solaria

Solaria is a web app for exploring very large NASA images in the browser. It began as an
entry to the NASA Space Apps Challenge 2025 ("Embiggen Your Eyes!") and is being relaunched
as a guided, shareable way to zoom into one giant image at a time. The plan is in
[docs/vision.md](docs/vision.md), the design direction in [docs/design.md](docs/design.md),
the work items in [docs/roadmap.md](docs/roadmap.md) and the checked facts about the images
in [docs/science/](docs/science/).

## Built today

- Deep Viewer: OpenSeadragon over pre-cut tiles of the Hubble Andromeda (M31) PHAT+PHAST
  panorama released on 2025-01-16 (42208 x 9870 px, a quarter-resolution rendition).
- Content from JSON files in `data/` (sources, image manifests), checked by a validator at
  build time. The site is a static export (`out/`).
- Scripts: `npm run fetch-source -- <sourceId>` downloads an original into `.cache/` and
  checks its size and sha256; `npm run generate-tiles -- <input> <imageId> [--no-pyramid]`
  cuts the tile pyramid, a thumbnail and a preview, and writes the manifest's `tiles` block.
  `npm run validate` runs the content checks and the production gate alone; `next build`
  runs them too and fails on any draft, mock or unverified content.
  Architecture: [docs/architecture.md](docs/architecture.md).
- Unit and integration tests (Vitest) and end-to-end tests (Playwright).

## Planned

Journeys with story mode, a viewer page per image with shareable URLs, image manifests and
a static export, a new visual design, and Compare and Light modes once a pair or band set
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