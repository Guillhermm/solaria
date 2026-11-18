import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// next build copies public/ into out/, mock tiles included. A production build never
// loads mock content, so its tiles have no reason to ship. Returns the removed names.
export const stripMockTiles = (outDir: string) => {
  const tiles = join(outDir, "tiles");
  let entries;
  try {
    entries = readdirSync(tiles, { withFileTypes: true });
  } catch {
    return [];
  }
  const removed = entries.filter((e) => e.isDirectory() && e.name.startsWith("mock-")).map((e) => e.name);
  for (const name of removed) rmSync(join(tiles, name), { recursive: true });
  return removed;
};

if (process.argv[1]?.endsWith("strip-mock-tiles.ts")) {
  // The end-to-end build keeps them: it is built with the mock content (src/content/load.ts).
  if (process.env.SOLARIA_CONTENT === "development") {
    console.log("SOLARIA_CONTENT=development: mock tiles kept");
    process.exit(0);
  }
  const removed = stripMockTiles(process.argv[2] ?? "out");
  console.log(`Removed ${removed.length} mock tile trees from the build output`);
}
