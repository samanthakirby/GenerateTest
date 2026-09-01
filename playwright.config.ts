import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Generate KiwiSaver join-form suite.
 * See NOTES.md for the reasoning behind the retry/trace choices.
 */
export default defineConfig({
  testDir: './tests/specs',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  /**
   * The target is a live production site behind a CDN with third-party widgets.
   * One local retry keeps genuine regressions visible while absorbing the odd
   * network blip; traces below make any retry diagnosable.
   */
  retries: process.env.CI ? 2 : 1,

  /**
   * Be a considerate guest on someone else's production form: CloudFront
   * rate-limits concurrent headless traffic with a 403 interstitial, so the
   * suite runs near-serially. Slower, but it is the target's constraint,
   * not ours to optimise away. See NOTES.md.
   */
  workers: 1,

  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: 'https://www.generatewealth.co.nz',

    /* Artefacts for anything that is not a clean first-attempt pass. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
