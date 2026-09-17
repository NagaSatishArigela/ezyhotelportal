import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  ...base,
  testMatch: 'hotel-roles.spec.ts',
  workers: 2,
  reporter: 'list',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3187' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3187 --strictPort',
    url: 'http://127.0.0.1:3187',
    reuseExistingServer: false,
    env: { VITE_API_URL: '/api' },
  },
})
