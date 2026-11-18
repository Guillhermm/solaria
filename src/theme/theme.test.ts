// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { otherTheme, readTheme, setTheme, subscribeTheme } from "./theme";

const bootScript = readFileSync(join(process.cwd(), "public/theme-init.js"), "utf8");

const fakeMedia = (matches: boolean) => {
  const listeners: (() => void)[] = [];
  const query = {
    matches,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    change: (next: boolean) => {
      query.matches = next;
      listeners.forEach((fn) => fn());
    },
  };
};

// jsdom does not execute <script> elements by default, so run the file's text directly.
const runBoot = () => new Function(bootScript)();

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe("theme-init.js", () => {
  it("follows the system setting when nothing is stored", () => {
    fakeMedia(true);
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("defaults to dark when the system has no light preference", () => {
    fakeMedia(false);
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("prefers the stored choice over the system", () => {
    fakeMedia(true);
    localStorage.setItem("theme", "dark");
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores a stored value that is not a theme", () => {
    fakeMedia(true);
    localStorage.setItem("theme", "sepia");
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("tracks system changes until the user picks a theme", () => {
    const media = fakeMedia(false);
    runBoot();
    media.change(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    localStorage.setItem("theme", "light");
    media.change(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("theme helpers", () => {
  it("reads dark unless the root says light", () => {
    const root = document.createElement("html");
    expect(readTheme(root)).toBe("dark");
    root.dataset.theme = "light";
    expect(readTheme(root)).toBe("light");
  });

  it("flips between the two themes", () => {
    expect(otherTheme("dark")).toBe("light");
    expect(otherTheme("light")).toBe("dark");
  });

  it("sets the attribute and stores the choice", () => {
    const root = document.createElement("html");
    setTheme(root, "light", localStorage);
    expect(root.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("still switches when storage refuses the write", () => {
    const root = document.createElement("html");
    const refusing = { setItem: () => { throw new Error("denied"); } } as unknown as Storage;
    setTheme(root, "light", refusing);
    expect(root.dataset.theme).toBe("light");
  });

  it("notifies subscribers when the attribute changes", async () => {
    const root = document.createElement("html");
    const onChange = vi.fn();
    const stop = subscribeTheme(root, onChange);
    root.dataset.theme = "light";
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });
});
