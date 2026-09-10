import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', timeout: 30_000, use: { channel: 'chromium', baseURL: 'http://127.0.0.1:5173', viewport: { width: 1560, height: 1000 } }, reporter: 'list' });
