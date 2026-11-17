import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 8434);
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: ORIGIN },
  webServer: {
    command: `npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
    url: ORIGIN,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
