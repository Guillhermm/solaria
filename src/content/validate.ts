import {
  type Ctx,
  arrayOf,
  bool,
  fail,
  httpsUrl,
  int,
  isoDate,
  isoMonth,
  literal,
  newCtx,
  num,
  object,
  oneOf,
  sha256,
  str,
} from "./check";
import type {
  Band,
  BandSet,
  ControlPoint,
  Claim,
  ClaimStatus,
  ColorMapping,
  ComparePair,
  Content,
  Difference,
  ImageManifest,
  Journey,
  PairLabel,
  ProductType,
  Registration,
  Similarity,
  Source,
  Stop,
  TilePyramid,
  Validation,
} from "./types";
import { MIN_CONTROL_POINTS, fitSimilarity, residuals } from "./registration";

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

type Draft<T> = { [K in keyof T]?: T[K] | undefined };

// Returns the value only when no error was recorded since `since`.
const finish = <T>(c: Ctx, since: number, draft: Draft<T>) =>
  c.errors.length > since ? undefined : (draft as T);

const result = <T>(c: Ctx, value: T | undefined): Result<T> =>
  c.errors.length > 0 || value === undefined ? { ok: false, errors: c.errors } : { ok: true, value };

const bad = <T>(c: Ctx): Result<T> => ({ ok: false, errors: c.errors });

const dims = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["width", "height"]);
  if (!o) return undefined;
  return finish<{ width: number; height: number }>(c, n, {
    width: int(c, o.width, `${path}.width`),
    height: int(c, o.height, `${path}.height`),
  });
};

const reviewStatus = ["draft", "in-review", "approved", "rejected"] as const;

const validation = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["status", "date", "notes"]);
  if (!o) return undefined;
  const status = oneOf(c, o.status, `${path}.status`, reviewStatus);
  const date = o.date === null && status !== "approved" ? null : isoDate(c, o.date, `${path}.date`);
  return finish<Validation>(c, n, { status, date, notes: str(c, o.notes, `${path}.notes`, true) });
};

const SOURCE_REF = /^(https:\/\/\S+|(?!\/)(?!.*\.\.)[\w./-]+\.md(#[\w.-]+)?)$/;

const claim = <T>(
  c: Ctx,
  v: unknown,
  path: string,
  inner: (v: unknown, path: string) => T | undefined,
) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["value", "source", "status"]);
  if (!o) return undefined;
  let source: string | undefined;
  if (typeof o.source === "string" && SOURCE_REF.test(o.source)) source = o.source;
  else fail(c, `${path}.source`, "an https URL or a repo path such as docs/science/sources.md#1", o.source);
  return finish<Claim<T>>(c, n, {
    value: inner(o.value, `${path}.value`),
    source,
    status: oneOf<ClaimStatus>(c, o.status, `${path}.status`, ["verified", "supported", "unverified"]),
  });
};

const optionalClaim = <T>(
  c: Ctx,
  o: Record<string, unknown>,
  key: string,
  inner: (v: unknown, path: string) => T | undefined,
) => (key in o ? claim(c, o[key], key, inner) : undefined);

export const validateSource = (raw: unknown, file: string): Result<Source> => {
  const c = newCtx(file);
  const o = object(c, raw, "", [
    "id", "title", "pageUrl", "fileUrl", "releaseId", "releasedAt", "credit",
    "terms", "retrievedAt", "file", "validation", "mock",
  ]);
  if (!o) return bad(c);
  const n = c.errors.length;
  let terms: Source["terms"] | undefined;
  const tn = c.errors.length;
  const t = object(c, o.terms, "terms", ["name", "url"]);
  if (t) terms = finish<Source["terms"]>(c, tn, { name: str(c, t.name, "terms.name"), url: httpsUrl(c, t.url, "terms.url") });
  let fileInfo: Source["file"] | undefined;
  const fn = c.errors.length;
  const f = object(c, o.file, "file", ["format", "bytes", "sha256", "width", "height"]);
  if (f) {
    fileInfo = finish<Source["file"]>(c, fn, {
      format: oneOf(c, f.format, "file.format", ["tif", "png", "jpg", "jp2"]),
      bytes: int(c, f.bytes, "file.bytes"),
      sha256: sha256(c, f.sha256, "file.sha256"),
      width: int(c, f.width, "file.width"),
      height: int(c, f.height, "file.height"),
    });
  }
  const value = finish<Source>(c, n, {
    id: str(c, o.id, "id"),
    title: str(c, o.title, "title"),
    pageUrl: httpsUrl(c, o.pageUrl, "pageUrl"),
    fileUrl: httpsUrl(c, o.fileUrl, "fileUrl"),
    releaseId: o.releaseId === null ? null : str(c, o.releaseId, "releaseId"),
    releasedAt: isoDate(c, o.releasedAt, "releasedAt"),
    credit: str(c, o.credit, "credit"),
    terms,
    retrievedAt: isoDate(c, o.retrievedAt, "retrievedAt"),
    file: fileInfo,
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  });
  return result(c, value);
};

const band = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["id"], ["wavelength", "kind"]);
  if (!o) return undefined;
  let wavelength: Band["wavelength"];
  if ("wavelength" in o) {
    const wn = c.errors.length;
    const w = object(c, o.wavelength, `${path}.wavelength`, ["value", "unit"]);
    if (w) {
      wavelength = finish<NonNullable<Band["wavelength"]>>(c, wn, {
        value: num(c, w.value, `${path}.wavelength.value`, true),
        unit: oneOf(c, w.unit, `${path}.wavelength.unit`, ["Å", "nm", "µm"]),
      });
    }
  }
  const value = finish<Band>(c, n, {
    id: str(c, o.id, `${path}.id`),
    wavelength,
    kind: "kind" in o ? oneOf(c, o.kind, `${path}.kind`, ["line", "continuum", "broadband"]) : undefined,
  });
  if (value) {
    if (value.wavelength === undefined) delete value.wavelength;
    if (value.kind === undefined) delete value.kind;
  }
  return value;
};

const colorMapping = (c: Ctx, v: unknown, path: string): ColorMapping | undefined => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return fail(c, path, "an object", v);
  if (!("kind" in v)) {
    c.errors.push(`${c.file}: ${path}.kind: missing`);
    return undefined;
  }
  const kind = oneOf(c, (v as Record<string, unknown>).kind, `${path}.kind`, [
    "per-band", "grayscale", "standard-colortable",
  ]);
  if (kind === "grayscale") {
    return object(c, v, path, ["kind"]) ? { kind } : undefined;
  }
  if (kind === "standard-colortable") {
    const o = object(c, v, path, ["kind", "name"]);
    const name = o && str(c, o.name, `${path}.name`);
    return name ? { kind, name } : undefined;
  }
  if (kind === "per-band") {
    const o = object(c, v, path, ["kind", "entries"]);
    if (!o) return undefined;
    const entries = arrayOf(
      c,
      o.entries,
      `${path}.entries`,
      (e, p) => {
        const n = c.errors.length;
        const eo = object(c, e, p, ["bandId", "color"]);
        if (!eo) return undefined;
        return finish<{ bandId: string; color: string }>(c, n, {
          bandId: str(c, eo.bandId, `${p}.bandId`),
          color: str(c, eo.color, `${p}.color`),
        });
      },
      true,
    );
    return entries ? { kind, entries } : undefined;
  }
  return undefined;
};

const tiles = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, [
    "format", "tileSize", "overlap", "width", "height", "minLevel", "maxLevel", "thumbnail", "preview",
  ]);
  if (!o) return undefined;
  return finish<TilePyramid>(c, n, {
    format: literal(c, o.format, `${path}.format`, "jpg"),
    tileSize: int(c, o.tileSize, `${path}.tileSize`),
    overlap: literal(c, o.overlap, `${path}.overlap`, 0),
    width: int(c, o.width, `${path}.width`),
    height: int(c, o.height, `${path}.height`),
    minLevel: literal(c, o.minLevel, `${path}.minLevel`, 0),
    maxLevel: int(c, o.maxLevel, `${path}.maxLevel`, 0),
    thumbnail: dims(c, o.thumbnail, `${path}.thumbnail`),
    preview: dims(c, o.preview, `${path}.preview`),
  });
};

const productTypes = ["single exposure", "stack", "mosaic", "multi-instrument composite"] as const;
// Both ends at the same precision: days, or months when the source gives no day.
const observedRange = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["start", "end"]);
  if (!o) return undefined;
  const months = typeof o.start === "string" && o.start.length === 7;
  const check = months ? isoMonth : isoDate;
  const range = finish<{ start: string; end: string }>(c, n, {
    start: check(c, o.start, `${path}.start`),
    end: check(c, o.end, `${path}.end`),
  });
  if (range && range.start > range.end) {
    c.errors.push(`${c.file}: ${path}: start ${range.start} is after end ${range.end}`);
    return undefined;
  }
  return range;
};

const point = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["x", "y"]);
  return o && finish<{ x: number; y: number }>(c, n, { x: num(c, o.x, `${path}.x`), y: num(c, o.y, `${path}.y`) });
};

export const validateImage = (raw: unknown, file: string): Result<ImageManifest> => {
  const c = newCtx(file);
  const o = object(
    c,
    raw,
    "",
    [
      "id", "sourceId", "title", "target", "observatory", "instruments", "bands", "colorMapping",
      "releasedAt", "productType", "tiles", "validation", "mock",
    ],
    ["observedAt", "processing", "pixelScale", "fieldOfView", "orientation", "caveats", "footprint"],
  );
  if (!o) return bad(c);
  const n = c.errors.length;
  const pairOf = () => (v: unknown, p: string) => {
    const m = c.errors.length;
    const po = object(c, v, p, ["name", "type"]);
    return po && finish<{ name: string; type: string }>(c, m, { name: str(c, po.name, `${p}.name`), type: str(c, po.type, `${p}.type`) });
  };
  const value = finish<ImageManifest>(c, n, {
    id: str(c, o.id, "id"),
    sourceId: str(c, o.sourceId, "sourceId"),
    title: str(c, o.title, "title"),
    target: claim(c, o.target, "target", pairOf()),
    observatory: claim(c, o.observatory, "observatory", (v, p) => str(c, v, p)),
    instruments: claim(c, o.instruments, "instruments", (v, p) => arrayOf(c, v, p, (x, q) => str(c, x, q), true)),
    bands: claim(c, o.bands, "bands", (v, p) => arrayOf(c, v, p, (x, q) => band(c, x, q), true)),
    colorMapping: claim(c, o.colorMapping, "colorMapping", (v, p) => colorMapping(c, v, p)),
    releasedAt: claim(c, o.releasedAt, "releasedAt", (v, p) => isoDate(c, v, p)),
    productType: claim(c, o.productType, "productType", (v, p) => oneOf<ProductType>(c, v, p, productTypes)),
    observedAt: optionalClaim(c, o, "observedAt", (v, p) => observedRange(c, v, p)),
    processing: optionalClaim(c, o, "processing", (v, p) => str(c, v, p)),
    pixelScale: optionalClaim(c, o, "pixelScale", (v, p) => {
      const m = c.errors.length;
      const po = object(c, v, p, ["value", "unit"]);
      return po && finish<{ value: number; unit: "arcsec/px" | "m/px" }>(c, m, {
        value: num(c, po.value, `${p}.value`, true),
        unit: oneOf(c, po.unit, `${p}.unit`, ["arcsec/px", "m/px"]),
      });
    }),
    fieldOfView: optionalClaim(c, o, "fieldOfView", (v, p) => str(c, v, p)),
    orientation: optionalClaim(c, o, "orientation", (v, p) => str(c, v, p)),
    caveats: "caveats" in o ? arrayOf(c, o.caveats, "caveats", (x, q) => str(c, x, q)) : undefined,
    footprint:
      "footprint" in o
        ? arrayOf(c, o.footprint, "footprint", (poly, p) => {
            const pts = arrayOf(c, poly, p, (pt, q) => point(c, pt, q));
            return pts && pts.length < 3 ? fail(c, p, "a polygon of at least 3 points", poly) : pts;
          }, true)
        : undefined,
    tiles: tiles(c, o.tiles, "tiles"),
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  });
  if (value) {
    for (const k of ["observedAt", "processing", "pixelScale", "fieldOfView", "orientation", "caveats", "footprint"] as const) {
      if (value[k] === undefined) delete value[k];
    }
  }
  return result(c, value);
};

const stop = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["id", "title", "body", "viewport", "sources", "validation"], ["marker"]);
  if (!o) return undefined;
  const vn = c.errors.length;
  const vo = object(c, o.viewport, `${path}.viewport`, ["x", "y", "z"]);
  const viewport = vo && finish<Stop["viewport"]>(c, vn, {
    x: num(c, vo.x, `${path}.viewport.x`),
    y: num(c, vo.y, `${path}.viewport.y`),
    z: num(c, vo.z, `${path}.viewport.z`, true),
  });
  let marker: Stop["marker"];
  if ("marker" in o) {
    const mn = c.errors.length;
    const mo = object(c, o.marker, `${path}.marker`, ["x", "y", "r"]);
    marker = mo && finish<NonNullable<Stop["marker"]>>(c, mn, {
      x: num(c, mo.x, `${path}.marker.x`),
      y: num(c, mo.y, `${path}.marker.y`),
      r: num(c, mo.r, `${path}.marker.r`, true),
    });
  }
  const value = finish<Stop>(c, n, {
    id: str(c, o.id, `${path}.id`),
    title: str(c, o.title, `${path}.title`),
    body: str(c, o.body, `${path}.body`),
    viewport,
    marker,
    sources: arrayOf(
      c,
      o.sources,
      `${path}.sources`,
      (s, p) => {
        const m = c.errors.length;
        const so = object(c, s, p, ["label", "url"]);
        return so && finish<{ label: string; url: string }>(c, m, { label: str(c, so.label, `${p}.label`), url: httpsUrl(c, so.url, `${p}.url`) });
      },
      true,
    ),
    validation: validation(c, o.validation, `${path}.validation`),
  });
  if (value && value.marker === undefined) delete value.marker;
  return value;
};

export const validateJourney = (raw: unknown, file: string): Result<Journey> => {
  const c = newCtx(file);
  const o = object(c, raw, "", ["slug", "imageId", "title", "summary", "stops", "validation", "mock"]);
  if (!o) return bad(c);
  const n = c.errors.length;
  const value = finish<Journey>(c, n, {
    slug: str(c, o.slug, "slug"),
    imageId: str(c, o.imageId, "imageId"),
    title: str(c, o.title, "title"),
    summary: str(c, o.summary, "summary"),
    stops: arrayOf(c, o.stops, "stops", (s, p) => stop(c, s, p)),
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  });
  return result(c, value);
};

const differences = ["instrument", "band", "date", "illumination", "geometry", "processing"] as const;

const controlPoint = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["label", "moving", "reference"]);
  return o && finish<ControlPoint>(c, n, {
    label: str(c, o.label, `${path}.label`),
    moving: point(c, o.moving, `${path}.moving`),
    reference: point(c, o.reference, `${path}.reference`),
  });
};

const similarity = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["scale", "rotationDeg", "tx", "ty"]);
  return o && finish<Similarity>(c, n, {
    scale: num(c, o.scale, `${path}.scale`, true),
    rotationDeg: num(c, o.rotationDeg, `${path}.rotationDeg`),
    tx: num(c, o.tx, `${path}.tx`),
    ty: num(c, o.ty, `${path}.ty`),
  });
};

const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// The stored transform and residuals must be what the control points give, so the file
// cannot drift from its points (docs/architecture-compare.md, section 2).
const checkRefit = (c: Ctx, r: Extract<Registration, { transform: "similarity" }>) => {
  const fit = fitSimilarity(r.controlPoints);
  const res = residuals(fit, r.controlPoints);
  for (const k of ["scale", "rotationDeg", "tx", "ty"] as const) {
    if (!close(r.similarity[k], fit[k], 1e-9)) {
      c.errors.push(`${c.file}: registration.similarity.${k}: ${r.similarity[k]} does not match the refit ${fit[k]}; run scripts/register-pair.ts`);
    }
  }
  if (Math.abs(r.residualPx - res.rms) > 1e-3) {
    c.errors.push(`${c.file}: registration.residualPx: ${r.residualPx} does not match the refit ${res.rms}; run scripts/register-pair.ts`);
  }
  if (Math.abs(r.maxResidualPx - res.max) > 1e-3) {
    c.errors.push(`${c.file}: registration.maxResidualPx: ${r.maxResidualPx} does not match the refit ${res.max}; run scripts/register-pair.ts`);
  }
};

const registration = (c: Ctx, v: unknown): Registration | undefined => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return fail(c, "registration", "an object", v);
  const transform = oneOf(c, (v as Record<string, unknown>).transform, "registration.transform", ["none", "similarity"]);
  if (transform === undefined) {
    if (!("transform" in v)) c.errors.push(`${c.file}: registration.transform: missing`);
    return undefined;
  }
  const n = c.errors.length;
  if (transform === "none") {
    const r = object(c, v, "registration", ["method", "transform", "residualPx"]);
    return r && finish<Registration>(c, n, {
      method: str(c, r.method, "registration.method"),
      transform,
      residualPx: literal(c, r.residualPx, "registration.residualPx", 0),
    });
  }
  const r = object(c, v, "registration", ["method", "transform", "controlPoints", "similarity", "residualPx", "maxResidualPx"]);
  if (!r) return undefined;
  const points = arrayOf(c, r.controlPoints, "registration.controlPoints", (x, p) => controlPoint(c, x, p));
  if (points && points.length < MIN_CONTROL_POINTS) {
    fail(c, "registration.controlPoints", `at least ${MIN_CONTROL_POINTS} control points`, `${points.length} points`);
  }
  const value = finish<Extract<Registration, { transform: "similarity" }>>(c, n, {
    method: str(c, r.method, "registration.method"),
    transform,
    controlPoints: points,
    similarity: similarity(c, r.similarity, "registration.similarity"),
    residualPx: nonNegative(c, r.residualPx, "registration.residualPx"),
    maxResidualPx: nonNegative(c, r.maxResidualPx, "registration.maxResidualPx"),
  });
  if (value) checkRefit(c, value);
  return value;
};

const group = (c: Ctx, o: Record<string, unknown>, ids: (v: unknown, p: string) => string[] | undefined) => {
  const dn = c.errors.length;
  const d = object(c, o.differs, "differs", differences);
  const differs =
    d && finish<Record<Difference, boolean>>(c, dn, Object.fromEntries(differences.map((k) => [k, bool(c, d[k], `differs.${k}`)])) as Draft<Record<Difference, boolean>>);
  return {
    id: str(c, o.id, "id"),
    title: str(c, o.title, "title"),
    imageIds: ids(o.imageIds, "imageIds"),
    differs,
    registration: registration(c, o.registration),
    whatDiffers: str(c, o.whatDiffers, "whatDiffers"),
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  };
};

const nonNegative = (c: Ctx, v: unknown, path: string) => {
  const n = num(c, v, path);
  return n !== undefined && n < 0 ? fail(c, path, "a number of zero or more", v) : n;
};

const GROUP_KEYS = ["id", "title", "imageIds", "differs", "registration", "whatDiffers", "validation", "mock"];

const distinct = (c: Ctx, ids: string[] | undefined, path: string) => {
  if (ids && new Set(ids).size !== ids.length) return fail(c, path, "distinct image ids", ids);
  return ids;
};

export const validatePair = (raw: unknown, file: string): Result<ComparePair> => {
  const c = newCtx(file);
  const o = object(c, raw, "", [...GROUP_KEYS, "reference", "headline", "labels"]);
  if (!o) return bad(c);
  const n = c.errors.length;
  const g = group(c, o, (v, p) => {
    const ids = arrayOf(c, v, p, (x, q) => str(c, x, q), true);
    if (ids && ids.length !== 2) return fail(c, p, "exactly two image ids", ids);
    return distinct(c, ids, p);
  });
  let reference = str(c, o.reference, "reference");
  if (reference !== undefined && g.imageIds && !g.imageIds.includes(reference)) {
    reference = fail(c, "reference", `one of imageIds (${g.imageIds.join(", ")})`, reference);
  }
  let labels = arrayOf(c, o.labels, "labels", (v, p) => {
    const m = c.errors.length;
    const lo = object(c, v, p, ["full", "short"]);
    return lo && finish<PairLabel>(c, m, { full: str(c, lo.full, `${p}.full`), short: str(c, lo.short, `${p}.short`) });
  });
  if (labels && labels.length !== 2) labels = fail(c, "labels", "two labels, in imageIds order", labels);
  const value = finish<ComparePair>(c, n, { ...g, reference, headline: str(c, o.headline, "headline"), labels } as Draft<ComparePair>);
  return result(c, value);
};

export const validateBandSet = (raw: unknown, file: string): Result<BandSet> => {
  const c = newCtx(file);
  const o = object(c, raw, "", GROUP_KEYS);
  if (!o) return bad(c);
  const n = c.errors.length;
  const value = finish<BandSet>(
    c,
    n,
    group(c, o, (v, p) => {
      const ids = arrayOf(c, v, p, (x, q) => str(c, x, q), true);
      if (ids && ids.length < 2) return fail(c, p, "at least two image ids", ids);
      return distinct(c, ids, p);
    }) as Draft<BandSet>,
  );
  return result(c, value);
};

type Kind = "sources" | "images" | "journeys" | "pairs" | "band-sets";

const classify = (path: string) => {
  const m = /^data\/(mock\/)?(sources|images|journeys|pairs|band-sets)\/([^/]+)\.json$/.exec(path);
  return m ? { kind: m[2] as Kind, name: m[3], mock: m[1] !== undefined } : undefined;
};

export const validateContent = (files: { path: string; raw: unknown }[]): Result<Content> => {
  const errors: string[] = [];
  const content: Content = { sources: [], images: [], journeys: [], pairs: [], bandSets: [] };
  const fileOf = new Map<unknown, string>();

  for (const { path, raw } of files) {
    const info = classify(path);
    if (!info) {
      errors.push(`${path}: not a content file (expected data/{sources,images,journeys,pairs,band-sets}/<name>.json or the same under data/mock/)`);
      continue;
    }
    const r =
      info.kind === "sources" ? validateSource(raw, path)
      : info.kind === "images" ? validateImage(raw, path)
      : info.kind === "pairs" ? validatePair(raw, path)
      : info.kind === "band-sets" ? validateBandSet(raw, path)
      : validateJourney(raw, path);
    if (!r.ok) {
      errors.push(...r.errors);
      continue;
    }
    const value = r.value;
    const key = "slug" in value ? value.slug : value.id;
    fileOf.set(value, path);
    if (key !== info.name) errors.push(`${path}: ${"slug" in value ? "slug" : "id"}: expected the file name "${info.name}", got ${JSON.stringify(key)}`);
    if (value.mock !== info.mock) {
      errors.push(`${path}: mock: expected ${info.mock} for a file ${info.mock ? "under" : "outside"} data/mock/, got ${value.mock}`);
    }
    if (info.kind === "sources") content.sources.push(value as Source);
    else if (info.kind === "images") content.images.push(value as ImageManifest);
    else if (info.kind === "pairs") content.pairs.push(value as ComparePair);
    else if (info.kind === "band-sets") content.bandSets.push(value as BandSet);
    else content.journeys.push(value as Journey);
  }

  const sources = new Map(content.sources.map((s) => [s.id, s]));
  const images = new Map(content.images.map((i) => [i.id, i]));

  for (const img of content.images) {
    const file = fileOf.get(img)!;
    const src = sources.get(img.sourceId);
    if (!src) {
      errors.push(`${file}: sourceId: no source "${img.sourceId}" in data/sources/`);
      continue;
    }
    if (img.tiles.width !== src.file.width) errors.push(`${file}: tiles.width: expected ${src.file.width} (the source file), got ${img.tiles.width}`);
    if (img.tiles.height !== src.file.height) errors.push(`${file}: tiles.height: expected ${src.file.height} (the source file), got ${img.tiles.height}`);
  }

  for (const j of content.journeys) {
    const file = fileOf.get(j)!;
    // Journeys and images share the /[slug] route.
    if (images.has(j.slug)) errors.push(`${file}: slug: "${j.slug}" is also an image id; the two share one URL space`);
    const img = images.get(j.imageId);
    if (!img) {
      errors.push(`${file}: imageId: no image "${j.imageId}" in data/images/`);
      continue;
    }
    const { width, height } = img.tiles;
    j.stops.forEach((s, i) => {
      const p = `stops[${i}]`;
      const { x, y, z } = s.viewport;
      if (x < 0 || x > width || y < 0 || y > height) {
        errors.push(`${file}: ${p}.viewport: (${x}, ${y}) lies outside the image (${width} x ${height})`);
      }
      if (z <= 0) errors.push(`${file}: ${p}.viewport.z: expected a positive number, got ${z}`);
      if (s.marker && (s.marker.x < 0 || s.marker.x > width || s.marker.y < 0 || s.marker.y > height)) {
        errors.push(`${file}: ${p}.marker: (${s.marker.x}, ${s.marker.y}) lies outside the image (${width} x ${height})`);
      }
    });
  }

  const outside = (p: { x: number; y: number }, img: ImageManifest) =>
    p.x < 0 || p.x > img.tiles.width || p.y < 0 || p.y > img.tiles.height;

  for (const img of content.images) {
    img.footprint?.forEach((poly, i) =>
      poly.forEach((p, k) => {
        if (outside(p, img)) {
          errors.push(`${fileOf.get(img)}: footprint[${i}][${k}]: (${p.x}, ${p.y}) lies outside the image (${img.tiles.width} x ${img.tiles.height})`);
        }
      }),
    );
  }

  for (const g of [...content.pairs, ...content.bandSets]) {
    const file = fileOf.get(g)!;
    g.imageIds.forEach((id, i) => {
      if (!images.has(id)) errors.push(`${file}: imageIds[${i}]: no image "${id}" in data/images/`);
    });
  }

  for (const pair of content.pairs) {
    const reg = pair.registration;
    if (reg.transform !== "similarity") continue;
    const file = fileOf.get(pair)!;
    const ref = images.get(pair.reference);
    const mov = images.get(pair.imageIds.find((id) => id !== pair.reference)!);
    reg.controlPoints.forEach((cp, i) => {
      if (mov && outside(cp.moving, mov)) errors.push(`${file}: registration.controlPoints[${i}].moving: (${cp.moving.x}, ${cp.moving.y}) lies outside image "${mov.id}"`);
      if (ref && outside(cp.reference, ref)) errors.push(`${file}: registration.controlPoints[${i}].reference: (${cp.reference.x}, ${cp.reference.y}) lies outside image "${ref.id}"`);
    });
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: content };
};
