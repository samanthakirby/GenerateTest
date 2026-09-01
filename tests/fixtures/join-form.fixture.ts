import { test as base, expect } from '@playwright/test';
import { JoinKiwiSaverPage } from '../pages/join-kiwisaver.page';
import { blockThirdPartyNoise, cacheStaticAssets } from '../utils/asset-cache';

export interface EmailVerificationResult {
  verified_email: string | null;
  email_account: string;
  email_domain: string;
  email_provider_domain: string | null;
  is_verified: boolean;
  is_disposable: boolean;
  is_role: boolean;
  is_public: boolean;
  is_catch_all: boolean;
  not_verified_reason: string | null;
  not_verified_code: string | null;
  deliverability: string;
  success: boolean;
}

export const deliverableEmail: EmailVerificationResult = {
  verified_email: 'qa.automation.playwright@gmail.com',
  email_account: 'qa.automation.playwright',
  email_domain: 'gmail.com',
  email_provider_domain: null,
  is_verified: true,
  is_disposable: false,
  is_role: false,
  is_public: false,
  is_catch_all: true,
  not_verified_reason: null,
  not_verified_code: null,
  deliverability: 'LIKELY_DELIVERABLE',
  success: true,
};

export const undeliverableEmail: EmailVerificationResult = {
  verified_email: null,
  email_account: 'qa.automation.playwright',
  email_domain: 'gmail.com',
  email_provider_domain: null,
  is_verified: false,
  is_disposable: false,
  is_role: false,
  is_public: true,
  is_catch_all: false,
  not_verified_reason: 'The email account does not exist',
  not_verified_code: 'EMAIL_ACCOUNT_MISSING',
  deliverability: 'UNDELIVERABLE',
  success: true,
};

interface JoinFormFixtures {
  joinPage: JoinKiwiSaverPage;
  stubEmailVerification: (result: EmailVerificationResult) => Promise<void>;
}

export const test = base.extend<JoinFormFixtures>({
  stubEmailVerification: async ({ context }, use) => {
    const useRealApi = process.env.REAL_EMAIL_VERIFICATION === '1';

    await use(async (result: EmailVerificationResult) => {
      if (useRealApi) return;
      await context.route(JoinKiwiSaverPage.EMAIL_VERIFICATION_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(result),
        }),
      );
    });
  },

  joinPage: async ({ page, context, stubEmailVerification }, use) => {
    await blockThirdPartyNoise(context);
    await cacheStaticAssets(context);
    const spacing = Number(process.env.REQUEST_SPACING_MS ?? 0);
    if (spacing > 0) await new Promise((resolve) => setTimeout(resolve, spacing));

    await stubEmailVerification(deliverableEmail);

    const joinPage = new JoinKiwiSaverPage(page);
    await joinPage.goto();
    await use(joinPage);
  },
});

export { expect };
