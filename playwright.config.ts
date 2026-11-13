import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/meridian-tryon/`,
    trace: 'off',
    launchOptions: {
      // CI machines have no GPU: render WebGL in software so the 3D paths are exercised too.
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs`,
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/meridian-tryon/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
