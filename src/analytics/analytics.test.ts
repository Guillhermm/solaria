import { describe, expect, it } from "vitest";
import { analyticsEnabled, createBeforeSend } from "./analytics";

const view = (url: string) => ({ type: "pageview" as const, url });

describe("analyticsEnabled", () => {
  it("is on only for a Vercel build", () => {
    expect(analyticsEnabled({ VERCEL: "1" })).toBe(true);
    expect(analyticsEnabled({})).toBe(false);
    expect(analyticsEnabled({ VERCEL: "0" })).toBe(false);
    expect(analyticsEnabled({ VERCEL: "true" })).toBe(false);
  });
});

describe("createBeforeSend", () => {
  it("strips the query and hash", () => {
    const send = createBeforeSend();
    expect(send(view("https://solaria.zenus.systems/explore/andromeda/?mode=light&x=0.3&y=0.2&z=4#a"))).toEqual(
      view("https://solaria.zenus.systems/explore/andromeda/"),
    );
  });

  it("drops a pageview that only changed the query", () => {
    const send = createBeforeSend();
    expect(send(view("https://s.test/a/?x=1"))).not.toBeNull();
    expect(send(view("https://s.test/a/?x=2"))).toBeNull();
    expect(send(view("https://s.test/b/"))).not.toBeNull();
    expect(send(view("https://s.test/a/"))).not.toBeNull();
  });

  it("keeps custom events and strips their query too", () => {
    const send = createBeforeSend();
    send(view("https://s.test/a/"));
    expect(send({ type: "event", url: "https://s.test/a/?x=1" })).toEqual({ type: "event", url: "https://s.test/a/" });
  });

  it("drops an event whose url cannot be parsed", () => {
    expect(createBeforeSend()(view("not a url"))).toBeNull();
  });
});
