import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { stagedImageIds } from "../src/content/load";

const REGION = "auto";
const SERVICE = "s3";
// Safe only because a changed tile tree gets a new image id, so its keys change too.
const IMMUTABLE = "public, max-age=31536000, immutable";
const CONCURRENCY = 8;

const sha256Hex = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Uint8Array, data: string) => createHmac("sha256", key).update(data).digest();

// RFC 3986 unreserved characters stay as they are; everything else is percent-encoded.
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export interface SignInput {
  method: string;
  url: string;
  headers?: Record<string, string>; // signed along with host and x-amz-date
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  date: Date;
}

// AWS Signature Version 4, header form. Returns the headers to send: the ones given plus
// x-amz-date and authorization. `host` is signed but left to fetch to send.
export const signRequest = (input: SignInput) => {
  const url = new URL(input.url);
  const amzDate = input.date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const headers: Record<string, string> = { ...input.headers, "x-amz-date": amzDate };
  const signed: Record<string, string> = { host: url.host };
  for (const [k, v] of Object.entries(headers)) signed[k.toLowerCase()] = v.trim().replace(/\s+/g, " ");
  const names = Object.keys(signed).sort();

  const path = url.pathname.split("/").map((seg) => encode(decodeURIComponent(seg))).join("/");
  const query = [...url.searchParams.entries()]
    .map(([k, v]) => [encode(k), encode(v)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const canonical = [
    input.method,
    path,
    query,
    ...names.map((n) => `${n}:${signed[n]}`),
    "",
    names.join(";"),
    input.payloadHash,
  ].join("\n");

  const scope = `${day}/${input.region}/${input.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), input.service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
  return headers;
};

export interface LocalFile {
  key: string; // path under the tiles directory, with "/" separators
  path: string;
  size: number;
  md5: string;
}

export interface RemoteObject {
  size: number;
  etag: string; // lowercase hex, quotes removed
}

export type PlanEntry = { file: LocalFile; reason: "new" | "changed" };

export const planSync = (local: LocalFile[], remote: Map<string, RemoteObject>) => {
  const upload: PlanEntry[] = [];
  const skip: LocalFile[] = [];
  for (const file of local) {
    const have = remote.get(file.key);
    if (!have) upload.push({ file, reason: "new" });
    else if (have.size === file.size && have.etag === file.md5) skip.push(file);
    else upload.push({ file, reason: "changed" });
  }
  return { upload, skip };
};

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json",
};

export const contentType = (key: string) => TYPES[key.slice(key.lastIndexOf(".")).toLowerCase()] ?? "application/octet-stream";

// Mock tile trees are for development only, and staged images wait for science review: neither
// goes to the bucket.
export const listLocal = (dir: string, staged: string[] = []): LocalFile[] => {
  const out: LocalFile[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      const key = relative(dir, p).split(sep).join("/");
      if (e.isDirectory()) {
        if (d === dir && (e.name.startsWith("mock-") || staged.includes(e.name))) continue;
        walk(p);
      } else if (e.isFile()) {
        out.push({ key, path: p, size: statSync(p).size, md5: createHash("md5").update(readFileSync(p)).digest("hex") });
      }
    }
  };
  walk(dir);
  return out;
};

const unescapeXml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? unescapeXml(m[1]) : undefined;
};

export const parseListing = (xml: string) => {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({
    key: tag(m[1], "Key") ?? "",
    size: Number(tag(m[1], "Size")),
    etag: (tag(m[1], "ETag") ?? "").replace(/"/g, "").toLowerCase(),
  }));
  return { objects, next: tag(xml, "IsTruncated") === "true" ? tag(xml, "NextContinuationToken") : undefined };
};

export interface Env {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

const VARS = {
  accountId: "R2_ACCOUNT_ID",
  accessKeyId: "R2_ACCESS_KEY_ID",
  secretAccessKey: "R2_SECRET_ACCESS_KEY",
  bucket: "R2_BUCKET",
} as const;

// Only the names of missing variables are reported, never a value.
export const readEnv = (env: Record<string, string | undefined>): { env: Env } | { missing: string[] } => {
  const missing = Object.values(VARS).filter((n) => !env[n]);
  if (missing.length > 0) return { missing };
  return {
    env: {
      accountId: env.R2_ACCOUNT_ID!,
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      bucket: env.R2_BUCKET!,
    },
  };
};

export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
  log: (line: string) => void;
}

const BUCKET_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const ACCOUNT_RE = /^[0-9a-f]{32}$/;

export const makeClient = (env: Env, deps: Deps) => {
  if (!ACCOUNT_RE.test(env.accountId)) throw new Error("R2_ACCOUNT_ID must be 32 hex characters");
  if (!BUCKET_RE.test(env.bucket)) throw new Error("R2_BUCKET is not a valid bucket name");
  const base = `https://${env.accountId}.r2.cloudflarestorage.com/${env.bucket}`;

  const send = async (method: string, url: string, body: Buffer | undefined, extra: Record<string, string>) => {
    const payloadHash = sha256Hex(body ?? "");
    const headers = signRequest({
      method,
      url,
      headers: { ...extra, "x-amz-content-sha256": payloadHash },
      payloadHash,
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
      region: REGION,
      service: SERVICE,
      date: deps.now(),
    });
    return deps.fetch(url, { method, headers, body: body ? new Uint8Array(body) : undefined });
  };

  return {
    list: async () => {
      const remote = new Map<string, RemoteObject>();
      let token: string | undefined;
      do {
        const q = new URLSearchParams({ "list-type": "2" });
        if (token) q.set("continuation-token", token);
        const res = await send("GET", `${base}?${q}`, undefined, {});
        if (!res.ok) throw new Error(`listing the bucket failed with HTTP ${res.status}`);
        const page = parseListing(await res.text());
        for (const o of page.objects) remote.set(o.key, { size: o.size, etag: o.etag });
        token = page.next;
      } while (token);
      return remote;
    },
    put: async (file: LocalFile) => {
      const url = `${base}/${file.key.split("/").map(encode).join("/")}`;
      const res = await send("PUT", url, readFileSync(file.path), {
        "content-type": contentType(file.key),
        "cache-control": IMMUTABLE,
      });
      if (!res.ok) throw new Error(`uploading ${file.key} failed with HTTP ${res.status}`);
    },
  };
};

export interface RunOptions {
  dir: string;
  staged?: string[]; // image ids in data/staging/, left out like mock trees
  apply: boolean;
  env: Record<string, string | undefined>;
  deps: Deps;
}

// Returns the process exit code.
export const runSync = async (opts: RunOptions) => {
  const { dir, apply, deps } = opts;
  const creds = readEnv(opts.env);
  if ("missing" in creds && apply) {
    deps.log(`Cannot apply: set ${creds.missing.join(", ")}`);
    return 1;
  }
  const local = listLocal(dir, opts.staged);
  const client = "env" in creds ? makeClient(creds.env, deps) : undefined;
  const remote = client ? await client.list() : new Map<string, RemoteObject>();
  if (!client) deps.log("No credentials in the environment: the bucket was not checked, so every file counts as new.");
  const { upload, skip } = planSync(local, remote);

  for (const { file, reason } of upload) deps.log(`${apply ? "upload" : "would upload"} ${file.key} (${file.size} bytes, ${reason})`);
  const bytes = upload.reduce((n, u) => n + u.file.size, 0);
  deps.log(`${upload.length} to upload (${bytes} bytes), ${skip.length} already in the bucket`);
  if (!apply) {
    deps.log("Dry run. Pass --apply to upload.");
    return 0;
  }

  let failed = 0;
  const queue = [...upload];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try {
        await client!.put(next.file);
      } catch (err) {
        failed++;
        deps.log(err instanceof Error ? err.message : "upload failed");
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  deps.log(failed === 0 ? `Uploaded ${upload.length} files` : `${failed} uploads failed; run again to retry them`);
  return failed === 0 ? 0 : 1;
};

const main = async () => {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--dir");
  const dir = dirIndex >= 0 ? args[dirIndex + 1] : join("public", "tiles");
  const unknown = args.filter((a, i) => a !== "--apply" && a !== "--dir" && i !== dirIndex + 1);
  if (!dir || unknown.length > 0) {
    console.error("Usage: tsx scripts/sync-r2.ts [--dir <tiles directory>] [--apply]");
    process.exit(1);
  }
  const code = await runSync({
    dir,
    staged: stagedImageIds(process.cwd()),
    apply: args.includes("--apply"),
    env: process.env,
    deps: { fetch, now: () => new Date(), log: (l) => console.log(l) },
  });
  process.exitCode = code;
};

if (process.argv[1]?.endsWith("sync-r2.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : "sync failed");
    process.exit(1);
  });
}
