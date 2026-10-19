import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

// La suite usa un backend aislado y sin red upstream; cada caso instala fixtures para la API.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Arranca Vite y el backend local con puertos dedicados al proceso de pruebas.
    command: 'node scripts/run-app.js dev --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      MASTERDEX_API_PORT: '3101',
      MASTERDEX_OFFLINE: 'true',
    },
  },
});
