import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CORS_ORIGINS, contentType, corsXml, listLocal, parseListing, planSync, readEnv, runCreateBucket, runSync, signRequest, type LocalFile } from "./sync-r2";

const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("signRequest against the AWS Signature Version 4 documentation", () => {
  it("matches the get-vanilla test of the AWS test suite", () => {
    const h = signRequest({
      method: "GET",
      url: "https://example.amazonaws.com/",
      payloadHash: EMPTY,
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      service: "service",
      date: new Date("2015-08-30T12:36:00Z"),
    });
    expect(h.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
    expect(h["x-amz-date"]).toBe("20150830T123600Z");
  });

  it("matches the S3 GET Object example with a Range header", () => {
    const h = signRequest({
      method: "GET",
      url: "https://examplebucket.s3.amazonaws.com/test.txt",
      headers: { Range: "bytes=0-9", "x-amz-content-sha256": EMPTY },
      payloadHash: EMPTY,
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      service: "s3",
      date: new Date("2013-05-24T00:00:00Z"),
    });
    expect(h.authorization).toContain("SignedHeaders=host;range;x-amz-content-sha256;x-amz-date");
    expect(h.authorization).toContain("Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
  });
});

const file = (key: string, size: number, md5: string): LocalFile => ({ key, path: `/x/${key}`, size, md5 });

describe("planSync", () => {
  const remote = new Map([
    ["a/0.jpg", { size: 10, etag: "aaa" }],
    ["a/1.jpg", { size: 10, etag: "bbb" }],
    ["a/2.jpg", { size: 10, etag: "ccc" }],
  ]);

  it("skips a match, uploads new and changed files", () => {
    const plan = planSync(
      [file("a/0.jpg", 10, "aaa"), file("a/1.jpg", 10, "zzz"), file("a/2.jpg", 11, "ccc"), file("b/0.jpg", 5, "ddd")],
      remote,
    );
    expect(plan.skip.map((f) => f.key)).toEqual(["a/0.jpg"]);
    expect(plan.upload.map((u) => [u.file.key, u.reason])).toEqual([
      ["a/1.jpg", "changed"],
      ["a/2.jpg", "changed"],
      ["b/0.jpg", "new"],
    ]);
  });

  it("re-uploads when the remote ETag is a multipart one", () => {
    const plan = planSync([file("a/0.jpg", 10, "aaa")], new Map([["a/0.jpg", { size: 10, etag: "aaa-2" }]]));
    expect(plan.upload).toHaveLength(1);
  });
});

describe("contentType", () => {
  it.each([
    ["a/0/0/1.jpg", "image/jpeg"],
    ["a/preview.JPG", "image/jpeg"],
    ["a/x.png", "image/png"],
    ["a/x.json", "application/json"],
    ["a/x.bin", "application/octet-stream"],
  ])("%s is %s", (key, type) => expect(contentType(key)).toBe(type));
});

describe("parseListing", () => {
  it("reads keys, sizes and unquoted ETags, and a continuation token", () => {
    const xml = `<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>tok&amp;1</NextContinuationToken>
      <Contents><Key>a/0.jpg</Key><ETag>&quot;ABC123&quot;</ETag><Size>42</Size></Contents>
      <Contents><Key>a/b&amp;c.jpg</Key><ETag>"def"</ETag><Size>7</Size></Contents></ListBucketResult>`;
    expect(parseListing(xml)).toEqual({
      objects: [
        { key: "a/0.jpg", size: 42, etag: "abc123" },
        { key: "a/b&c.jpg", size: 7, etag: "def" },
      ],
      next: "tok&1",
    });
  });

  it("has no next token on the last page", () => {
    expect(parseListing("<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>")).toEqual({ objects: [], next: undefined });
  });
});

describe("readEnv", () => {
  it("names the missing variables and nothing else", () => {
    expect(readEnv({ R2_BUCKET: "b", R2_ACCESS_KEY_ID: "k" })).toEqual({ missing: ["R2_ACCOUNT_ID", "R2_SECRET_ACCESS_KEY"] });
  });
});

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const tree = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "solaria-r2-"));
  dirs.push(dir);
  for (const [k, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, k)), { recursive: true });
    writeFileSync(join(dir, k), body);
  }
  return dir;
};

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

describe("listLocal", () => {
  it("lists files with size and md5, and skips mock trees and dotfiles", () => {
    const dir = tree({ "img/0/0/0.jpg": "tile", "img/thumbnail.jpg": "t", "mock-x/0/0/0.jpg": "m", "img/.DS_Store": "x" });
    expect(listLocal(dir).map((f) => [f.key, f.size, f.md5])).toEqual([
      ["img/0/0/0.jpg", 4, md5("tile")],
      ["img/thumbnail.jpg", 1, md5("t")],
    ]);
  });

  it("skips the tile trees of staged images", () => {
    const dir = tree({ "img/0/0/0.jpg": "tile", "staged-x/0/0/0.jpg": "s" });
    expect(listLocal(dir, ["staged-x"]).map((f) => f.key)).toEqual(["img/0/0/0.jpg"]);
  });
});

const ENV = {
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_ACCESS_KEY_ID: "AKEYEXAMPLE",
  R2_SECRET_ACCESS_KEY: "SECRETEXAMPLEVALUE",
  R2_BUCKET: "solaria-tiles",
};

const listing = (items: [string, string][]) =>
  `<ListBucketResult><IsTruncated>false</IsTruncated>${items
    .map(([k, body]) => `<Contents><Key>${k}</Key><ETag>&quot;${md5(body)}&quot;</ETag><Size>${body.length}</Size></Contents>`)
    .join("")}</ListBucketResult>`;

const harness = (remoteItems: [string, string][], put = () => new Response("", { status: 200 })) => {
  const lines: string[] = [];
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) =>
    (init?.method ?? "GET") === "GET" ? new Response(listing(remoteItems), { status: 200 }) : put(),
  );
  return {
    lines,
    fetchMock,
    deps: { fetch: fetchMock as unknown as typeof fetch, now: () => new Date("2026-11-17T22:00:00Z"), log: (l: string) => lines.push(l) },
  };
};

describe("runSync with a mocked fetch", () => {
  const files = { "img/0/0/0.jpg": "tile0", "img/0/0/1.jpg": "tile1" };

  it("dry run lists what it would upload and sends only the listing request", async () => {
    const h = harness([["img/0/0/0.jpg", "tile0"]]);
    const code = await runSync({ dir: tree(files), apply: false, env: ENV, deps: h.deps });
    expect(code).toBe(0);
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(h.lines).toContain("would upload img/0/0/1.jpg (5 bytes, new)");
    expect(h.lines.join("\n")).not.toContain("img/0/0/0.jpg");
    expect(h.lines).toContain("1 to upload (5 bytes), 1 already in the bucket");
  });

  it("dry run without credentials makes no request and counts everything as new", async () => {
    const h = harness([]);
    const code = await runSync({ dir: tree(files), apply: false, env: {}, deps: h.deps });
    expect(code).toBe(0);
    expect(h.fetchMock).not.toHaveBeenCalled();
    expect(h.lines.filter((l) => l.startsWith("would upload"))).toHaveLength(2);
  });

  it("apply without credentials stops and names the variables", async () => {
    const h = harness([]);
    const code = await runSync({ dir: tree(files), apply: true, env: { R2_BUCKET: "b" }, deps: h.deps });
    expect(code).toBe(1);
    expect(h.fetchMock).not.toHaveBeenCalled();
    expect(h.lines[0]).toBe("Cannot apply: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  });

  it("apply uploads only the missing file, signed, with type and immutable cache headers", async () => {
    const h = harness([["img/0/0/0.jpg", "tile0"]]);
    const code = await runSync({ dir: tree(files), apply: true, env: ENV, deps: h.deps });
    expect(code).toBe(0);
    const puts = h.fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(puts).toHaveLength(1);
    const [url, init] = puts[0];
    expect(String(url)).toBe("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/solaria-tiles/img/0/0/1.jpg");
    const headers = init!.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("image/jpeg");
    expect(headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(headers["x-amz-content-sha256"]).toBe(createHash("sha256").update("tile1").digest("hex"));
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKEYEXAMPLE\/20261117\/auto\/s3\/aws4_request, SignedHeaders=cache-control;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  });

  it("a rerun after a full upload uploads nothing", async () => {
    const h = harness([["img/0/0/0.jpg", "tile0"], ["img/0/0/1.jpg", "tile1"]]);
    await runSync({ dir: tree(files), apply: true, env: ENV, deps: h.deps });
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(h.lines).toContain("0 to upload (0 bytes), 2 already in the bucket");
  });

  it("reports a failed upload, exits 1 and keeps going", async () => {
    const h = harness([], () => new Response("denied", { status: 403 }));
    const code = await runSync({ dir: tree(files), apply: true, env: ENV, deps: h.deps });
    expect(code).toBe(1);
    expect(h.lines).toContain("uploading img/0/0/0.jpg failed with HTTP 403");
    expect(h.lines).toContain("2 uploads failed; run again to retry them");
  });

  it("never logs a credential", async () => {
    const h = harness([], () => new Response("denied", { status: 403 }));
    await runSync({ dir: tree(files), apply: true, env: ENV, deps: h.deps });
    const out = h.lines.join("\n");
    for (const v of [ENV.R2_SECRET_ACCESS_KEY, ENV.R2_ACCESS_KEY_ID, ENV.R2_ACCOUNT_ID]) expect(out).not.toContain(v);
  });

  it("rejects a malformed account id or bucket name before any request", async () => {
    const h = harness([]);
    await expect(runSync({ dir: tree(files), apply: false, env: { ...ENV, R2_ACCOUNT_ID: "nope" }, deps: h.deps })).rejects.toThrow("R2_ACCOUNT_ID");
    await expect(runSync({ dir: tree(files), apply: false, env: { ...ENV, R2_BUCKET: "A/b" }, deps: h.deps })).rejects.toThrow("R2_BUCKET");
    expect(h.fetchMock).not.toHaveBeenCalled();
  });
});

describe("runCreateBucket with a mocked fetch", () => {
  const make = (headStatus: number) => {
    const lines: string[] = [];
    const calls: { method: string; url: string; headers: Record<string, string>; body?: string }[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? Buffer.from(init.body as Uint8Array).toString() : undefined;
      calls.push({ method, url: String(url), headers: (init?.headers ?? {}) as Record<string, string>, body });
      return new Response("", { status: method === "HEAD" ? headStatus : 200 });
    });
    return { lines, calls, deps: { fetch: fetchMock as unknown as typeof fetch, now: () => new Date("2026-11-17T22:00:00Z"), log: (l: string) => lines.push(l) } };
  };

  it("leaves an existing bucket untouched, even with --apply", async () => {
    const h = make(200);
    expect(await runCreateBucket({ apply: true, env: ENV, deps: h.deps })).toBe(0);
    expect(h.calls.map((c) => c.method)).toEqual(["HEAD"]);
    expect(h.lines.join("\n")).toContain("already exists; nothing was changed");
  });

  it("dry run only checks the bucket", async () => {
    const h = make(404);
    expect(await runCreateBucket({ apply: false, env: ENV, deps: h.deps })).toBe(0);
    expect(h.calls.map((c) => c.method)).toEqual(["HEAD"]);
    expect(h.lines.join("\n")).toContain("Dry run");
  });

  it("creates a missing bucket, then sets a read-only CORS rule with its MD5", async () => {
    const h = make(404);
    expect(await runCreateBucket({ apply: true, env: ENV, deps: h.deps })).toBe(0);
    expect(h.calls.map((c) => c.method)).toEqual(["HEAD", "PUT", "PUT"]);
    const base = `https://${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${ENV.R2_BUCKET}`;
    expect(h.calls[1].url).toBe(base);
    expect(h.calls[2].url).toBe(`${base}?cors=`);
    const xml = corsXml(CORS_ORIGINS);
    expect(h.calls[2].body).toBe(xml);
    expect(h.calls[2].headers["content-md5"]).toBe(createHash("md5").update(xml).digest("base64"));
    expect(xml).not.toMatch(/PUT|POST|DELETE/);
    for (const c of h.calls) expect(c.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 /);
  });

  it("stops on a denied check and never logs a credential", async () => {
    const h = make(403);
    await expect(runCreateBucket({ apply: true, env: ENV, deps: h.deps })).rejects.toThrow("HTTP 403");
    expect(h.calls.map((c) => c.method)).toEqual(["HEAD"]);
    for (const v of [ENV.R2_SECRET_ACCESS_KEY, ENV.R2_ACCESS_KEY_ID, ENV.R2_ACCOUNT_ID]) expect(h.lines.join("\n")).not.toContain(v);
  });

  it("names the missing variables and sends nothing", async () => {
    const h = make(404);
    expect(await runCreateBucket({ apply: true, env: { R2_BUCKET: "b" }, deps: h.deps })).toBe(1);
    expect(h.calls).toHaveLength(0);
  });
});
