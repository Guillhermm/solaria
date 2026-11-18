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
  mock/{images,journeys}/ mock content, loaded by `next dev` only (D-09)
scripts/                  pipeline, Node only, never imported by the app
  fetch-source.ts         download an original into .cache/sources/, check sha256
  generate-tiles.ts       pyramid, thumbnail, preview, `tiles` block
  validate-content.ts     same checks the build runs, for fast feedback and CI
  serve-static.ts         serves out/ on 127.0.0.1 for `npm start` and end-to-end tests
src/content/              no React, no browser
  types.ts                the shapes in section 4
  check.ts                small field checkers used by validate.ts
  validate.ts             unknown JSON -> typed value or a list of errors
  gate.ts                 production publish rules
  pyramid.ts              level sizes and tile counts (shared with generate-tiles)
  tiles.ts                tile base URL resolution, tile URL, OpenSeadragon tile source
  load.ts                 the only module that touches the file system
src/app/                  server components: call getContent(), pass plain objects down
src/components/           client components: receive a manifest and a tile base as props
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

- Reads `data/{sources,images,journeys}/*.json` with `readdirSync` and `JSON.parse`, so a
  new file needs no index entry. Reads `data/mock/**` only when `mode` is `development`.
- Runs `validateContent` (section 5), then in `production` mode `publishProblems`
  (section 9). Any problem throws one `ContentError` whose message lists every problem
  with its file and field path. Thrown during prerender, it fails `next build`.
- `next build` sets `NODE_ENV=production`; `next dev` sets `development`. Tests call
  `loadContent` with an explicit `root` pointing at fixtures and an explicit `mode`.
- Pages are server components. They call `getContent()`, pick what they need and pass
  plain objects to client components as props. The browser never fetches a manifest.
- `/[slug]` (X-01, Sprint 4) will use `generateStaticParams` over `journeys` with
  `dynamicParams = false`, as static export requires.

## 4. Types (D-01)

`src/content/types.ts`. These are the contract; the validator enforces them.

```ts
// Content = { sources: Source[]; images: ImageManifest[]; journeys: Journey[] } is exported too.
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
```

Not in the schema yet (planned): `center` and WCS, planetary geometry (section 3 item 12)
and pair fields (item 13). They join with the first image that needs them (Compare, C-03).

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
- A Journey with fewer than 5 or more than 8 stops, or whose image is not approved.

`loadContent` in `production` mode throws if the list is not empty, so `next build`
fails; the message lists every problem. `scripts/validate-content.ts` runs the same
`loadContent` in a chosen mode for fast feedback, and CI runs it before the build so a
failure reads as a content error rather than a prerender stack. Mock files live under
`data/mock/` and are never read in production, so the mock rule only fires when a mock
leaks into the real directories.

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
