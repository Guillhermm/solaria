import { describe, expect, it } from "vitest";
import * as fx from "@/content/__fixtures__/content";
import { loadContent } from "@/content/load";
import type { Content } from "@/content/types";
import { buildSearchIndex } from "./build";

const fixture = (): Content => {
  const journey = fx.journey();
  // Stop a sits at the fit view: it lands on nothing specific and stays out of the index.
  journey.stops[0].viewport = { x: 500, y: 150, z: 1 };
  journey.stops[1].marker = { x: 120, y: 60, r: 10 };
  const mockImage = { ...fx.image(), id: "mock-image", title: "Mock image", mock: true };
  const draftImage = { ...fx.image(), id: "draft-image", title: "Draft image", validation: { status: "in-review" as const, date: null, notes: "" } };
  const draftLabels = { ...fx.labelSet(), id: "draft-labels", imageIds: ["draft-image"], validation: { status: "draft" as const, date: null, notes: "" } };
  return {
    sources: [fx.source()],
    images: [fx.image(), mockImage, draftImage],
    journeys: [journey],
    pairs: [],
    bandSets: [],
    labels: [fx.labelSet(), draftLabels],
    weekly: [],
  };
};

describe("buildSearchIndex (design.md 15.2, Q1 and Q3)", () => {
  it("indexes approved, non-mock image titles, label texts and the stops that land on one place", () => {
    const { entries } = buildSearchIndex(fixture());
    expect(entries.map((e) => `${e.kind}:${e.text}`)).toEqual([
      "label:Feature A",
      "label:Feature B",
      "stop:Stop b",
      "stop:Stop c",
      "stop:Stop d",
      "stop:Stop e",
      "image:Demo image",
    ]);
  });

  it("links a stop to its Journey and number, counted from 1 over every stop", () => {
    const stop = buildSearchIndex(fixture()).entries.find((e) => e.text === "Stop b")!;
    expect(stop.href).toBe("/demo-tour/?mode=story&stop=2");
    expect(stop.context).toBe("Demo journey · Stop 2 of 5");
  });

  it("links an image to Explore with no context", () => {
    const image = buildSearchIndex(fixture()).entries.find((e) => e.kind === "image")!;
    expect(image).toMatchObject({ href: "/demo/?mode=explore", context: "" });
  });

  it("zooms a label with r so the radius fills a third of the shorter side, else to the nearest stop", () => {
    const { entries } = buildSearchIndex(fixture());
    const b = entries.find((e) => e.text === "Feature B")!;
    // min(1000, 300) / (3 * 40) = 2.5
    expect(b.href).toBe("/demo/?mode=explore&labels=1&x=900&y=250&z=2.5");
    // Feature A at (100, 50): the nearest stop target is stop b's marker (120, 60), z 2.
    expect(entries.find((e) => e.text === "Feature A")!.href).toBe("/demo/?mode=explore&labels=1&x=100&y=50&z=2");
    expect(b.context).toBe("Demo image");
  });

  it("lists the places a point can land on, with the hero image's center as the example", () => {
    const index = buildSearchIndex(fixture());
    expect(index.places).toEqual([{ title: "Demo image", width: 1000, height: 300, href: "/demo/?mode=explore" }]);
    expect(index.example).toBe("500, 150");
  });

  it("is empty when nothing is published", () => {
    const empty: Content = { sources: [], images: [], journeys: [], pairs: [], bandSets: [], labels: [], weekly: [] };
    expect(buildSearchIndex(empty)).toEqual({ entries: [], places: [], example: "" });
  });
});

describe("the index of the real content", () => {
  const content = loadContent({ root: process.cwd(), mode: "production" });
  const index = buildSearchIndex(content);

  it("holds 10 images, 4 labels and the 10 stops that land on one place (Q1)", () => {
    const count = (k: string) => index.entries.filter((e) => e.kind === k).length;
    expect([count("image"), count("label"), count("stop")]).toEqual([10, 4, 10]);
    expect(index.entries.some((e) => e.text === "Your turn" || e.text === "The Andromeda Galaxy" || e.text === "One Sun, seven bands")).toBe(false);
  });

  // In the page the index sits inside the RSC payload's string literal, escaped a second time.
  it("serializes to 8 KB or less as inlined in the HTML (Q2)", () => {
    expect(new TextEncoder().encode(JSON.stringify(JSON.stringify(index))).length).toBeLessThanOrEqual(8192);
  });

  it("links the four labels as Q3 lists them", () => {
    expect(index.entries.filter((e) => e.kind === "label").map((e) => e.href)).toEqual([
      "/andromeda-phat-phast-2025/?mode=explore&labels=1&x=17461&y=6482&z=6",
      "/andromeda-phat-phast-2025/?mode=explore&labels=1&x=11412&y=2448&z=12",
      "/andromeda-phat-phast-2025/?mode=explore&labels=1&x=5330&y=7260&z=15",
      "/sun-sdo-2024-05-10-aia-94/?mode=light&labels=1&x=3020&y=2508&z=5.69",
    ]);
  });

  it("gives a band set label the band set's title as context", () => {
    expect(index.entries.find((e) => e.text === "Active region 13664" && e.kind === "label")!.context).toBe("The Sun in seven SDO channels, 2024-05-10 12:00 UTC");
  });

  it("uses the Andromeda center as the Home example", () => {
    expect(index.example).toBe("21104, 4935");
  });

  it("offers points on the Journey images in roadmap order, a band set as one place, then the rest by id (Q24)", () => {
    expect(index.places.map((p) => p.href)).toEqual([
      "/andromeda-phat-phast-2025/?mode=explore",
      "/sun-sdo-2024-05-10-aia-94/?mode=light",
      "/pillars-hubble-1995/?mode=explore",
      "/pillars-hubble-2014/?mode=explore",
    ]);
  });
});
