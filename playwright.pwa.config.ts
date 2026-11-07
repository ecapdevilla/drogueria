import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: './e2e-pwa',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // El build de la PWA también se prueba en modo local.
    env: {
      ...(process.env as Record<string, string>),
      VITE_AUTH_ENABLED: 'false',
      VITE_DATA_MODE: 'local',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
