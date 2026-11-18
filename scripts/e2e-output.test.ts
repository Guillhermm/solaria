import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import config from "../playwright.config";
import { E2E_OUT, moveBuild } from "./e2e-output";

describe("moveBuild", () => {
  let dir = "";
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("leaves no out/ behind and replaces an older end-to-end build", () => {
    dir = mkdtempSync(join(tmpdir(), "e2e-out-"));
    const out = join(dir, "out");
    const e2e = join(dir, E2E_OUT);
    mkdirSync(join(out, "tiles", "mock-compare-before"), { recursive: true });
    mkdirSync(join(e2e, "stale"), { recursive: true });
    writeFileSync(join(out, "index.html"), "x");
    moveBuild(out, e2e);
    expect(existsSync(out)).toBe(false);
    expect(existsSync(join(e2e, "tiles", "mock-compare-before"))).toBe(true);
    expect(existsSync(join(e2e, "stale"))).toBe(false);
  });

  it("refuses to run without a build", () => {
    dir = mkdtempSync(join(tmpdir(), "e2e-out-"));
    expect(() => moveBuild(join(dir, "out"), join(dir, E2E_OUT))).toThrow("does not exist");
  });
});

describe("the end-to-end server", () => {
  it("builds with the mock content, moves it out of out/ and serves the moved copy", () => {
    const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer!;
    expect(server.env?.SOLARIA_CONTENT).toBe("development");
    expect(server.command).toMatch(/^npm run build && npx tsx scripts\/e2e-output\.ts && npx tsx scripts\/serve-static\.ts out-e2e \d+$/);
  });
});
