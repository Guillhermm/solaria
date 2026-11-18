import { existsSync, renameSync, rmSync } from "node:fs";

// The end-to-end build carries the mock content (SOLARIA_CONTENT=development). It moves out of
// out/ at once, so a later deploy or R2 sync of out/ can never pick up mocks.
export const E2E_OUT = "out-e2e";

export const moveBuild = (from = "out", to = E2E_OUT) => {
  if (!existsSync(from)) throw new Error(`${from}/ does not exist: run the build first`);
  rmSync(to, { recursive: true, force: true });
  renameSync(from, to);
};

if (process.argv[1]?.endsWith("e2e-output.ts")) {
  moveBuild();
  console.log(`Moved the end-to-end build to ${E2E_OUT}/`);
}
