// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { focusTarget, parseAnchor, samePath, scrollBehavior } from "./anchor";

describe("parseAnchor", () => {
  it("splits an in-app link into its path and fragment", () => {
    expect(parseAnchor("/#journeys")).toEqual({ path: "/", id: "journeys" });
    expect(parseAnchor("/about/#credits")).toEqual({ path: "/about/", id: "credits" });
  });

  it("is null for a link without a fragment or with an empty one", () => {
    expect(parseAnchor("/about/")).toBeNull();
    expect(parseAnchor("/about/#")).toBeNull();
  });
});

describe("samePath", () => {
  it("ignores the trailing slash the static export adds", () => {
    expect(samePath("/about", "/about/")).toBe(true);
    expect(samePath("/", "/")).toBe(true);
    expect(samePath("/", "/about/")).toBe(false);
  });
});

describe("scrollBehavior", () => {
  it("animates unless the visitor asked for reduced motion", () => {
    expect(scrollBehavior(false)).toBe("smooth");
    expect(scrollBehavior(true)).toBe("instant");
  });
});

describe("focusTarget", () => {
  const el = (tag: string, ...children: (Element | string)[]) => {
    const node = document.createElement(tag);
    node.append(...children);
    return node;
  };

  it("is the target itself when it is a heading", () => {
    const h = el("h2", "What Solaria is");
    expect(focusTarget(h)).toBe(h);
  });

  it("is the first heading inside a section target", () => {
    const section = el("section", el("p", "x"), el("h2", "Journeys"), el("h3", "Row"));
    expect(focusTarget(section).textContent).toBe("Journeys");
  });

  it("falls back to the target when it holds no heading", () => {
    const div = el("div", el("p", "x"));
    expect(focusTarget(div)).toBe(div);
  });
});
