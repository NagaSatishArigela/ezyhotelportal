import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  ...base,
  testMatch: 'session-listing.spec.ts',
  workers: 1,
  reporter: 'list',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3188', trace: 'on', screenshot: 'on' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3188 --strictPort',
    url: 'http://127.0.0.1:3188',
    reuseExistingServer: false,
    env: { VITE_API_URL: '/api' },
  },
})
