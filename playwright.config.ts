import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Testes de navegador (E2E) das páginas públicas do site. Rodam contra o `next dev` local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
