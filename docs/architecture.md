# Architecture: Sprint 2 (Next 16, content from manifests, static export)

Covers roadmap items B-08 and D-01 to D-07. Status: built in Sprint 2. Plan and rules come from
`docs/vision.md` (sections 5 and 7), `docs/science/compare-and-light.md` (section 3) and
`docs/design.md` (sections 4, 6.3, 6.4, 7.2).

## 1. Parts and boundaries

```
data/                     content, JSON only; written by hand and by scripts
  sources/<id>.json       where an original file came from, its credit and terms
  images/<id>.json        image manifest; `tiles` block written by generate-tiles
  journeys/<slug>.json    Journey stops
  pairs/<id>.json         Compare pair: two image ids, `differs` flags, registration, note
  band-sets/<id>.json     Light band set: two or more image ids, same fields as a pair
  mock/{sources,images,journeys,pairs,band-sets}/  mock content, loaded by `next dev` only (D-09)
  staging/{sources,images,pairs,...}/  real content in science review: read in development
                          only, `mock: false`; moved to data/ once approved (Sprint 7)
scripts/                  pipeline, Node only, never imported by the app
  fetch-source.ts         download an original into .cache/sources/, check sha256
  generate-tiles.ts       pyramid, thumbnail, preview, `tiles` block
  validate-content.ts     same checks the build runs, for fast feedback and CI
  generate-mock.ts        writes the synthetic mock images, tiles, pair and band set (D-09)
  strip-mock-tiles.ts     postbuild: removes mock and staged tile trees from the production output
  register-pair.ts        fits a pair's similarity from its control points and writes it back
  sync-r2.ts              pushes public/tiles to a Cloudflare R2 bucket (D-08)
  serve-static.ts         serves out/ on 127.0.0.1 for `npm start` and end-to-end tests
src/content/              no React, no browser
  types.ts                the shapes in section 4
  check.ts                small field checkers used by validate.ts
  validate.ts             unknown JSON -> typed value or a list of errors
  gate.ts                 production publish rules
  registration.ts         similarity fit from control points (shared with register-pair)
  pyramid.ts              level sizes and tile counts (shared with generate-tiles)
  tiles.ts                tile base URL resolution, tile URL, OpenSeadragon tile source
  load.ts                 the only module that touches the file system
src/viewer/               no React: view math (zoom relative to fit, image pixels), overview
                          sizing by aspect ratio, ruler ticks, the `?mode=&x=&y=&z=` URL
                          (parsed and clamped at the boundary, url.ts), the info panel's
                          fields picked from a manifest and its source record (info.ts),
                          viewer keys (keys.ts) and the phone sheet's states (sheet.ts)
src/app/                  server components: call getContent(), pass plain objects down
src/components/           client components: receive a manifest and a tile base as props
  explore/                the Explore viewer page (OpenSeadragon, rulers, overview, readout)
public/tiles/<id>/        generated tile tree (moves to R2 later, R-02)
```

Rules:

- Adding an image means adding `data/sources/<id>.json`, `data/images/<id>.json` and its
  tiles. No code changes.
- Only `src/content/load.ts` imports `fs`. Client components never import it; if one
  does, Turbopack fails the build on the `fs` import, which is the intended alarm.
- `scripts/` may import the pure modules in `src/content/` (`pyramid.ts`, `validate.ts`,
  `gate.ts`). The app never imports `scripts/`.
- Every module except `load.ts` and the scripts' I/O is a pure function, unit-testable in
  Vitest with no network and no browser.
- File name equals `id` (or `slug`). Image `id` equals its tile directory name.

## 2. Next 16 and static export (B-08, D-05)

Target: `next@16.4.6` (current `latest`), `eslint-config-next@16.4.6`, `react` and
`react-dom` 19.2.x with matching `@types/*`. Checked: Next 16.4.6 bundles `postcss`
8.5.23 and requires Node 20.9 or later; `npm audit --audit-level=high` on the current
tree reports the PostCSS advisories that this version clears. CI already runs Node 22.

What breaks, from the official upgrade and static export guides, read against this repo:

| Change | Effect here | Fix |
|---|---|---|
| Turbopack is the default for `dev` and `build` | `--turbopack` flags are redundant | drop the flags from `package.json` |
| `eslint-config-next` 16 ships flat config | `FlatCompat` with `next/core-web-vitals` may stop resolving | import `eslint-config-next/core-web-vitals` and `/typescript` directly; drop `@eslint/eslintrc` |
| `next lint` removed | none, `npm run lint` already calls `eslint` | none |
| Sync `params` removed | `api/image/[id]` already awaits `params`; the route is deleted in D-05 anyway | none |
| `next dev` writes to `.next/dev` | none, `.next/` is ignored | none |
| `output: 'export'`: route handlers that read the request, dynamic routes without `generateStaticParams` | `/api/images` and `/api/image/[id]` | delete both (D-05) |
| `output: 'export'`: default image loader unsupported | `Header.tsx` used `next/image` for a logo (removed in V-03) | `images: { unoptimized: true }` |
| `output: 'export'`: `next start` does not serve the export | `npm start` and the Playwright `webServer` both call `next start` | `scripts/serve-static.ts` (see below) |

B-08 is the upgrade alone, on the current server build, so the audit and CI go green
before anything else moves. Static export lands in D-05, when the API routes go.

`next.config.ts` after D-05:

```ts
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
```

`trailingSlash: true` emits `about/index.html` instead of `about.html`, so every route is a
directory with an index file. That works unchanged on GitHub Pages, Vercel, an R2 bucket
or any plain static server, which keeps the host decision (L-03) open.

`scripts/serve-static.ts`: Node `http` and `fs` only, about 40 lines. Serves `out/` on
127.0.0.1, resolves `/x/` to `/x/index.html`, sets content types for the handful of
extensions Next emits, returns `404.html` with status 404, and rejects any path that
resolves outside `out/`. `npm start` becomes `tsx scripts/serve-static.ts out 8434`;
Playwright runs `npm run build && npm start`. No `serve` or `http-server` dependency.

## 3. Data files and how the app reads them (D-05)

`src/content/load.ts`:

```ts
export type Mode = "production" | "development";

// Content is defined in types.ts and re-exported here.
export const loadContent = (opts: { root: string; mode: Mode }): Content;
export const getContent = (): Content; // root = process.cwd(), mode from NODE_ENV, memoized
```

- Reads `data/{sources,images,journeys,pairs,band-sets}/*.json` with `readdirSync` and `JSON.parse`, so a
  new file needs no index entry. Reads `data/mock/**` (same five kinds) only when `mode` is `development`.
- Runs `validateContent` (section 5), then in `production` mode `publishProblems`
  (section 9). Any problem throws one `ContentError` whose message lists every problem
  with its file and field path. Thrown during prerender, it fails `next build`.
- `next build` sets `NODE_ENV=production`; `next dev` sets `development`. Tests call
  `loadContent` with an explicit `root` pointing at fixtures and an explicit `mode`.
- Pages are server components. They call `getContent()`, pick what they need and pass
  plain objects to client components as props. The browser never fetches a manifest.
- `/[slug]` (X-01, built) uses `generateStaticParams` over the image manifests, so the slug is
  the image `id`, with `dynamicParams = false`, as static export requires; any other slug is
  the 404 page. Journey slugs share the route (S-01, built): `generateStaticParams` lists
  image ids and Journey slugs, a Journey slug opens its image in Story mode, and the
  validator rejects a Journey slug that equals an image id. Decided on 2026-11-17: a Journey
  lives at `/<journey slug>/` (`/andromeda/`) rather than as `?mode=story` on the image page,
  so one image can carry several Journeys and the image page stays plain Explore. The URL
  holds the stop as `?mode=story&stop=N` (N from 1); the same page switches to
  `?mode=explore&x=&y=&z=` without a reload. Story logic is pure and tested in
  `src/viewer/story.ts` (stop URL, navigation, flight plan) and `src/viewer/route.ts`
  (overview route and marker geometry).
- Home (L-01, built): `src/components/home/`. The hero is the first published Journey: its
  poster strip with the route and stop links, and a lens (design.md 6.5) built from plain
  `<img>` tiles of the same pyramid, with no OpenSeadragon on Home. Lens geometry is pure and
  tested in `src/home/lens.ts`: the field is the stop's own zoom (side = fit side / z, so the
  readout zoom equals the Journey's), the level is the coarsest with 680 device pixels
  across, and tiles are placed in percent, so the first stop's lens is in the static HTML.
- Route groups: `src/app/(site)/` holds Home with the site header and footer;
  `src/app/(viewer)/[slug]/` is the full-bleed viewer page with neither.

## 4. Types (D-01)

`src/content/types.ts`. These are the contract; the validator enforces them.

```ts
// Content = { sources, images, journeys, pairs, bandSets } is exported too.
export type IsoDate = string; // YYYY-MM-DD, UTC
export type IsoMonth = string; // YYYY-MM, UTC

// Review of a whole record (source, image, Journey, stop) by science review.
export type ReviewStatus = "draft" | "in-review" | "approved" | "rejected";

export interface Validation {
  status: ReviewStatus;
  date: IsoDate | null; // required when status is "approved"
  notes: string;
}

// One stated fact. A caption may state a field only if it carries a source and status
// (docs/science/compare-and-light.md, section 3).
export type ClaimStatus = "verified" | "supported" | "unverified";

export interface Claim<T> {
  value: T;
  source: string; // https URL, or a repo path with anchor such as docs/science/sources.md#1
  status: ClaimStatus;
}

export interface Source {
  id: string;
  title: string;
  pageUrl: string; // the page the credit was copied from
  fileUrl: string; // direct download of the original
  releaseId: string | null; // e.g. "heic2501a"
  releasedAt: IsoDate;
  credit: string; // unaltered from pageUrl
  terms: { name: string; url: string };
  retrievedAt: IsoDate;
  file: {
    format: "tif" | "png" | "jpg" | "jp2";
    bytes: number;
    sha256: string; // 64 lowercase hex
    width: number;
    height: number;
  };
  validation: Validation;
  mock: boolean;
}

export interface Band {
  id: string; // filter or channel, e.g. "F475W", "AIA 171"
  // Absent until a source states it; the filter name alone is not a source for a number.
  wavelength?: { value: number; unit: "Å" | "nm" | "µm" };
  kind?: "line" | "continuum" | "broadband";
  region?: string; // e.g. "extreme ultraviolet", read on the Light rail; Sprint 8
}

// Never empty: an absent mapping would read as natural color.
export type ColorMapping =
  | { kind: "per-band"; entries: { bandId: string; color: string }[] } // non-empty
  | { kind: "grayscale" }
  | { kind: "standard-colortable"; name: string };

export type ProductType = "single exposure" | "stack" | "mosaic" | "multi-instrument composite";

// Written by scripts/generate-tiles.ts only. Never typed by hand.
export interface TilePyramid {
  format: "jpg";
  tileSize: number; // 256
  overlap: 0;
  width: number; // full-resolution pixels
  height: number;
  minLevel: 0;
  maxLevel: number; // level maxLevel is full resolution
  thumbnail: { width: number; height: number }; // <id>/thumbnail.jpg, long side 512
  preview: { width: number; height: number }; // <id>/preview.jpg, long side 2048
}

export interface ImageManifest {
  id: string; // file name and tile directory name
  sourceId: string; // data/sources/<sourceId>.json; credit, terms and URL come from there
  title: string;
  target: Claim<{ name: string; type: string }>;
  observatory: Claim<string>;
  instruments: Claim<string[]>; // mosaics may combine cameras
  bands: Claim<Band[]>;
  colorMapping: Claim<ColorMapping>;
  releasedAt: Claim<IsoDate>;
  productType: Claim<ProductType>;
  // Optional: absent means the app says nothing about it.
  // Both ends days, or both months when the source gives no day.
  observedAt?: Claim<{ start: IsoDate; end: IsoDate } | { start: IsoMonth; end: IsoMonth }>;
  processing?: Claim<string>;
  pixelScale?: Claim<{ value: number; unit: "arcsec/px" | "m/px" }>;
  fieldOfView?: Claim<string>;
  orientation?: Claim<string>;
  caveats?: string[]; // what users must see beside the image, from the science review
  tiles: TilePyramid;
  validation: Validation;
  mock: boolean;
}

// Image pixels from the top-left of the full-resolution file, as in design.md 6.3 and 6.4.
// z is zoom relative to the scale at which the whole image fits the viewer (6.3).
export interface Viewport {
  x: number;
  y: number;
  z: number;
}

export interface Stop {
  id: string;
  title: string;
  body: string; // plain text; blank lines separate paragraphs; rendered as text nodes
  viewport: Viewport;
  marker?: { x: number; y: number; r: number }; // image pixels
  sources: { label: string; url: string }[]; // at least one
  validation: Validation;
}

export interface Journey {
  slug: string; // file name and URL segment
  imageId: string;
  title: string;
  summary: string;
  stops: Stop[];
  validation: Validation;
  mock: boolean;
}
// What differs inside a pair or band set (compare-and-light.md, section 3, item 13).
export type Difference = "instrument" | "band" | "date" | "illumination" | "geometry" | "processing";

// Superseded in Sprint 7: Registration is a union of "none" and "similarity" with control
// points, and a pair names its `reference` and a `headline`; see docs/architecture-compare.md
// section 2. Images gain an optional `footprint`.

interface ImageGroup {
  id: string; // file name
  title: string;
  differs: Record<Difference, boolean>; // all six keys required
  registration: Registration;
  whatDiffers: string; // the "What differs?" note, shown once validated
  validation: Validation;
  mock: boolean;
}

export interface ComparePair extends ImageGroup {
  imageIds: [string, string]; // [before, after]; two distinct ids
  reference: string; // Sprint 7
  headline: string; // Sprint 7
}

export interface BandSet extends ImageGroup {
  imageIds: string[]; // rail order; at least two distinct ids
}
```

Not in the schema yet (planned): `center` and WCS, and planetary geometry (section 3 item 12).
They join with the first image that needs them (Compare, C-03). Pair and band set fields
(item 13) are built, D-09. A pair or set holds only image ids; credit, bands and dates come
from the images, so the pair and set files carry no claims of their own beyond the note.

**Supersedes** the viewport unit in `docs/design.md` section 4 ("0..1 width units"): stops
and the URL use image pixels and fit-relative zoom, the same numbers the readouts show
(6.3) and the unit 6.4 already requires for stop data. Conversion to OpenSeadragon's
width-normalized coordinates lives in one pure function (X-02):
`center = (x / W, y / W)`, `zoom = z * viewport.getHomeZoom()`. Design section 4 is
updated in X-02.

## 5. Validator (D-01)

Hand-written TypeScript, no dependency. Roughly 150 lines plus tests.

```ts
export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export const validateSource = (raw: unknown, file: string): Result<Source>;
export const validateImage = (raw: unknown, file: string): Result<ImageManifest>;
export const validateJourney = (raw: unknown, file: string): Result<Journey>;
export const validatePair = (raw: unknown, file: string): Result<ComparePair>;
export const validateBandSet = (raw: unknown, file: string): Result<BandSet>;
export const validateContent = (files: { path: string; raw: unknown }[]): Result<Content>;
```

- `check.ts` holds the small checkers (`str`, `int`, `isoDate`, `httpsUrl`, `oneOf`,
  `arrayOf`, `object` with unknown-key rejection). Each error reads
  `data/images/x.json: tiles.width: expected a positive integer, got -3`.
- Unknown keys are errors, so a typo cannot silently drop a field.
- Cross-file checks in `validateContent`: `id` or `slug` equals the file name; every
  `sourceId` and `imageId` resolves; `tiles.width` and `tiles.height` equal the source's
  `file.width` and `file.height`; stop viewports and markers lie inside the image;
  `z` is positive; `mock` is `true` exactly for files under `data/mock/`.
- Each validator returns `Result<T>` typed as the interface, so `tsc` catches a checker
  that drifts from its type.

Why not the alternatives:

- JSON Schema with Ajv: a second description of the same shapes beside the TypeScript
  types, plus a dependency, for three record types.
- Zod (4.x, no runtime dependencies, well maintained) would infer types from one schema
  and is the fallback if the hand-written checkers pass about 300 lines or start
  repeating themselves. It runs at build time only, so bundle size is not the concern;
  supply-chain surface and one more API for two people to learn are.

## 6. generate-tiles writes the manifest (D-04)

```
tsx scripts/generate-tiles.ts <input> <imageId> [--no-pyramid]
```

- Output: `public/tiles/<imageId>/<level>/<x>/<y>.jpg`, plus `thumbnail.jpg` and
  `preview.jpg` in the same directory.
- `poster.jpg` is one pyramid level joined from its tiles (`stitchPoster`): the coarsest level
  at least 1 170 px wide (`posterLevel` in `src/content/pyramid.ts`; a 390 px phone at 3x), level
  1 for Andromeda, 1319 by 308 px, 46 KB. `--poster-only` writes it from tiles already on disk.
  The Home strip offers it and `preview.jpg` (long side 2048, 112 KB) in one `srcset`,
  preloaded with high fetch priority, so the largest paint needs no script. `thumbnail.jpg`
  (long side 512) is the frame in the Journeys index. The thumbnail and the preview are cut by
  libvips from the same source as the pyramid, and their sizes go to the manifest's `tiles`.
- Level math moves to `src/content/pyramid.ts`. Level sizes round to the nearest pixel, as
  libvips does (levels 0 and 1 of Andromeda are 154 and 308 px high, not 155 and 309).
  Tile counts divide the unrounded size, as OpenSeadragon does (`ceil(w / 2^(maxLevel -
  level) / tileSize)`):

  ```ts
  export const levelSize = (w: number, h: number, maxLevel: number, level: number); // rounded
  export const tileCount = (w: number, h: number, tileSize: number, maxLevel: number, level: number); // { cols, rows }
  export const assertGrid = (size, grid, tileSize, label); // throws if the level cannot fill the grid
  ```

  The script resizes each level to exactly `levelSize` and throws if libvips returns a
  different size, or if the rounded level cannot fill the grid OpenSeadragon will ask for,
  rather than cutting from whatever it got.
- `maxLevel` stays 6 and `tileSize` 256, as today.
- After writing, it reads `data/images/<imageId>.json`, replaces only the `tiles` key and
  writes it back (2-space JSON, trailing newline). If the manifest does not exist, it
  stops with a message: the hand-written fields come first.
- `--no-pyramid` writes `thumbnail.jpg`, `preview.jpg` and the `tiles` block without
  touching the pyramid. It exists for Andromeda: regenerating 181 MB of tiles would add
  every blob to git again for no visible change.
- Tiles are served with immutable caching (section 12), so a changed tile tree needs a new
  image id. Regenerating the pyramid under an existing id leaves visitors on stale tiles
  until the bucket's cache is purged.

## 7. TILE_BASE_URL in a static build (D-07)

- Read once at build time in a server component through
  `resolveTileBase(process.env.TILE_BASE_URL)` in `src/content/tiles.ts`, and passed to
  the viewer as a `tileBaseUrl` prop. It ends up in the static HTML and payload, which is
  fine: it is a public URL, not a secret. No `NEXT_PUBLIC_` duplicate.
- `resolveTileBase`: unset gives `/tiles`; accepts a root-relative path or an `https://`
  URL; strips one trailing slash; anything else throws, failing the build.
- One build serves one base. Switching from local tiles to R2 means rebuilding with a
  different `TILE_BASE_URL`; a runtime switch would need a fetched config file and is not
  required.
- R2 credentials are never read by the app; only the sync script (D-08) reads them.

## 8. Tile layout to OpenSeadragon

The existing layout already matches OpenSeadragon's default level numbering when
`maxLevel` is given explicitly. Level `L` has scale `1 / 2^(maxLevel - L)`, and the tile
count is `ceil(scale * width / tileSize)`. Checked against the tree:
`hubble-mosaic-high` has 3x1, 6x2, 11x3, 21x5, 42x10, 83x20 and 165x39 tiles at levels 0
to 6, which is exactly that formula for 42208 x 9870.

```ts
export const tileUrl = (base: string, id: string, level: number, x: number, y: number) =>
  `${base}/${encodeURIComponent(id)}/${level}/${x}/${y}.jpg`;

export const tileSource = (image: ImageManifest, base: string) => ({
  width: image.tiles.width,
  height: image.tiles.height,
  tileSize: image.tiles.tileSize,
  tileOverlap: 0,
  minLevel: image.tiles.minLevel,
  maxLevel: image.tiles.maxLevel,
  getTileUrl: (level: number, x: number, y: number) => tileUrl(base, image.id, level, x, y),
});
```

The viewer sets `crossOriginPolicy: "Anonymous"`. OpenSeadragon 5.0.1 (installed)
prefers its WebGL drawer, which needs CORS-clean tiles once they come from another
origin; setting it now keeps the local and R2 builds identical. R-01 already lists CORS.

## 9. Production gate (D-06)

`src/content/gate.ts`:

```ts
export const publishProblems = (content: Content): string[];
```

Returns one message per problem; empty means publishable. Rules:

- Any record with `mock: true`.
- Any source, image, Journey or stop whose `validation.status` is not `approved`.
- Any `Claim` with status `unverified`.
- A pair or band set that is mock, not approved, or uses an image that is not approved.
- A Journey with fewer than 5 or more than 8 stops, or whose image is not approved.

`loadContent` in `production` mode throws if the list is not empty, so `next build`
fails; the message lists every problem. `scripts/validate-content.ts` runs the same
`loadContent` in a chosen mode for fast feedback, and CI runs it before the build so a
failure reads as a content error rather than a prerender stack. Mock files live under
`data/mock/` and are never read in production, so the mock rule only fires when a mock
leaks into the real directories.

Mock content (D-09, built): `data/mock/` holds a Compare pair `mock-compare` (two images) and a
Light band set `mock-light` (three bands), synthetic grids with a disc,
flagged `mock: true`, status `draft`, claims `unverified`, credit "Not NASA data". Since
Sprint 7 the pair has real geometry: the moving image (400 x 240) is drawn from the reference
scene at scale 2, turned 7.3 degrees, with a stepped black corner, a footprint polygon and
eight exact star control points (refit residual below 1e-6 px).
`npm run generate-mock` rewrites them and their tile trees under `public/tiles/mock-*`
(about 600 KB). `next dev` shows them; production never reads `data/mock/`, and the gate
rejects a mock that leaks into `data/`. `next build` copies `public/` into `out/`, so a
`postbuild` step (`scripts/strip-mock-tiles.ts`) removes `out/tiles/mock-*`; the R2 sync
skips `mock-*` directories too (section 12).

## 10. Slices in build order

Each leaves `npm test`, `npm run build` and the end-to-end suite green.

1. **B-08 Next 16.** Bump `next`, `eslint-config-next`, `react`, `react-dom` and types;
   drop `--turbopack`; flat ESLint config without `FlatCompat`. Still a server build.
   Tests: existing suite unchanged; `npm audit --audit-level=high` clean; CI (B-02) green.
2. **D-01 Types, validator, gate.** `types.ts`, `check.ts`, `validate.ts`, `gate.ts`
   with fixtures under `src/content/__fixtures__/`. Unit tests: one valid fixture per
   type passes; one invalid fixture per rule fails with the expected path (missing
   field, unknown key, bad date, bad URL, bad hash, empty color mapping, viewport outside
   the image, dangling `sourceId` or `imageId`, size mismatch with the source,
   `mock` outside `data/mock/`); gate: each rule above yields a problem, an approved
   set yields none.
3. **D-02 Andromeda source.** `data/sources/andromeda-phat-phast-2025.json` from
   `docs/science/sources.md`, sha256 of the original computed once, validated by the
   science review. Test: the real `data/` directory validates in development mode.
4. **D-03 Fetch.** `scripts/fetch-source.ts <sourceId>` downloads with `fetch` into
   `.cache/sources/<id>.<format>`, streams through `node:crypto` sha256, checks bytes and
   hash, skips a cached file that already matches. `.cache/` added to `.gitignore` in the
   same commit. Unit tests with an injected `fetch` and a small local fixture: match,
   hash mismatch removes the file and throws, size mismatch, cache hit makes no request.
5. **D-04 Tiles and manifest.** `pyramid.ts`; `generate-tiles` writes thumbnail,
   preview and the `tiles` block; `--no-pyramid`. Unit tests: `levelSize` and
   `tileCount` against the Andromeda numbers in section 8 and edge sizes (1 px,
   exact multiples of 256). Integration test: a 1000 x 300 image built in memory with
   wasm-vips, tiled into a temp dir; tile counts per level equal `tileCount`, edge tile
   sizes are right, and the manifest gets the expected `tiles` block with other keys
   untouched.
6. **D-05 Manifests replace the API; static export.** `data/images/` for Andromeda
   (`tiles` from `--no-pyramid`); `load.ts`; home page reads it and passes it to
   `DeepViewer`, which no longer fetches; delete `src/app/api/` and `ImageMeta`;
   `next.config.ts` as in section 2; `serve-static.ts`; `npm start` and Playwright use
   it; `wasm-vips` moves to `devDependencies`. Tests: `loadContent` against fixture
   roots (mock read in development only, a malformed file throws with its path); the
   current "matches the tile tree" test moves here and runs over every manifest in
   `data/images/`; `serve-static` unit tests (index resolution, 404, path traversal
   rejected); end to end: home renders the viewer and requests a tile under `/tiles/`.
7. **D-06 Gate on.** `loadContent` runs `publishProblems` in production; add
   `scripts/validate-content.ts`, `npm run validate`, and a CI step before the build.
   Tests: integration, `loadContent` in production mode throws on a fixture root with a
   draft image and on one with a mock leaked into `data/images/`, and passes on an
   approved root; the CI build of the real content is the passing outcome.
8. **D-07 Tile base.** `resolveTileBase`, `tileUrl`, `tileSource`; viewer takes
   `tileBaseUrl`. Unit tests: default, relative path, `https` URL, trailing slash, `http`
   and `javascript:` rejected, ids encoded. End to end: the default build requests tiles
   under `/tiles/`. A remote base is covered by the unit tests, since the suite has no
   network and `http` hosts are rejected by design.

## 11. Risks and what to test first

1. **The gate blocks the build until Andromeda is approved.** Every required claim
   (target, observatory, instruments, bands, color mapping, release date, product type)
   needs a source and a `verified` or `supported` status from science review before
   D-06 merges. Start that review during slice 2, not after slice 6.
2. **Tile count drift.** If libvips rounds a level size differently from OpenSeadragon,
   the viewer requests tiles that do not exist. Slice 5's per-level count test is the
   guard; it is the first test to write.
3. **ESLint flat config under `eslint-config-next` 16** is the likeliest B-08 break;
   run lint first after the bump.
4. **Static export surprises**: anything reading request data or using the default image
   loader fails only at `next build`. Build with `output: 'export'` early in slice 6,
   before moving the viewer.
5. **Decided on 2026-11-17**: rename `public/tiles/hubble-mosaic-high` to
   `andromeda-phat-phast-2025` with `git mv` (same blobs, no repo growth) so the image id
   equals the source id, and delete the unused `public/tiles/hubble-mosaic` set, which
   the viewer never loads (it stays recoverable from history). Stops and URLs use image
   pixels with zoom relative to fit.

## 12. R2 sync (D-08)

Status: built and unit-tested with a mocked `fetch`; **not yet run against a real bucket**
(R-01 creates it).

```
npm run sync-r2 -- [--dir public/tiles] [--apply]
```

- Dry run is the default. It lists each file it would upload with its size and whether it
  is `new` or `changed`, then a total. `--apply` uploads.
- Credentials come from `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
  `R2_BUCKET`, read from the environment only. Output never contains a value, only the
  names of missing variables. A dry run without them makes no request and treats every
  file as new; `--apply` without them stops.
- No dependency: R2's S3 API is called with `fetch`, signed with AWS Signature Version 4
  (`node:crypto`, `signRequest`, about 30 lines) against `https://<account>.r2.cloudflarestorage.com/<bucket>`,
  region `auto`. A unit test reproduces two signatures published in the AWS documentation
  (the `get-vanilla` suite case and the S3 GET Object example with a Range header).
- Incremental: it lists the bucket (ListObjectsV2, paged) and skips a file whose size equals
  the object's and whose MD5 equals its ETag. A multipart ETag never matches, so such an
  object is uploaded again. Nothing is ever deleted from the bucket.
- Each object gets `Content-Type` by extension and `Cache-Control: public, max-age=31536000,
  immutable`. Keys are the paths under `public/tiles/` (`<imageId>/<level>/<x>/<y>.jpg`),
  so `TILE_BASE_URL` is the bucket's public origin. Immutable caching assumes a changed
  tile tree gets a new image id; regenerating under the same id needs a cache purge.
- `mock-*` directories and dotfiles are skipped.
- Uploads run eight at a time; a failure is reported and the exit code is 1, and a rerun
  uploads only what is missing.

## 13. Light (G-01, Sprint 8)

Light reuses the Compare layer pattern (`docs/architecture-compare.md`, sections 1 and 9).

- **Where.** A band set is offered on the page of its first image, `imageIds[0]`, never on a
  Journey. The page receives every band's manifest and credit (`LightView`), so the client
  needs nothing else.
- **One viewer, one grid.** The first band is the world's first image and keeps the home
  bounds; the others are added at `x 0, y 0, width 1` with `setAutoRefigureSizes(false)` and
  kept in rail order (`src/components/light/useLightLayer.ts`). Only `registration.transform`
  `"none"` is drawn; the validator requires every image of such a set to have the same pixel size.
- **Crossfade.** `crossfade(position, count)` in `src/viewer/light.ts`: the lower band of the
  two around the position at opacity 1, the upper at the fraction, every other band at 0, so
  the screen shows `(1 - t) A + t B`. OpenSeadragon neither draws nor loads an image at
  opacity 0, so `preloaded()` keeps the bands within one stop of the position loading. The
  navigator mirrors every band and copies its opacity, so the overview crossfades too; its
  mirrors are put in the same order. A band shown again without a pan would keep the stale
  "fully loaded" flag OpenSeadragon gave it while hidden and draw nothing, so the layer raises
  the image's update flag when it becomes visible (5.0.1 internals, one line).
- **Loading.** The page counts as loading while any image at non-zero opacity waits for
  tiles (all modes), not only the first.
- **Validation.** A band set's images carry one band each. Where every band states a
  wavelength, `imageIds` must rise in wavelength (units converted for the comparison only).
- **URL.** `?mode=light&set=<setId>&band=<imageId>&x=&y=&z=`; `set` and `band` are left out
  at their defaults (the first set, the first band); an unknown value falls back to the
  default. `x`, `y` and `z` are in the first band's pixels, the same for every band.
- **Drawer.** Light pages use the canvas drawer, as Compare pages do.

### The Sun from SDO (G-02)

- Seven Helioviewer JPEGs (4096 x 4096, one per channel, within 30.4 s of 2024-05-10 12:00
  UTC) are staged drafts in `data/staging/` (`sun-sdo-2024-05-10-*`), with the band set
  `sun-sdo-2024-05-10` in rail order 94, 171, 193, 211, 304, 1700 and 6173 Å. Sources, frame,
  scale, orientation and credit: `docs/science/sun-sdo.md`.
- `registration` "none" now carries the residual a check measured and optional `notes`
  (synthetic sets keep 0). The SDO set records the limb and sunspot check: 2.05 px RMS.
- `whatDiffers` may be empty in a draft; the gate refuses to publish a pair or band set
  whose note is empty. The Light bar offers "What differs?" only when there is a note.
- Tiles, measured: 2,422 files, 22.9 MB of JPEG (27.2 MB on disk), 2.8 to 6.2 MB per channel
  (94 Å the heaviest, HMI the lightest). Committed, like the Hubble pair; staged tile trees stay
  out of `out/` and the bucket until the records move to `data/`.

