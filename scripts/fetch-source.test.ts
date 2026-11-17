import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fx from "../src/content/__fixtures__/content";
import { fetchSource } from "./fetch-source";

const body = Buffer.from("not really a tiff, but fixed bytes");
const sha = createHash("sha256").update(body).digest("hex");

const source = (over: { bytes?: number; sha256?: string } = {}) => {
  const s = fx.source();
  s.file = { ...s.file, bytes: over.bytes ?? body.length, sha256: over.sha256 ?? sha };
  return s;
};

const okFetch = () => vi.fn(async () => new Response(body)) as unknown as typeof fetch;

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "solaria-fetch-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("fetchSource", () => {
  it("downloads and keeps a file that matches", async () => {
    const f = okFetch();
    const r = await fetchSource(source(), { cacheDir: dir, fetch: f });
    expect(r).toEqual({ path: join(dir, "demo.tif"), cached: false });
    expect(readFileSync(r.path)).toEqual(body);
    expect(f).toHaveBeenCalledWith("https://example.org/demo.tif");
    expect(readdirSync(dir)).toEqual(["demo.tif"]);
  });

  it("removes the file and throws on a hash mismatch", async () => {
    await expect(fetchSource(source({ sha256: "b".repeat(64) }), { cacheDir: dir, fetch: okFetch() })).rejects.toThrow(
      /sha256 mismatch/,
    );
    expect(readdirSync(dir)).toEqual([]);
  });

  it("removes the file and throws on a size mismatch", async () => {
    await expect(fetchSource(source({ bytes: 5 }), { cacheDir: dir, fetch: okFetch() })).rejects.toThrow(
      /size mismatch, expected 5 bytes/,
    );
    expect(readdirSync(dir)).toEqual([]);
  });

  it("makes no request when the cached file matches", async () => {
    writeFileSync(join(dir, "demo.tif"), body);
    const f = okFetch();
    const r = await fetchSource(source(), { cacheDir: dir, fetch: f });
    expect(r.cached).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it("replaces a cached file that does not match", async () => {
    writeFileSync(join(dir, "demo.tif"), "corrupt");
    const f = okFetch();
    const r = await fetchSource(source(), { cacheDir: dir, fetch: f });
    expect(r.cached).toBe(false);
    expect(readFileSync(r.path)).toEqual(body);
  });

  it("throws on an HTTP error and leaves nothing behind", async () => {
    const f = vi.fn(async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchSource(source(), { cacheDir: dir, fetch: f })).rejects.toThrow(/HTTP 404/);
    expect(readdirSync(dir)).toEqual([]);
  });
});
