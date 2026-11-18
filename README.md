# Solaria

Solaria is a web app for exploring very large NASA images in the browser. You zoom into one
giant image at a time, follow a guided Journey through it, and share the exact view you are
looking at. It is live at [solaria.zenus.systems](https://solaria.zenus.systems).

## Where it came from

Solaria began as an entry to the NASA Space Apps Challenge 2025, "Embiggen Your Eyes!". That
repository is archived and read-only at
[Guillhermm/nasa-2025-solaria](https://github.com/Guillhermm/nasa-2025-solaria). This one,
[Guillhermm/solaria](https://github.com/Guillhermm/solaria), carries its history forward and
is where development continues.

## What you can do

- Journeys: guided tours with a short validated text per stop and a camera that flies
  there. Published: Andromeda, the Sun, Mars (Nili Patera), and the Pillars of Creation (Hubble
  with Webb).
- Explore: pan and zoom a full-window image with rulers in image pixels, an overview, and a
  share button. The URL holds the view, so a shared link reopens it.
- Compare: the same place at two moments, as a wipe or side by side, with a note on what
  differs. Published: the Pillars of Creation (Hubble, 1995 and 2014) and Nili Patera
  (HiRISE, 2007).
- Light: slide through the bands of one image, for example the Sun in seven SDO channels.
- Labels: draw the validated feature labels on the image, each with a description.
- Search: find images, features and Journey stops by name, or go to a pixel by typing two
  numbers. Press `/` to open it. Sky coordinates are deferred (F-09).
- Detail of the week: one stop from a validated pool, shown on Home and changed at build time.
- Kiosk mode (`?kiosk=1`): attract loop, large targets and an idle reset for a shared
  screen. It is not linked from the app yet.

The full list, with keyboard shortcuts and phone behavior, is in
[docs/architecture.md](docs/architecture.md) section 17.

## Run it locally

Needs Node.js 22 or later.

```bash
npm install
npm run dev
```

The app is at [http://127.0.0.1:8434](http://127.0.0.1:8434). To serve the static export
instead, run `npm run build && npm start` (same port).

Other scripts: `npm run validate` checks the content and the production gate,
`npm run fetch-source`, `npm run generate-tiles`, `npm run build-tiles` and `npm run generate-mock` prepare images,
and `npm run sync-r2` uploads tiles.

## Tiles and content

Every image is a pyramid of 256 px JPEG tiles that OpenSeadragon loads as you zoom. Text
about an image (credit, dates, captions, Journeys, labels) lives in JSON files under `data/`,
and each claim is checked against its source before it ships. A validator runs at build time
and fails the production build on any draft, mock or unverified content. The site is a static
export.

Tiles are served from Cloudflare R2 at `https://tiles.solariadata.com`. `TILE_BASE_URL` sets
the base the viewer loads from at build time and defaults to `/tiles`, which serves
`public/tiles/`.

- [docs/architecture.md](docs/architecture.md): data files, tile layout, the production gate,
  the R2 sync, security headers and a reference of what is built.
- [docs/design.md](docs/design.md): the experience and visual direction.
- [docs/vision.md](docs/vision.md): the plan.
- [docs/science/](docs/science/): the checked facts about each image and its terms.
- [docs/roadmap.md](docs/roadmap.md): work items and their status.

## Tests

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # unit and integration tests (Vitest)
npm run test:e2e      # builds the app and runs Playwright against it
npm run build
```

Install the end-to-end browser once with `npx playwright install chromium`. No test uses
the network: the end-to-end tests abort every browser request that is not to the local
server. `E2E_PORT` changes the port they use (default 8434, so set it while the dev server
is running). The end-to-end suite also runs axe-core on Home and About and measures LCP, CLS
and interaction latency on a throttled phone profile.

CI (`.github/workflows/ci.yml`) runs the same checks plus `npm audit --omit=dev --audit-level=high`,
which audits the dependencies that ship.

## Deploy

The site is on Vercel, deployed from its Git integration, at
[solaria.zenus.systems](https://solaria.zenus.systems). `vercel.json` sets the security
headers.

Tiles are built and uploaded to R2 by the "Sync tiles to R2" workflow
(`.github/workflows/sync-tiles.yml`), which runs on demand only: an `images` dropdown (`all`, or
one image) and an "apply" checkbox (unchecked is a dry run). It downloads the NASA originals, cuts
the tiles (`npm run build-tiles`) and syncs them. New tiles are not committed (`public/tiles/` is
ignored except the mock trees). It reads four repository secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
`R2_BUCKET`. To run the sync from your machine, copy `.env.example` to `.env`, fill it in, and
run `npm run sync-r2` (add `--apply` to upload).

Deferred: offline support.

## Authors

- Kauê Melo <kaue.cmelo@gmail.com>
- Guilherme Almeida Zeni <guillhermm_zenni@hotmail.com, g146284@dac.unicamp.br>

## License

The code is under the [MIT License](LICENSE). It does not cover the images, tiles or the
captions taken from their sources: each image keeps its owner's terms and credit line, listed
on the About page and in [docs/science/](docs/science/).
