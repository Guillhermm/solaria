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
- Spectral Gallery: a plain gallery of NASA images served by NASA.
- `/api/images` and `/api/image/[id]`: image metadata, including the credit line.
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

The app is at [http://127.0.0.1:8434](http://127.0.0.1:8434).

## Test it

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # unit and integration tests (Vitest)
npm run test:e2e      # builds the app and runs Playwright against it
npm run build
```

The end-to-end tests install their browser once with `npx playwright install chromium`. No
test uses the network: the end-to-end tests abort every request that is not to the local
server. `E2E_PORT` changes the port they use (default 8434).

CI (`.github/workflows/ci.yml`) runs the same checks plus `npm audit --audit-level=high`.

## Authors

- Kauê Melo <kaue.cmelo@gmail.com>
- Guilherme Almeida Zeni <guillhermm_zenni@hotmail.com, g146284@dac.unicamp.br>