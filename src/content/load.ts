import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { publishProblems } from "./gate";
import type { Content } from "./types";
import { validateContent } from "./validate";

export type { Content } from "./types";
export type Mode = "production" | "development";

export class ContentError extends Error {
  constructor(public problems: string[]) {
    super(`Content is not valid:\n${problems.map((p) => `  ${p}`).join("\n")}`);
    this.name = "ContentError";
  }
}

const KINDS = ["sources", "images", "journeys", "pairs", "band-sets"] as const;

const readDir = (root: string, rel: string) => {
  let names: string[];
  try {
    names = readdirSync(join(root, rel)).filter((n) => n.endsWith(".json")).sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return names.map((n) => {
    const path = `${rel}/${n}`;
    try {
      return { path, raw: JSON.parse(readFileSync(join(root, path), "utf8")) as unknown };
    } catch (err) {
      throw new ContentError([`${path}: not valid JSON (${(err as Error).message})`]);
    }
  });
};

export const loadContent = (opts: { root: string; mode: Mode }): Content => {
  const dirs: string[] = KINDS.map((k) => `data/${k}`);
  if (opts.mode === "development") dirs.push(...KINDS.map((k) => `data/mock/${k}`));
  const files = dirs.flatMap((d) => readDir(opts.root, d));
  const result = validateContent(files);
  if (!result.ok) throw new ContentError(result.errors);
  if (opts.mode === "production") {
    const problems = publishProblems(result.value);
    if (problems.length > 0) throw new ContentError(problems);
  }
  return result.value;
};

// SOLARIA_CONTENT=development builds the static site with the mock and staged content, for
// the end-to-end tests; nothing else sets it, so a plain build stays behind the gate.
export const contentMode = (env: Record<string, string | undefined>): Mode =>
  env.SOLARIA_CONTENT === "development" || env.NODE_ENV !== "production" ? "development" : "production";

let cached: Content | undefined;

export const getContent = (): Content => {
  cached ??= loadContent({ root: process.cwd(), mode: contentMode(process.env) });
  return cached;
};
