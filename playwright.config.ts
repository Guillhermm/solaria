import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 8434);
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: ORIGIN },
  webServer: {
    // It moves to out-e2e/ (scripts/e2e-output.ts), so out/ never holds mock content.
    command: `npm run build && npx tsx scripts/e2e-output.ts && npx tsx scripts/serve-static.ts out-e2e ${PORT}`,
    url: ORIGIN,
    reuseExistingServer: false,
    timeout: 300_000,
    // The end-to-end build includes the mock content (the Compare pair); see src/content/load.ts.
    env: { NEXT_TELEMETRY_DISABLED: "1", SOLARIA_CONTENT: "development" },
  },
});
