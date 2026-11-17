export interface Ctx {
  file: string;
  errors: string[];
}

export const newCtx = (file: string): Ctx => ({ file, errors: [] });

const show = (v: unknown) => {
  if (v === undefined) return "nothing";
  const s = JSON.stringify(v) ?? String(v);
  return s.length > 40 ? `${s.slice(0, 37)}...` : s;
};

export const fail = (c: Ctx, path: string, expected: string, got?: unknown): undefined => {
  // An absent key is already reported as missing by object().
  if (got === undefined) return undefined;
  c.errors.push(`${c.file}: ${path}: expected ${expected}, got ${show(got)}`);
  return undefined;
};

export const str = (c: Ctx, v: unknown, path: string, allowEmpty = false) => {
  if (typeof v === "string" && (allowEmpty || v.trim() !== "")) return v;
  return fail(c, path, allowEmpty ? "a string" : "a non-empty string", v);
};

export const bool = (c: Ctx, v: unknown, path: string) => {
  if (typeof v === "boolean") return v;
  return fail(c, path, "a boolean", v);
};

export const num = (c: Ctx, v: unknown, path: string, positive = false) => {
  if (typeof v === "number" && Number.isFinite(v) && (!positive || v > 0)) return v;
  return fail(c, path, positive ? "a positive number" : "a number", v);
};

export const int = (c: Ctx, v: unknown, path: string, min = 1) => {
  if (typeof v === "number" && Number.isInteger(v) && v >= min) return v;
  return fail(c, path, min > 0 ? "a positive integer" : "a non-negative integer", v);
};

export const isoDate = (c: Ctx, v: unknown, path: string) => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().startsWith(v)) return v;
  }
  return fail(c, path, "a date as YYYY-MM-DD", v);
};

export const httpsUrl = (c: Ctx, v: unknown, path: string) => {
  if (typeof v === "string") {
    try {
      if (new URL(v).protocol === "https:") return v;
    } catch {
      // falls through to the error below
    }
  }
  return fail(c, path, "an https URL", v);
};

export const sha256 = (c: Ctx, v: unknown, path: string) => {
  if (typeof v === "string" && /^[0-9a-f]{64}$/.test(v)) return v;
  return fail(c, path, "64 lowercase hex characters", v);
};

export const oneOf = <T extends string>(c: Ctx, v: unknown, path: string, options: readonly T[]) => {
  if (typeof v === "string" && (options as readonly string[]).includes(v)) return v as T;
  return fail(c, path, `one of ${options.join(", ")}`, v);
};

export const literal = <T extends string | number>(c: Ctx, v: unknown, path: string, want: T) => {
  if (v === want) return want;
  return fail(c, path, show(want), v);
};

export const arrayOf = <T>(
  c: Ctx,
  v: unknown,
  path: string,
  item: (v: unknown, path: string) => T | undefined,
  nonEmpty = false,
) => {
  if (!Array.isArray(v)) return fail(c, path, "an array", v);
  if (nonEmpty && v.length === 0) return fail(c, path, "a non-empty array", v);
  const out = v.map((x, i) => item(x, `${path}[${i}]`));
  return out.every((x) => x !== undefined) ? (out as T[]) : undefined;
};

// Rejects unknown keys so a typo cannot silently drop a field.
export const object = (
  c: Ctx,
  v: unknown,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return fail(c, path, "an object", v);
  const rec = v as Record<string, unknown>;
  const where = (k: string) => (path ? `${path}.${k}` : k);
  const known = [...required, ...optional];
  for (const k of Object.keys(rec)) if (!known.includes(k)) c.errors.push(`${c.file}: ${where(k)}: unknown key`);
  for (const k of required) if (!(k in rec)) c.errors.push(`${c.file}: ${where(k)}: missing`);
  return rec;
};
