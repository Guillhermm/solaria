import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 8434);

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
