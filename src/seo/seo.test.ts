import { describe, expect, it } from "vitest";
import * as fx from "@/content/__fixtures__/content";
import type { Content } from "@/content/types";
import { canonicalUrl, pageMetadata, robotsFor, sitemapEntries, thumbnailFor } from "./seo";

const content = (over: Partial<Content> = {}) =>
  ({ sources: [fx.source()], images: [fx.image()], journeys: [{ ...fx.journey(), slug: "demo-journey" }], pairs: [], bandSets: [], labels: [], ...over }) as unknown as Content;

describe("canonicalUrl", () => {
  it("drops the viewer's query and hash and keeps the trailing slash", () => {
    expect(canonicalUrl("/andromeda/?mode=story&x=10&y=20&z=3&stop=2")).toBe("https://solaria.zenus.systems/andromeda/");
    expect(canonicalUrl("/andromeda?z=3#top")).toBe("https://solaria.zenus.systems/andromeda/");
    expect(canonicalUrl("/")).toBe("https://solaria.zenus.systems/");
  });
});

describe("thumbnailFor", () => {
  it("makes a root-relative tile base absolute on the site", () => {
    expect(thumbnailFor("/tiles", fx.image())).toEqual({ url: "https://solaria.zenus.systems/tiles/demo/thumbnail.jpg", width: 512, height: 154 });
  });

  it("keeps an https tile base", () => {
    expect(thumbnailFor("https://tiles.example.com", fx.image()).url).toBe("https://tiles.example.com/demo/thumbnail.jpg");
  });
});

describe("pageMetadata", () => {
  it("gives the canonical, Open Graph and Twitter fields one URL and one image", () => {
    const image = thumbnailFor("/tiles", fx.image());
    const m = pageMetadata({ path: "/demo/?x=1", title: "Demo image", description: "D", image });
    expect(m.alternates?.canonical).toBe("https://solaria.zenus.systems/demo/");
    expect(m.openGraph).toMatchObject({ url: "https://solaria.zenus.systems/demo/", siteName: "Solaria", title: "Demo image", description: "D", images: [{ url: image.url }] });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Demo image", description: "D", images: [image.url] });
  });
});

describe("robotsFor", () => {
  it("allows every crawler everywhere and points to the sitemap", () => {
    expect(robotsFor()).toEqual({ rules: { userAgent: "*", allow: "/" }, sitemap: "https://solaria.zenus.systems/sitemap.xml" });
  });
});

describe("sitemapEntries", () => {
  it("lists Home, About, each image and each Journey, absolute and with a trailing slash", () => {
    expect(sitemapEntries(content())).toEqual([
      { url: "https://solaria.zenus.systems/" },
      { url: "https://solaria.zenus.systems/about/" },
      { url: "https://solaria.zenus.systems/demo/", lastModified: "2026-11-17" },
      { url: "https://solaria.zenus.systems/demo-journey/", lastModified: "2026-11-17" },
    ]);
  });

  it("leaves out lastModified when a record has no validation date, and skips mock records", () => {
    const undated = { ...fx.image(), id: "undated", validation: { status: "draft", date: null, notes: "" } };
    const mock = { ...fx.image(), id: "mock-x", mock: true };
    const urls = sitemapEntries(content({ images: [undated, mock] as Content["images"], journeys: [] }));
    expect(urls.at(-1)).toEqual({ url: "https://solaria.zenus.systems/undated/" });
    expect(urls.map((u) => u.url)).not.toContain("https://solaria.zenus.systems/mock-x/");
  });
});
