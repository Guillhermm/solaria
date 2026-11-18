import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { stagedImageIds } from "../src/content/load";

// next build copies public/ into out/, mock tiles included. A production build never
// loads mock content, nor images staged in data/staging/ for science review, so their tiles
// have no reason to ship. Returns the removed names.
export const stripMockTiles = (outDir: string, staged: string[] = []) => {
  const tiles = join(outDir, "tiles");
  let entries;
  try {
    entries = readdirSync(tiles, { withFileTypes: true });
  } catch {
    return [];
  }
  const removed = entries.filter((e) => e.isDirectory() && (e.name.startsWith("mock-") || staged.includes(e.name))).map((e) => e.name);
  for (const name of removed) rmSync(join(tiles, name), { recursive: true });
  return removed;
};

if (process.argv[1]?.endsWith("strip-mock-tiles.ts")) {
  // The end-to-end build keeps them: it is built with the mock content (src/content/load.ts).
  if (process.env.SOLARIA_CONTENT === "development") {
    console.log("SOLARIA_CONTENT=development: mock tiles kept");
    process.exit(0);
  }
  const removed = stripMockTiles(process.argv[2] ?? "out", stagedImageIds(process.cwd()));
  console.log(`Removed ${removed.length} mock and staged tile trees from the build output`);
}
