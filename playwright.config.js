import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:41731',
    viewport: { width: 1280, height: 800 },
    launchOptions: process.env.CI ? {} : { executablePath: '/opt/pw-browsers/chromium' },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 41731 --strictPort',
    port: 41731,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
