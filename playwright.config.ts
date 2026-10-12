import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Testes de navegador (E2E) do Painel Axven. Rodam contra o `next dev` local,
// que fala com o Supabase de produção: por isso os dados de teste são criados
// no globalSetup e apagados no globalTeardown (ver e2e/apoio/dadosTeste.ts).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
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
