import { defineConfig, devices } from "@playwright/test";

/**
 * E2E y accesibilidad contra la aplicación en MODO DEMOSTRACIÓN (sin Supabase, datos ficticios).
 * Usa el servidor de desarrollo porque el acceso demo está deliberadamente deshabilitado en producción.
 * Local: E2E_PORT=3100 si ya tienes `pnpm dev` en marcha. En CI arranca su propio servidor.
 */
const port = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "es-ES",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev -p ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", ANTHROPIC_API_KEY: "", MSM_DATA_MODE: "demo" },
  },
});
