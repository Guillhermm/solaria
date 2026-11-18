import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { image as fixtureImage, source as fixtureSource } from "@/content/__fixtures__/content";
import type { ImageManifest, Source } from "@/content/types";
import { infoFor } from "./info";

const read = <T>(path: string) => JSON.parse(readFileSync(join(process.cwd(), path), "utf8")) as T;

describe("info panel fields for Andromeda", () => {
  const image = read<ImageManifest>("data/images/andromeda-phat-phast-2025.json");
  const source = read<Source>("data/sources/andromeda-phat-phast-2025.json");
  const info = infoFor(image, source);

  it("lists the stated fields in order, from the manifest only", () => {
    expect(info.fields).toEqual([
      { label: "Target", values: ["M31, the Andromeda Galaxy"], draft: false },
      { label: "Observatory", values: ["Hubble"], draft: false },
      { label: "Camera", values: ["Advanced Camera for Surveys (ACS)"], draft: false },
      { label: "Filters", values: ["F475W shown as blue", "F814W shown as yellow"], draft: false },
      { label: "Observed", values: ["2010-07 to 2022-12"], draft: false },
      { label: "Released", values: ["2025-01-16"], draft: false },
    ]);
  });

  it("takes the credit and source page unaltered from the source record", () => {
    expect(info.credit).toBe(source.credit);
    expect(info.sourceUrl).toBe("https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/");
  });

  it("carries every caveat", () => {
    expect(info.caveats).toEqual(image.caveats);
    expect(info.caveats).toHaveLength(5);
  });
});

describe("info panel field selection", () => {
  it("leaves out what the manifest does not state", () => {
    const image = fixtureImage();
    delete image.observedAt;
    delete image.caveats;
    const info = infoFor(image, fixtureSource());
    expect(info.fields.map((f) => f.label)).toEqual(["Target", "Observatory", "Camera", "Filter", "Released"]);
    expect(info.caveats).toEqual([]);
  });

  it("never states a wavelength or filter kind, even when the manifest has one", () => {
    const info = infoFor(fixtureImage(), fixtureSource());
    expect(info.fields.find((f) => f.label === "Filter")?.values).toEqual(["F475W shown as blue"]);
  });

  it("names a band without a color when the mapping gives it none", () => {
    const image = fixtureImage();
    image.bands.value.push({ id: "F814W" });
    expect(infoFor(image, fixtureSource()).fields.find((f) => f.label === "Filters")?.values).toEqual([
      "F475W shown as blue",
      "F814W",
    ]);
  });

  it("describes grayscale and color-table mappings", () => {
    const gray = fixtureImage();
    gray.colorMapping = { ...gray.colorMapping, value: { kind: "grayscale" } };
    expect(infoFor(gray, fixtureSource()).fields.find((f) => f.label === "Filter")?.values).toEqual([
      "F475W",
      "Shown in grayscale",
    ]);
    const table = fixtureImage();
    table.colorMapping = { ...table.colorMapping, value: { kind: "standard-colortable", name: "SDO AIA 171" } };
    expect(infoFor(table, fixtureSource()).fields.find((f) => f.label === "Filter")?.values).toContain(
      "Shown with the SDO AIA 171 color table",
    );
  });

  it("states a single-month or single-day observation once", () => {
    const image = fixtureImage();
    image.observedAt = { value: { start: "2014-09", end: "2014-09" }, source: "x", status: "verified" };
    expect(infoFor(image, fixtureSource()).fields.find((f) => f.label === "Observed")?.values).toEqual(["2014-09"]);
  });

  it("marks an unverified claim as draft", () => {
    const image = fixtureImage();
    image.target = { ...image.target, status: "unverified" };
    const target = infoFor(image, fixtureSource()).fields[0];
    expect(target).toEqual({ label: "Target", values: ["M31"], draft: true });
  });

  it("names several cameras in the plural", () => {
    const image = fixtureImage();
    image.instruments = { ...image.instruments, value: ["ACS", "WFC3"] };
    expect(infoFor(image, fixtureSource()).fields[2]).toEqual({ label: "Cameras", values: ["ACS", "WFC3"], draft: false });
  });
});
