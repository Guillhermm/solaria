import { describe, expect, it } from "vitest";
import { loadContent } from "@/content/load";
import { buildSearchIndex, type SearchIndex } from "./build";
import { type Here, isSky, parsePoint, search, tierOf } from "./match";

const index = buildSearchIndex(loadContent({ root: process.cwd(), mode: "production" }));
const names = (q: string, here?: Here) => search(index, q, here).rows.map((r) => r.text);
const lines = (q: string, here?: Here) =>
  search(index, q, here).blocks.flatMap((b) => (b.type === "line" ? [b.text] : []));
const groups = (q: string, here?: Here) =>
  search(index, q, here).blocks.flatMap((b) => (b.type === "group" ? [b.label] : []));

const HINT = "Search image titles, feature labels and Journey stop titles. To go to a point, type its image pixels, like 21104, 4935.";
const SUN = ["aia-1700", "aia-171", "aia-193", "aia-211", "aia-304", "aia-94", "hmi-6173"];
const sunTitle = (band: string) => `The Sun, SDO ${band.startsWith("hmi") ? "HMI" : "AIA"} ${band.split("-")[1]} Å, 2024-05-10 12:00 UTC`;

const andromedaHere = (): Here => ({
  imageIds: ["andromeda-phat-phast-2025"],
  width: 42208,
  height: 9870,
  pointHref: (x, y) => `/andromeda-phat-phast-2025/?mode=explore&x=${x}&y=${y}&z=4`,
});

describe("tierOf (Q15)", () => {
  it("is 0 for the same words, 1 for a leading prefix match, 2 for any other match, null for none", () => {
    expect(tierOf(["ngc", "206"], ["ngc", "206"])).toBe(0);
    expect(tierOf(["andromeda", "core"], ["andro"])).toBe(1);
    expect(tierOf(["the", "bright", "center"], ["the", "bri"])).toBe(1);
    expect(tierOf(["satellite", "galaxy", "m32"], ["m32"])).toBe(2);
    expect(tierOf(["satellite", "galaxy", "m32"], ["m32", "gal"])).toBe(2);
    expect(tierOf(["ngc", "206"], ["ngc", "207"])).toBeNull();
  });
});

describe("search vectors on Home (Q16)", () => {
  it("m32", () => expect(names("m32")).toEqual(["Satellite galaxy M32", "The companion galaxy M32"]));
  it("andromeda", () => expect(names("andromeda")).toEqual(["Andromeda core", "Andromeda Galaxy (M31), Hubble PHAT+PHAST panorama"]));
  it("171", () => expect(names("171")).toEqual(["171 Å, active region 13664", sunTitle("aia-171")]));
  it("active", () =>
    expect(names("active")).toEqual(["Active region 13664", "Active region 13664", "171 Å, active region 13664", "211 Å, active region 13664"]));

  it("your turn: the fit-view stops are not indexed, so nothing matches", () => {
    expect(names("your turn")).toEqual([]);
    expect(lines("your turn")).toEqual(["No matches for “your turn”.", HINT]);
    expect(search(index, "your turn").live).toBe("No results");
  });

  it("sun: the seven SDO images, no overflow line", () => {
    expect(names("sun")).toEqual(SUN.map(sunTitle));
    expect(lines("sun")).toEqual([]);
    expect(search(index, "sun").live).toBe("7 results");
  });

  it("the: 11 matches, 8 shown, with the overflow line", () => {
    expect(names("the")).toEqual(["The bright center", "The companion galaxy M32", ...SUN.slice(0, 6).map(sunTitle)]);
    expect(lines("the")).toEqual(["Showing 8 of 11. Type more to narrow."]);
    expect(search(index, "the").live).toBe("11 results");
  });

  it("pillars", () => expect(names("pillars")).toEqual(["Pillars of Creation, Hubble 1995 (WFPC2)", "Pillars of Creation, Hubble 2014 (WFC3)"]));

  it("Å folds to a", () => expect(names("171 a")[0]).toBe("171 Å, active region 13664"));

  it("one result says so in the singular", () => expect(search(index, "dust").live).toBe("1 result"));

  it("rows carry their kind, context and marks", () => {
    const [row] = search(index, "dust").rows;
    expect(row).toMatchObject({ kind: "stop", text: "Dust lanes", context: "Andromeda, star by star · Stop 3 of 7", href: "/andromeda/?mode=story&stop=3" });
    expect(row.marks).toEqual([
      { text: "Dust", strong: true },
      { text: " lanes", strong: false },
    ]);
  });
});

describe("the viewer ranks the current page's image first (Q15)", () => {
  it("puts the Sun's label ahead on a Sun page", () => {
    const here: Here = { imageIds: ["sun-sdo-2024-05-10-aia-171"], width: 4096, height: 4096, pointHref: () => "" };
    expect(names("a", here)[0]).toBe("Active region 13664");
    expect(names("a")[0]).toBe("Andromeda core");
  });
});

describe("the empty query (states table)", () => {
  it("shows the hint, then every label under Labeled features", () => {
    const r = search(index, "  ");
    expect(lines("")).toEqual([HINT]);
    expect(groups("")).toEqual(["Labeled features"]);
    expect(r.rows.map((x) => x.text)).toEqual(["Andromeda core", "Satellite galaxy M32", "NGC 206", "Active region 13664"]);
    expect(r.live).toBe("");
  });

  it("lists the current image's labels first in the viewer, with its own example", () => {
    const here: Here = { imageIds: ["sun-sdo-2024-05-10-aia-94"], width: 4096, height: 4096, pointHref: () => "" };
    expect(names("", here)[0]).toBe("Active region 13664");
    expect(lines("", here)).toEqual([HINT.replace("21104, 4935", "2048, 2048")]);
  });

  it("says when there is nothing to search", () => {
    const empty: SearchIndex = { entries: [], places: [], example: "" };
    expect(search(empty, "").blocks).toEqual([{ type: "line", text: "Nothing to search yet." }]);
    expect(search(empty, "m32").blocks).toEqual([{ type: "line", text: "Nothing to search yet." }]);
  });
});

describe("parsePoint (Q22)", () => {
  it("reads two numbers split by a comma, spaces or both, rounding decimals", () => {
    expect(parsePoint("17461, 6482")).toEqual({ x: 17461, y: 6482 });
    expect(parsePoint("17461 6482")).toEqual({ x: 17461, y: 6482 });
    expect(parsePoint(" 17461 ,6482 ")).toEqual({ x: 17461, y: 6482 });
    expect(parsePoint("10.6, -3.2")).toEqual({ x: 11, y: -3 });
  });

  it("reads -0.4 as 0, never -0", () => {
    expect(Object.is(parsePoint("-0.4, 5")?.x, 0)).toBe(true);
  });

  it("rejects numbers past the safe integers, which would print in exponent form", () => {
    expect(parsePoint("99999999999999999999999, 1")).toBeNull();
    expect(lines("99999999999999999999999, 1").some((l) => l.includes("e+"))).toBe(false);
  });

  it("rejects anything else", () => {
    for (const q of ["17461", "1,2,3", "1e3, 4", "x 1 2", "1,, 2", ""]) expect(parsePoint(q)).toBeNull();
  });
});

describe("isSky (Q25)", () => {
  it("detects a digit followed by an hour, minute, second or degree sign, or the words ra and dec", () => {
    for (const q of ["00h42m44s", "41°16′", "41° 16' 9\"", "ra 10.68", "Dec +41", "12″"]) expect(isSky(q)).toBe(true);
  });

  it("leaves names and pixels alone", () => {
    for (const q of ["m32", "171", "2048, 2048", "radius", "decade", "active region"]) expect(isSky(q)).toBe(false);
  });
});

describe("points on Home (Q24)", () => {
  it("2048, 2048 gives Andromeda, the Sun band set, then Pillars 2014", () => {
    const r = search(index, "2048, 2048");
    expect(groups("2048, 2048")).toEqual(["Go to a point"]);
    expect(r.rows.map((x) => [x.kind, x.text, x.context, x.href])).toEqual([
      ["point", "Go to 2048, 2048", "Andromeda Galaxy (M31), Hubble PHAT+PHAST panorama", "/andromeda-phat-phast-2025/?mode=explore&x=2048&y=2048&z=4"],
      ["point", "Go to 2048, 2048", "The Sun in seven SDO channels, 2024-05-10 12:00 UTC", "/sun-sdo-2024-05-10-aia-94/?mode=light&x=2048&y=2048&z=4"],
      ["point", "Go to 2048, 2048", "Pillars of Creation, Hubble 2014 (WFC3)", "/pillars-hubble-2014/?mode=explore&x=2048&y=2048&z=4"],
    ]);
  });

  it("says when no image has the pixel, after any name rows", () => {
    expect(lines("90000, 5")).toEqual(["No image has a pixel at 90000, 5."]);
    expect(names("90000, 5")).toEqual([]);
  });
});

describe("points in the viewer (Q23)", () => {
  it("offers one row in this image", () => {
    const r = search(index, "17461 6482", andromedaHere());
    expect(r.rows).toEqual([
      expect.objectContaining({ kind: "point", text: "Go to 17461, 6482", context: "In this image", href: "/andromeda-phat-phast-2025/?mode=explore&x=17461&y=6482&z=4" }),
    ]);
  });

  it("explains the range when the point is outside", () => {
    expect(lines("42208, 0", andromedaHere())).toEqual(["No pixel at 42208, 0 in this image. Points run from 0, 0 to 42207, 9869."]);
    expect(lines("-1, 5", andromedaHere())).toEqual(["No pixel at -1, 5 in this image. Points run from 0, 0 to 42207, 9869."]);
  });

  it("a point query still runs name matching, point rows after the name rows", () => {
    // "2024 10" is also the date in every SDO title.
    const r = search(index, "2024 10", andromedaHere());
    expect(groups("2024 10", andromedaHere())).toEqual(["Results", "Go to a point"]);
    expect(r.rows.map((x) => x.kind)).toEqual([...SUN.map(() => "image"), "point"]);
    expect(r.live).toBe("8 results");
  });
});

describe("sky coordinates (Q25)", () => {
  it("show the note with the example and no point row", () => {
    expect(lines("00h 42m 44s")).toEqual(["Sky coordinates (RA and Dec) are not supported yet. Type image pixels instead, like 21104, 4935."]);
    expect(search(index, "00h 42m 44s").rows).toEqual([]);
  });
});
