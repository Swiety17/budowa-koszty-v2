import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  retries: 1,
  use: {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    launchOptions: {
      slowMo: 100,
    },
  },
})
