import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BrowserContext } from '@playwright/test';

/**
 * Traffic reduction for a suite that runs against a live, CDN-fronted site.
 *
 * A single load of the join page makes ~334 requests to generatewealth.co.nz,
 * Nuxt speculatively prefetches every route chunk. Multiplied across the suite
 * that is thousands of requests per run, which is what trips CloudFront's rate
 * limit and returns a 403 interstitial instead of the form.
 *
 * These helpers cut it to roughly one origin request per test:
 *   - static assets are fetched once, cached on disk, and replayed thereafter
 *   - third-party analytics/chat/ad traffic is dropped entirely
 *
 * The HTML document is deliberately never cached, so every test still exercises
 * the current page. The cache directory is gitignored and self-populating,
 * delete it to pick up a new deployment's bundle.
 */

const CACHE_DIR = join(process.cwd(), '.cache', 'playwright-assets');

/** Static asset extensions safe to replay from disk. */
const STATIC_ASSET = /\.(js|mjs|css|woff2?|ttf|eot|png|jpe?g|gif|svg|webp|avif|ico|map)(\?|$)/i;

/** Third-party hosts that contribute nothing to the form's behaviour. */
const THIRD_PARTY_NOISE = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'google.com',
  'googleapis.com',
  'gstatic.com',
  'facebook.net',
  'facebook.com',
  'linkedin.com',
  'licdn.com',
  'bing.com',
  'teads.tv',
  'adsrvr.org',
  'pendo.io',
  'liveperson.net',
  'lpsnmedia.net',
  'hotjar.com',
  'clarity.ms',
  'onetrust.com',
  'cookielaw.org',
];

function cachePathFor(url: string): string {
  return join(CACHE_DIR, createHash('sha1').update(url).digest('hex') + '.json');
}

interface CachedAsset {
  status: number;
  contentType: string;
  bodyBase64: string;
}

/**
 * Replays generatewealth.co.nz static assets from a local disk cache, fetching
 * and storing each one the first time it is seen.
 */
export async function cacheStaticAssets(context: BrowserContext): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });

  await context.route(
    (url) => url.hostname.endsWith('generatewealth.co.nz') && STATIC_ASSET.test(url.pathname),
    async (route) => {
      const url = route.request().url();
      const cacheFile = cachePathFor(url);

      // Cache hit: serve from disk, no origin request at all.
      try {
        const cached: CachedAsset = JSON.parse(await readFile(cacheFile, 'utf8'));
        await route.fulfill({
          status: cached.status,
          contentType: cached.contentType,
          body: Buffer.from(cached.bodyBase64, 'base64'),
        });
        return;
      } catch {
        // Not cached yet — fall through and fetch it.
      }

      let response;
      try {
        response = await route.fetch();
      } catch {
        // Network hiccup on an asset: let Playwright handle it normally.
        await route.fallback();
        return;
      }

      const body = await response.body();
      const contentType = response.headers()['content-type'] ?? 'application/octet-stream';

      if (response.status() === 200) {
        const entry: CachedAsset = {
          status: 200,
          contentType,
          bodyBase64: body.toString('base64'),
        };
        // Best-effort write; a failed cache write must never fail a test.
        await writeFile(cacheFile, JSON.stringify(entry)).catch(() => undefined);
      }

      // Replay the decoded body, so content-encoding/length headers are dropped.
      await route.fulfill({ status: response.status(), contentType, body });
    },
  );
}

/** Drops analytics, chat and advertising traffic. */
export async function blockThirdPartyNoise(context: BrowserContext): Promise<void> {
  await context.route(
    (url) => THIRD_PARTY_NOISE.some((host) => url.hostname.endsWith(host)),
    (route) => route.abort(),
  );
}
