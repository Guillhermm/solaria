import { describe, expect, it } from "vitest";
import { createSync, dividerKey, dividerValueText, handleCenter, splitFromPointer, stopHandleCenter } from "./divider";

describe("dividerKey", () => {
  it("moves 1 % with the arrows and 10 % with Shift", () => {
    expect(dividerKey("ArrowLeft", false, 50)).toBe(49);
    expect(dividerKey("ArrowRight", false, 50)).toBe(51);
    expect(dividerKey("ArrowRight", true, 50)).toBe(60);
    expect(dividerKey("ArrowLeft", true, 50)).toBe(40);
  });
  it("goes to the ends with Home and End and stays inside 0..100", () => {
    expect(dividerKey("Home", false, 37)).toBe(0);
    expect(dividerKey("End", false, 37)).toBe(100);
    expect(dividerKey("ArrowLeft", true, 4)).toBe(0);
    expect(dividerKey("ArrowRight", true, 96)).toBe(100);
  });
  it("ignores other keys", () => {
    expect(dividerKey("a", false, 50)).toBeNull();
    expect(dividerKey("Enter", false, 50)).toBeNull();
  });
});

describe("splitFromPointer", () => {
  it("gives an integer percent of the box, clamped", () => {
    expect(splitFromPointer(300, { left: 100, width: 800 })).toBe(25);
    expect(splitFromPointer(50, { left: 100, width: 800 })).toBe(0);
    expect(splitFromPointer(1000, { left: 100, width: 800 })).toBe(100);
  });
});

describe("dividerValueText", () => {
  it("says the split and both sides", () => {
    expect(dividerValueText(62, ["2014", "1995"])).toBe("62 %, 2014 on the left, 1995 on the right");
  });
});

describe("createSync", () => {
  it("copies only the leader's changes", () => {
    const sync = createSync<"a" | "b">();
    let copies = 0;
    expect(sync.changed("a", () => copies++)).toBe(false);
    sync.lead("a");
    expect(sync.changed("a", () => copies++)).toBe(true);
    expect(sync.changed("b", () => copies++)).toBe(false);
    expect(copies).toBe(1);
  });
  it("never echoes: a change raised inside a copy is not copied back", () => {
    const sync = createSync<"a" | "b">();
    sync.lead("a");
    const log: string[] = [];
    sync.changed("a", () => {
      log.push("a to b");
      // b's viewport-change fires synchronously while a copies into it.
      sync.lead("b");
      sync.changed("b", () => log.push("b to a"));
    });
    expect(log).toEqual(["a to b"]);
  });
});

describe("handleCenter", () => {
  const range = { top: 0, bottom: 900 };
  it("keeps the middle where the handle fits there", () => {
    expect(handleCenter(range, [{ top: 0, bottom: 80 }], 44, 16)).toBe(450);
  });
  it("moves to the middle of the tallest free stretch when an overlay covers the middle", () => {
    // The overview card 87 to 462 and the zoom controls from 710: free from 478 to 694.
    expect(handleCenter(range, [{ top: 87, bottom: 462 }, { top: 710, bottom: 888 }], 44, 16)).toBe(586);
  });
  it("is null when nothing is tall enough", () => {
    expect(handleCenter({ top: 0, bottom: 100 }, [{ top: 20, bottom: 80 }], 44, 16)).toBeNull();
  });
});

describe("stopHandleCenter", () => {
  const range = { top: 0, bottom: 800 };
  const size = 48;
  const gap = 16;

  it("takes the middle of the free stretch below the marker", () => {
    // Below the marker: 316 to 584 (the bar at 600 less the gap).
    expect(stopHandleCenter(range, [{ top: 600, bottom: 800 }], { top: 200, bottom: 300 }, size, gap, 600)).toBe(450);
  });
  it("goes above the marker when nothing fits below it", () => {
    expect(stopHandleCenter(range, [{ top: 0, bottom: 60 }, { top: 400, bottom: 800 }], { top: 250, bottom: 360 }, size, gap, 400)).toBe(155);
  });
  it("sits half a gap above the floor when it fits neither below nor above", () => {
    expect(stopHandleCenter(range, [{ top: 0, bottom: 150 }, { top: 420, bottom: 800 }], { top: 180, bottom: 390 }, size, gap, 420)).toBe(420 - 8 - 24);
  });
  it("prefers the nearest stretch below over a taller one further down", () => {
    const blocked = [{ top: 380, bottom: 400 }, { top: 780, bottom: 800 }];
    expect(stopHandleCenter(range, blocked, { top: 200, bottom: 300 }, size, gap, 780)).toBe((316 + 364) / 2);
  });
});
