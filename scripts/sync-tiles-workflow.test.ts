import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { imageIds, NOT_REBUILT } from "./build-tiles";

const workflow = readFileSync(".github/workflows/sync-tiles.yml", "utf8");
const options = () => {
  const block = workflow.split("options:\n")[1] ?? "";
  return block.split("\n").map((l) => /^\s+- (\S+)$/.exec(l)?.[1]).filter((v) => v !== undefined);
};

describe("sync-tiles workflow", () => {
  it("offers all plus every image build-tiles can rebuild, and nothing else", () => {
    const listed = options().filter((o) => o !== "all");
    const buildable = imageIds(process.cwd()).filter((id) => !(id in NOT_REBUILT)).sort();
    expect(options()[0]).toBe("all");
    expect(listed.sort()).toEqual(buildable);
  });

  it("passes the choice through the environment", () => {
    expect(workflow).toContain("IMAGES: ${{ inputs.images }}");
    expect(workflow).toContain('build-tiles -- "$IMAGES"');
  });
});
