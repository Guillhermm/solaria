import { readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const declared = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(e.name) ? [path] : [];
  });

const packageOf = (specifier: string) => {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

describe("dependencies", () => {
  it("declares every package the code imports, rather than borrowing a transitive one", () => {
    const missing: string[] = [];
    for (const file of [...sources("src"), ...sources("scripts"), ...sources("tests")]) {
      for (const [, specifier] of readFileSync(file, "utf8").matchAll(/^(?:import\b[^";]*?|export\b[^";]*?\bfrom\s*)"([^"]+)"/gm)) {
        if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("node:")) continue;
        const name = packageOf(specifier);
        if (builtinModules.includes(name) || declared.has(name)) continue;
        missing.push(`${file}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
