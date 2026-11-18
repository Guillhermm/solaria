import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Rule = { source: string; headers: { key: string; value: string }[] };
const rules: Rule[] = JSON.parse(readFileSync("vercel.json", "utf8")).headers;
const all = Object.fromEntries(rules.find((r) => r.source === "/(.*)")!.headers.map((h) => [h.key, h.value]));
const directive = (name: string) =>
  all["Content-Security-Policy"].split(";").map((d) => d.trim().split(/\s+/)).find(([n]) => n === name)?.slice(1) ?? [];

describe("vercel.json headers", () => {
  it("sends the security headers on every route", () => {
    expect(all["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(all["X-Content-Type-Options"]).toBe("nosniff");
    expect(all["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(all["X-Frame-Options"]).toBe("DENY");
    expect(all["Permissions-Policy"]).toContain("camera=()");
  });

  it("lets images and fetches reach the tile host and nothing else external", () => {
    expect(directive("img-src")).toContain("https://tiles.solariadata.com");
    expect(directive("connect-src")).toEqual(["'self'", "https://tiles.solariadata.com"]);
    expect(directive("default-src")).toEqual(["'self'"]);
  });

  it("keeps the CSP closed where it can be", () => {
    expect(directive("frame-ancestors")).toEqual(["'none'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("script-src")).not.toContain("'unsafe-eval'");
    expect(directive("script-src").some((s) => s.startsWith("http"))).toBe(false);
  });

  it("serves the web manifest with its own media type", () => {
    const rule = rules.find((r) => r.source === "/manifest.webmanifest")!;
    expect(rule.headers).toContainEqual({ key: "Content-Type", value: "application/manifest+json" });
  });
});
