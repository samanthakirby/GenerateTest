import { expect, test } from '../fixtures/join-form.fixture';
import { extractPdfText } from '../utils/pdf';

const PRIVACY_STATEMENT_HREF = 'https://www.generatewealth.co.nz/privacystatementonboarding';
const DECLARATION_HREF = 'https://www.generatewealth.co.nz/declarations';
const DECLARATION_FINAL_URL = 'https://www.generatewealth.co.nz/kiwisaver/declarations';
const EXPECTED_PDS_VERSION = /1\s+december\s+2025/i;

test.describe('Step 1 — consent document links', () => {
  test('Product Disclosure Statement downloads the current (1 Dec 2025) PDS', async ({
    joinPage,
  }) => {
    const download = await joinPage.downloadProductDisclosureStatement();

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    expect(await download.failure()).toBeNull();

    const path = await download.path();
    expect(path, 'PDS download should complete').toBeTruthy();

    const { readFile } = await import('node:fs/promises');
    const contents = await readFile(path!);
    expect(contents.subarray(0, 4).toString()).toBe('%PDF');
    expect(contents.byteLength).toBeGreaterThan(100_000);

    const text = await extractPdfText(path!);
    expect(text).toMatch(/Generate KiwiSaver Scheme/i);
    expect(text).toMatch(/Product Disclosure Statement/i);
    expect(
      text,
      'expected the 1 December 2025 PDS — has a new version been published?',
    ).toMatch(EXPECTED_PDS_VERSION);

    await test.info().attach('product-disclosure-statement.pdf', {
      path: path!,
      contentType: 'application/pdf',
    });
  });

  test('Privacy Statement link points at the onboarding privacy statement', async ({
    joinPage,
  }) => {
    await expect(joinPage.privacyStatementLink).toHaveAttribute('href', PRIVACY_STATEMENT_HREF);
    await expect(joinPage.privacyStatementLink).toHaveAttribute('target', '_blank');
  });

  test('Declaration link points at the declarations page', async ({ joinPage }) => {
    await expect(joinPage.declarationLink).toHaveAttribute('href', DECLARATION_HREF);
    await expect(joinPage.declarationLink).toHaveAttribute('target', '_blank');
  });

  test('Privacy Statement opens the correct page in a new tab', async ({ joinPage }) => {
    const popup = await joinPage.openInNewTab(joinPage.privacyStatementLink);

    expect(popup.url()).toBe(PRIVACY_STATEMENT_HREF);
    await expect(popup.getByRole('heading', { name: /privacy/i }).first()).toBeVisible();
    await popup.close();
  });

  test('Declaration opens the correct page in a new tab', async ({ joinPage }) => {
    const popup = await joinPage.openInNewTab(joinPage.declarationLink);

    expect(popup.url()).toBe(DECLARATION_FINAL_URL);
    await expect(popup.getByRole('heading', { name: /declaration/i }).first()).toBeVisible();
    await popup.close();
  });

  test('consent document pages respond successfully', async ({ joinPage }) => {
    for (const url of [PRIVACY_STATEMENT_HREF, DECLARATION_HREF]) {
      const response = await joinPage.page.request.get(url);
      expect(response.status(), `${url} should be reachable`).toBe(200);
    }
  });
});
