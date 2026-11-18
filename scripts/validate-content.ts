import { ContentError, loadContent, type Mode } from "../src/content/load";

const main = () => {
  const mode = (process.argv[2] ?? "production") as Mode;
  if (mode !== "production" && mode !== "development") {
    console.error("Usage: tsx scripts/validate-content.ts [production|development]");
    process.exit(1);
  }
  try {
    const c = loadContent({ root: process.cwd(), mode });
    console.log(`Content OK (${mode}): ${c.sources.length} sources, ${c.images.length} images, ${c.journeys.length} journeys`);
  } catch (err) {
    console.error(err instanceof ContentError ? err.message : err);
    process.exit(1);
  }
};

if (process.argv[1]?.endsWith("validate-content.ts")) main();
