import { get } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createStaticServer, resolvePath } from "./serve-static";

let dir: string;
let base: string;
const server = () => createStaticServer(join(dir, "out"));
let running: ReturnType<typeof server>;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "solaria-serve-"));
  const out = join(dir, "out");
  mkdirSync(join(out, "about"), { recursive: true });
  mkdirSync(join(out, "tiles", "x", "0"), { recursive: true });
  writeFileSync(join(out, "index.html"), "<h1>home</h1>");
  writeFileSync(join(out, "about", "index.html"), "<h1>about</h1>");
  writeFileSync(join(out, "404.html"), "<h1>missing</h1>");
  writeFileSync(join(out, "tiles", "x", "0", "0.jpg"), "jpg");
  writeFileSync(join(dir, "secret.txt"), "secret");
  running = server();
  await new Promise<void>((r) => running.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(running.address() as AddressInfo).port}`;
});

afterAll(() => {
  running.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("resolvePath", () => {
  it("keeps paths under the root", () => {
    expect(resolvePath("/srv/out", "/a/b.js?x=1")).toBe("/srv/out/a/b.js");
    expect(resolvePath("/srv/out", "/")).toBe("/srv/out");
  });

  it("rejects traversal, encoded or not, and bad escapes", () => {
    expect(resolvePath("/srv/out", "/../secret")).toBeNull();
    expect(resolvePath("/srv/out", "/%2e%2e/secret")).toBeNull();
    expect(resolvePath("/srv/out", "/a/..%2f..%2fsecret")).toBeNull();
    expect(resolvePath("/srv/out", "/%E0%A4%A")).toBeNull();
    expect(resolvePath("/srv/out", "/a%00b")).toBeNull();
    expect(resolvePath("/srv/out", "/../out-other/x")).toBeNull();
  });
});

describe("static server", () => {
  it("serves the index for / and for a directory", async () => {
    expect(await (await fetch(`${base}/`)).text()).toBe("<h1>home</h1>");
    const about = await fetch(`${base}/about/`);
    expect(about.status).toBe(200);
    expect(about.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await (await fetch(`${base}/about`)).text()).toBe("<h1>about</h1>");
  });

  it("serves files with their content type", async () => {
    const r = await fetch(`${base}/tiles/x/0/0.jpg`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("answers 404 with 404.html", async () => {
    const r = await fetch(`${base}/nope/`);
    expect(r.status).toBe(404);
    expect(await r.text()).toBe("<h1>missing</h1>");
  });

  it("refuses to leave the root", async () => {
    // fetch would normalize the dots away, so send the raw path.
    const { status, body } = await new Promise<{ status: number; body: string }>((ok, ko) => {
      get({ host: "127.0.0.1", port: new URL(base).port, path: "/%2e%2e/secret.txt" }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => ok({ status: res.statusCode ?? 0, body }));
      }).on("error", ko);
    });
    expect(status).toBe(400);
    expect(body).not.toContain("secret");
  });

  it("rejects methods other than GET and HEAD", async () => {
    expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
    expect((await fetch(`${base}/`, { method: "HEAD" })).status).toBe(200);
  });
});
