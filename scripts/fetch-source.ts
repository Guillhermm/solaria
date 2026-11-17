import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { validateSource } from "../src/content/validate";
import type { Source } from "../src/content/types";

interface Digest {
  bytes: number;
  sha256: string;
}

// Counts and hashes the bytes that flow through, so a download is checked as it is written.
const digester = () => {
  const hash = createHash("sha256");
  const digest: Digest = { bytes: 0, sha256: "" };
  const stream = new Transform({
    transform(chunk: Buffer, _enc, done) {
      hash.update(chunk);
      digest.bytes += chunk.length;
      done(null, chunk);
    },
    flush(done) {
      digest.sha256 = hash.digest("hex");
      done();
    },
  });
  return { stream, digest };
};

const digestOfFile = async (path: string): Promise<Digest> => {
  const { stream, digest } = digester();
  await pipeline(createReadStream(path), stream, createWriteStream("/dev/null"));
  return digest;
};

const matches = (d: Digest, src: Source) => d.bytes === src.file.bytes && d.sha256 === src.file.sha256;

const exists = (path: string) => stat(path).then(() => true, () => false);

export const fetchSource = async (
  src: Source,
  opts: { cacheDir: string; fetch?: typeof fetch },
): Promise<{ path: string; cached: boolean }> => {
  const doFetch = opts.fetch ?? fetch;
  const path = join(opts.cacheDir, `${src.id}.${src.file.format}`);
  await mkdir(opts.cacheDir, { recursive: true });

  if (await exists(path)) {
    if (matches(await digestOfFile(path), src)) return { path, cached: true };
    await rm(path);
  }

  const res = await doFetch(src.fileUrl);
  if (!res.ok || !res.body) throw new Error(`${src.fileUrl}: HTTP ${res.status}`);

  const partial = `${path}.part`;
  const { stream, digest } = digester();
  try {
    await pipeline(Readable.fromWeb(res.body as never), stream, createWriteStream(partial));
  } catch (err) {
    await rm(partial, { force: true });
    throw err;
  }
  if (digest.bytes !== src.file.bytes) {
    await rm(partial);
    throw new Error(`${src.id}: size mismatch, expected ${src.file.bytes} bytes, got ${digest.bytes}`);
  }
  if (digest.sha256 !== src.file.sha256) {
    await rm(partial);
    throw new Error(`${src.id}: sha256 mismatch, expected ${src.file.sha256}, got ${digest.sha256}`);
  }
  await rename(partial, path);
  return { path, cached: false };
};

const main = async () => {
  const id = process.argv[2];
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    console.error("Usage: tsx scripts/fetch-source.ts <sourceId>");
    process.exit(1);
  }
  const file = `data/sources/${id}.json`;
  const parsed = validateSource(JSON.parse(await readFile(file, "utf8")), file);
  if (!parsed.ok) {
    console.error(parsed.errors.join("\n"));
    process.exit(1);
  }
  const { path, cached } = await fetchSource(parsed.value, { cacheDir: ".cache/sources" });
  console.log(`${cached ? "Cached" : "Downloaded"}: ${path}`);
};

if (process.argv[1]?.endsWith("fetch-source.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
