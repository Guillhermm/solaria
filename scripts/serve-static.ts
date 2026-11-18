import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

// Maps a request path to a file under root, or null when it would leave root.
export const resolvePath = (root: string, urlPath: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const base = resolve(root);
  const target = resolve(base, `.${decoded.startsWith("/") ? decoded : `/${decoded}`}`);
  return target === base || target.startsWith(base + sep) ? target : null;
};

const isFile = (path: string) => stat(path).then((s) => s.isFile(), () => false);
const isDir = (path: string) => stat(path).then((s) => s.isDirectory(), () => false);

export const createStaticServer = (root: string) =>
  createServer(async (req, res) => {
    const send = (status: number, file: string | null, body?: string) => {
      res.writeHead(status, {
        "Content-Type": TYPES[extname(file ?? ".txt")] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method === "HEAD") return res.end();
      if (file) createReadStream(file).pipe(res);
      else res.end(body);
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const target = resolvePath(root, req.url ?? "/");
    if (target === null) return send(400, null, "Bad request");

    if (await isFile(target)) return send(200, target);
    if (await isDir(target)) {
      const index = join(target, "index.html");
      if (await isFile(index)) return send(200, index);
    }
    const notFound = join(resolve(root), "404.html");
    if (await isFile(notFound)) return send(404, notFound);
    send(404, null, "Not found");
  });

const main = () => {
  const [root, port] = process.argv.slice(2);
  if (!root || !/^\d+$/.test(port ?? "")) {
    console.error("Usage: tsx scripts/serve-static.ts <dir> <port>");
    process.exit(1);
  }
  createStaticServer(root).listen(Number(port), "127.0.0.1", () => {
    console.log(`Serving ${root} on http://127.0.0.1:${port}`);
  });
};

if (process.argv[1]?.endsWith("serve-static.ts")) main();
