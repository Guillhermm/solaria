import { describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/content";
import { publishProblems } from "./gate";
import type { Content } from "./types";

const content = (): Content => ({ sources: [fx.source()], images: [fx.image()], journeys: [fx.journey()], pairs: [], bandSets: [] });

describe("publishProblems", () => {
  it("is empty for an approved set", () => {
    expect(publishProblems(content())).toEqual([]);
  });

  it("flags mock records", () => {
    const c = content();
    c.images[0].mock = true;
    expect(publishProblems(c)).toEqual(["image demo: mock content cannot be published"]);
  });

  it.each(["draft", "in-review", "rejected"] as const)("flags a %s source", (status) => {
    const c = content();
    c.sources[0].validation.status = status;
    expect(publishProblems(c)).toEqual([`source demo: validation.status is "${status}", expected "approved"`]);
  });

  it("flags an unapproved image and the journey that uses it", () => {
    const c = content();
    c.images[0].validation.status = "draft";
    expect(publishProblems(c)).toEqual([
      'image demo: validation.status is "draft", expected "approved"',
      'journey demo-tour: image "demo" is not approved',
    ]);
  });

  it("flags an unapproved stop", () => {
    const c = content();
    c.journeys[0].stops[3].validation.status = "in-review";
    expect(publishProblems(c)).toEqual(['journey demo-tour stop d: validation.status is "in-review", expected "approved"']);
  });

  it("flags an unverified claim, optional ones included", () => {
    const c = content();
    c.images[0].bands.status = "unverified";
    c.images[0].pixelScale = { value: { value: 0.2, unit: "arcsec/px" }, source: "https://example.org/x", status: "unverified" };
    expect(publishProblems(c)).toEqual(["image demo: bands is unverified", "image demo: pixelScale is unverified"]);
  });

  it("accepts supported and verified claims", () => {
    const c = content();
    c.images[0].bands.status = "verified";
    expect(publishProblems(c)).toEqual([]);
  });

  it.each([4, 9])("flags a journey with %i stops", (n) => {
    const c = content();
    c.journeys[0].stops = Array.from({ length: n }, (_, i) => fx.stop(`s${i}`));
    expect(publishProblems(c)).toEqual([`journey demo-tour: has ${n} stops, expected 5 to 8`]);
  });

  it.each([5, 8])("accepts a journey with %i stops", (n) => {
    const c = content();
    c.journeys[0].stops = Array.from({ length: n }, (_, i) => fx.stop(`s${i}`));
    expect(publishProblems(c)).toEqual([]);
  });

  describe("pairs and band sets", () => {
    const withGroups = () => {
      const c = content();
      c.images.push({ ...fx.image(), id: "demo-b" }, { ...fx.image(), id: "demo-c" });
      c.pairs = [fx.pair()];
      c.bandSets = [fx.bandSet()];
      return c;
    };

    it("is empty for approved ones", () => {
      expect(publishProblems(withGroups())).toEqual([]);
    });

    it("flags mock ones", () => {
      const c = withGroups();
      c.pairs[0].mock = true;
      c.bandSets[0].mock = true;
      expect(publishProblems(c)).toEqual([
        "pair demo-pair: mock content cannot be published",
        "band set demo-bands: mock content cannot be published",
      ]);
    });

    it("flags an unapproved record and an unapproved image", () => {
      const c = withGroups();
      c.pairs[0].validation.status = "draft";
      c.images[1].validation.status = "in-review";
      expect(publishProblems(c)).toEqual([
        'image demo-b: validation.status is "in-review", expected "approved"',
        'pair demo-pair: validation.status is "draft", expected "approved"',
        'pair demo-pair: image "demo-b" is not approved',
        'band set demo-bands: image "demo-b" is not approved',
      ]);
    });

    it("flags a group whose note is still empty", () => {
      const c = withGroups();
      c.bandSets[0].whatDiffers = " ";
      expect(publishProblems(c)).toEqual(["band set demo-bands: whatDiffers is empty"]);
    });
  });
});
