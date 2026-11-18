import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

// git keeps no empty folder, so data/staging/* may be missing on a fresh clone (CI).
const ids = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -".json".length));

describe("sitemap.xml", () => {
  it("lists exactly the published pages, even in a build with mock and staged content", () => {
    vi.stubEnv("SOLARIA_CONTENT", "development");
    const urls = sitemap().map((e) => e.url);
    vi.unstubAllEnvs();
    const published = ["", "about", ...ids("data/images"), ...ids("data/journeys")].map((p) => `https://solaria.zenus.systems/${p ? `${p}/` : ""}`);
    expect(urls.sort()).toEqual(published.sort());
    for (const id of [...ids("data/mock/images"), ...ids("data/staging/images"), ...ids("data/staging/journeys")]) {
      expect(urls.join(" ")).not.toContain(`/${id}/`);
    }
  });
});

describe("robots.txt", () => {
  it("points to the sitemap", () => {
    expect(robots().sitemap).toBe("https://solaria.zenus.systems/sitemap.xml");
  });
});
