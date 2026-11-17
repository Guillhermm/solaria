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
  FeatureLabel,
  LabelSet,
  PairLabel,
  ProductType,
  Registration,
  Similarity,
  Source,
  Stop,
  TilePyramid,
  Validation,
  WeeklyItem,
} from "./types";
import { stopTarget } from "@/viewer/story";
import { MIN_CONTROL_POINTS, fitSimilarity, residuals } from "./registration";

const TO_ANGSTROM: Record<NonNullable<Band["wavelength"]>["unit"], number> = { Å: 1, nm: 10, µm: 1e4 };

// For ordering only; what users see keeps the stated unit.
const angstroms = (w: NonNullable<Band["wavelength"]>) => w.value * TO_ANGSTROM[w.unit];

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
    releasedAt: o.releasedAt === null ? null : isoDate(c, o.releasedAt, "releasedAt"),
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
  const o = object(c, v, path, ["id"], ["wavelength", "kind", "region", "shows"]);
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
    region: "region" in o ? str(c, o.region, `${path}.region`) : undefined,
    shows: "shows" in o ? str(c, o.shows, `${path}.shows`) : undefined,
  });
  if (value) {
    if (value.wavelength === undefined) delete value.wavelength;
    if (value.kind === undefined) delete value.kind;
    if (value.region === undefined) delete value.region;
    if (value.shows === undefined) delete value.shows;
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

const optionalCrop = (c: Ctx, o: Record<string, unknown>) => {
  if (!("crop" in o)) return undefined;
  const n = c.errors.length;
  const co = object(c, o.crop, "crop", ["x", "y", "width", "height"]);
  return co && finish<{ x: number; y: number; width: number; height: number }>(c, n, {
    x: int(c, co.x, "crop.x", 0),
    y: int(c, co.y, "crop.y", 0),
    width: int(c, co.width, "crop.width"),
    height: int(c, co.height, "crop.height"),
  });
};

export const validateImage = (raw: unknown, file: string): Result<ImageManifest> => {
  const c = newCtx(file);
  const o = object(
    c,
    raw,
    "",
    [
      "id", "sourceId", "title", "target", "observatory", "instruments", "bands", "colorMapping",
      "productType", "tiles", "validation", "mock",
    ],
    ["releasedAt", "observedAt", "processing", "pixelScale", "fieldOfView", "orientation", "caveats", "footprint", "crop"],
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
    releasedAt: "releasedAt" in o ? claim(c, o.releasedAt, "releasedAt", (v, p) => isoDate(c, v, p)) : undefined,
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
    crop: optionalCrop(c, o),
    tiles: tiles(c, o.tiles, "tiles"),
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  });
  if (value) {
    for (const k of ["releasedAt", "observedAt", "processing", "pixelScale", "fieldOfView", "orientation", "caveats", "footprint", "crop"] as const) {
      if (value[k] === undefined) delete value[k];
    }
  }
  return result(c, value);
};

const stop = (c: Ctx, v: unknown, path: string) => {
  const n = c.errors.length;
  const o = object(c, v, path, ["id", "title", "body", "viewport", "sources", "validation"], ["marker", "band"]);
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
    band: "band" in o ? str(c, o.band, `${path}.band`) : undefined,
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
  if (value && value.band === undefined) delete value.band;
  return value;
};

export const validateJourney = (raw: unknown, file: string): Result<Journey> => {
  const c = newCtx(file);
  const o = object(c, raw, "", ["slug", "imageId", "title", "summary", "stops", "validation", "mock"], ["bandSetId"]);
  if (!o) return bad(c);
  const n = c.errors.length;
  const value = finish<Journey>(c, n, {
    slug: str(c, o.slug, "slug"),
    imageId: str(c, o.imageId, "imageId"),
    bandSetId: "bandSetId" in o ? str(c, o.bandSetId, "bandSetId") : undefined,
    title: str(c, o.title, "title"),
    summary: str(c, o.summary, "summary"),
    stops: arrayOf(c, o.stops, "stops", (s, p) => stop(c, s, p)),
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  });
  if (value && value.bandSetId === undefined) delete value.bandSetId;
  if (value && !value.bandSetId) {
    value.stops.forEach((s, i) => {
      if (s.band !== undefined) c.errors.push(`${file}: stops[${i}].band: a stop can pick a band only in a Journey with a bandSetId`);
    });
  }
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
    const r = object(c, v, "registration", ["method", "transform", "residualPx"], ["notes"]);
    const value = r && finish<Extract<Registration, { transform: "none" }>>(c, n, {
      method: str(c, r.method, "registration.method"),
      transform,
      residualPx: nonNegative(c, r.residualPx, "registration.residualPx"),
      notes: "notes" in r ? str(c, r.notes, "registration.notes") : undefined,
    });
    if (value && value.notes === undefined) delete value.notes;
    return value;
  }
  const r = object(c, v, "registration", ["method", "transform", "controlPoints", "similarity", "residualPx", "maxResidualPx"], ["notes"]);
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
    notes: "notes" in r ? str(c, r.notes, "registration.notes") : undefined,
  });
  if (value && value.notes === undefined) delete value.notes;
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
    // Empty while the note waits to be written; the gate refuses to publish it so.
    whatDiffers: str(c, o.whatDiffers, "whatDiffers", true),
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
  const o = object(c, raw, "", [...GROUP_KEYS, "reference", "headline", "labels"], ["caveats", "alignment"]);
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
  const value = finish<ComparePair>(c, n, {
    ...g,
    reference,
    headline: str(c, o.headline, "headline"),
    labels,
    caveats: "caveats" in o ? arrayOf(c, o.caveats, "caveats", (x, q) => str(c, x, q)) : undefined,
    alignment: "alignment" in o ? str(c, o.alignment, "alignment") : undefined,
  } as Draft<ComparePair>);
  if (value) {
    if (value.caveats === undefined) delete value.caveats;
    if (value.alignment === undefined) delete value.alignment;
  }
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

export const validateLabels = (raw: unknown, file: string): Result<LabelSet> => {
  const c = newCtx(file);
  const o = object(c, raw, "", ["id", "imageIds", "labels", "validation", "mock"]);
  if (!o) return bad(c);
  const n = c.errors.length;
  const label = (v: unknown, p: string) => {
    const m = c.errors.length;
    const lo = object(c, v, p, ["id", "text", "x", "y", "description"], ["r"]);
    const value = lo && finish<FeatureLabel>(c, m, {
      id: str(c, lo.id, `${p}.id`),
      text: str(c, lo.text, `${p}.text`),
      x: num(c, lo.x, `${p}.x`),
      y: num(c, lo.y, `${p}.y`),
      r: "r" in lo ? num(c, lo.r, `${p}.r`, true) : undefined,
      description: str(c, lo.description, `${p}.description`),
    });
    if (value && value.r === undefined) delete value.r;
    return value;
  };
  const labels = arrayOf(c, o.labels, "labels", label, true);
  const ids = labels?.map((l) => l.id);
  if (ids && new Set(ids).size !== ids.length) fail(c, "labels", "distinct label ids", ids);
  const value = finish<LabelSet>(c, n, {
    id: str(c, o.id, "id"),
    imageIds: distinct(c, arrayOf(c, o.imageIds, "imageIds", (x, q) => str(c, x, q), true), "imageIds"),
    labels,
    validation: validation(c, o.validation, "validation"),
    mock: bool(c, o.mock, "mock"),
  });
  return result(c, value);
};

type Kind = "sources" | "images" | "journeys" | "pairs" | "band-sets" | "labels";

// data/staging/ holds real content still in science review: read in development only, like
// data/mock/, but not mock.
const classify = (path: string) => {
  const m = /^data\/(mock\/|staging\/)?(sources|images|journeys|pairs|band-sets|labels)\/([^/]+)\.json$/.exec(path);
  return m ? { kind: m[2] as Kind, name: m[3], mock: m[1] === "mock/" } : undefined;
};

export const validateContent = (files: { path: string; raw: unknown }[]): Result<Content> => {
  const errors: string[] = [];
  const content: Content = { sources: [], images: [], journeys: [], pairs: [], bandSets: [], labels: [], weekly: [] };
  const fileOf = new Map<unknown, string>();
  let weeklyFile = false;

  for (const { path, raw } of files) {
    if (path === WEEKLY_PATH) {
      const r = validateWeekly(raw, path);
      if (r.ok) content.weekly = r.value;
      else errors.push(...r.errors);
      weeklyFile = true;
      continue;
    }
    const info = classify(path);
    if (!info) {
      errors.push(`${path}: not a content file (expected data/{sources,images,journeys,pairs,band-sets,labels}/<name>.json or the same under data/mock/ or data/staging/)`);
      continue;
    }
    const r =
      info.kind === "sources" ? validateSource(raw, path)
      : info.kind === "images" ? validateImage(raw, path)
      : info.kind === "pairs" ? validatePair(raw, path)
      : info.kind === "band-sets" ? validateBandSet(raw, path)
      : info.kind === "labels" ? validateLabels(raw, path)
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
    else if (info.kind === "labels") content.labels.push(value as LabelSet);
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
    const { crop } = img;
    if (crop && (crop.x + crop.width > src.file.width || crop.y + crop.height > src.file.height)) {
      errors.push(`${file}: crop: (${crop.x}, ${crop.y}) + ${crop.width} x ${crop.height} lies outside the source file (${src.file.width} x ${src.file.height})`);
    }
    const [w, h, what] = crop ? [crop.width, crop.height, "the crop"] : [src.file.width, src.file.height, "the source file"];
    if (img.tiles.width !== w) errors.push(`${file}: tiles.width: expected ${w} (${what}), got ${img.tiles.width}`);
    if (img.tiles.height !== h) errors.push(`${file}: tiles.height: expected ${h} (${what}), got ${img.tiles.height}`);
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
    if (j.bandSetId !== undefined) {
      const set = content.bandSets.find((b) => b.id === j.bandSetId);
      if (!set) errors.push(`${file}: bandSetId: no band set "${j.bandSetId}" in data/band-sets/`);
      else {
        if (set.imageIds[0] !== j.imageId) errors.push(`${file}: imageId: expected "${set.imageIds[0]}", the first image of band set "${set.id}", got "${j.imageId}"`);
        j.stops.forEach((s, i) => {
          if (s.band !== undefined && !set.imageIds.includes(s.band)) errors.push(`${file}: stops[${i}].band: "${s.band}" is not an image of band set "${set.id}"`);
        });
      }
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

  // A band set is one rail: one band per image, ordered by wavelength where every band states
  // one, and with no transform every image on the same pixel grid.
  for (const set of content.bandSets) {
    const file = fileOf.get(set)!;
    const members = set.imageIds.map((id) => images.get(id)).filter((i) => i !== undefined);
    if (members.length !== set.imageIds.length) continue;
    members.forEach((img, i) => {
      if (img.bands.value.length !== 1) errors.push(`${file}: imageIds[${i}]: image "${img.id}" has ${img.bands.value.length} bands, expected one per rail stop`);
    });
    const waves = members.map((img) => img.bands.value[0]?.wavelength);
    if (waves.every((w) => w !== undefined)) {
      waves.forEach((w, i) => {
        if (i > 0 && angstroms(w) <= angstroms(waves[i - 1]!)) {
          errors.push(`${file}: imageIds[${i}]: ${w.value} ${w.unit} does not come after ${waves[i - 1]!.value} ${waves[i - 1]!.unit}; the rail is ordered by wavelength`);
        }
      });
    }
    if (set.registration.transform === "none") {
      const [first] = members;
      members.forEach((img, i) => {
        if (img.tiles.width !== first.tiles.width || img.tiles.height !== first.tiles.height) {
          errors.push(`${file}: imageIds[${i}]: image "${img.id}" is ${img.tiles.width} x ${img.tiles.height}, expected ${first.tiles.width} x ${first.tiles.height} like "${first.id}" (registration "none" means one pixel grid)`);
        }
      });
    }
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

  // A label set names images that exist, each in one set only, and every label lies on each of them.
  const labeled = new Map<string, string>();
  for (const set of content.labels) {
    const file = fileOf.get(set)!;
    set.imageIds.forEach((id, i) => {
      const img = images.get(id);
      if (!img) {
        errors.push(`${file}: imageIds[${i}]: no image "${id}" in data/images/`);
        return;
      }
      const other = labeled.get(id);
      if (other) errors.push(`${file}: imageIds[${i}]: image "${id}" already has labels in ${other}`);
      labeled.set(id, file);
      set.labels.forEach((l, k) => {
        if (outside(l, img)) errors.push(`${file}: labels[${k}]: (${l.x}, ${l.y}) lies outside image "${id}" (${img.tiles.width} x ${img.tiles.height})`);
      });
    });
  }

  if (weeklyFile) errors.push(...weeklyReferences(content, labelFileOf(content, fileOf)));

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: content };
};

const labelFileOf = (content: Content, fileOf: Map<unknown, string>) => new Map(content.labels.map((l) => [l.id, fileOf.get(l)!]));

const WEEKLY_PATH = "data/weekly.json";

// design.md 15.3, W1: the shape of each pool item; references are checked once all content is in.
export const validateWeekly = (raw: unknown, file: string): Result<WeeklyItem[]> => {
  const c = newCtx(file);
  const optional = ["body", "caveat", "side"];
  const item = (v: unknown, p: string): WeeklyItem | undefined => {
    const n = c.errors.length;
    if (typeof v !== "object" || v === null || Array.isArray(v)) return fail(c, p, "an object", v);
    const kind = oneOf(c, (v as { kind?: unknown }).kind, `${p}.kind`, ["stop", "label"] as const);
    if (!("kind" in v)) c.errors.push(`${c.file}: ${p}.kind: missing`);
    if (!kind) return undefined;
    const refs = kind === "label" ? ["labels", "label"] : ["journey", "stop"];
    const o = object(c, v, p, ["kind", ...refs, "validation"], optional);
    if (!o) return undefined;
    const value: Record<string, unknown> = { kind };
    for (const k of refs) value[k] = str(c, o[k], `${p}.${k}`);
    if ("body" in o) value.body = str(c, o.body, `${p}.body`);
    if ("caveat" in o) value.caveat = str(c, o.caveat, `${p}.caveat`);
    if ("side" in o) value.side = int(c, o.side, `${p}.side`);
    value.validation = validation(c, o.validation, `${p}.validation`);
    return c.errors.length > n ? undefined : (value as unknown as WeeklyItem);
  };
  return result(c, arrayOf(c, raw, "", item));
};

const weeklyReferences = (content: Content, labelFiles: Map<string, string>) => {
  const out: string[] = [];
  const at = (i: number, key?: string) => `${WEEKLY_PATH}: [${i}]${key ? `.${key}` : ""}`;
  content.weekly.forEach((w, i) => {
    let imageId: string;
    if (w.kind === "stop") {
      const j = content.journeys.find((x) => x.slug === w.journey);
      if (!j) return out.push(`${at(i, "journey")}: no Journey "${w.journey}" in data/journeys/`);
      const stop = j.stops.find((s) => s.id === w.stop);
      if (!stop) return out.push(`${at(i, "stop")}: no stop "${w.stop}" in Journey "${j.slug}"`);
      if (j.mock) return out.push(`${at(i)}: Journey "${j.slug}" is mock content`);
      if (j.validation.status !== "approved") return out.push(`${at(i)}: Journey "${j.slug}" is not approved`);
      if (stop.validation.status !== "approved") return out.push(`${at(i)}: stop "${stop.id}" of Journey "${j.slug}" is not approved`);
      if (!stopTarget(stop)) return out.push(`${at(i, "stop")}: stop "${stop.id}" shows the whole image and has no single place`);
      imageId = stop.band ?? j.imageId;
    } else {
      const set = content.labels.find((l) => l.id === w.labels);
      if (!set) return out.push(`${at(i, "labels")}: no label set "${w.labels}" in data/labels/`);
      if (!set.labels.some((l) => l.id === w.label)) return out.push(`${at(i, "label")}: no label "${w.label}" in ${labelFiles.get(set.id)}`);
      if (set.mock) return out.push(`${at(i)}: label set "${set.id}" is mock content`);
      if (set.validation.status !== "approved") return out.push(`${at(i)}: label set "${set.id}" is not approved`);
      imageId = set.imageIds[0];
    }
    const image = content.images.find((x) => x.id === imageId);
    if (!image) return;
    if (w.caveat !== undefined) {
      const quoted = [...(image.caveats ?? []), ...content.journeys.filter((j) => j.imageId === image.id || j.bandSetId && content.bandSets.find((b) => b.id === j.bandSetId)?.imageIds.includes(image.id)).flatMap((j) => j.stops.map((s) => s.body))];
      if (!quoted.some((t) => t.includes(w.caveat!))) out.push(`${at(i, "caveat")}: expected a line quoted from image "${image.id}" (its caveats or a stop text on it), got ${JSON.stringify(w.caveat)}`);
    }
    const shorter = Math.min(image.tiles.width, image.tiles.height);
    if (w.side !== undefined && w.side > shorter) out.push(`${at(i, "side")}: expected at most ${shorter} (the image's shorter side), got ${w.side}`);
  });
  return out;
};
