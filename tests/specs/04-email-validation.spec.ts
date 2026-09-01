import { expect, test, undeliverableEmail } from '../fixtures/join-form.fixture';
import { validApplicant } from '../data/applicants';
import { JoinKiwiSaverPage } from '../pages/join-kiwisaver.page';

test.describe('Step 1 • email validation', () => {
  test('rejects a malformed address without calling the verification API', async ({ joinPage }) => {
    await joinPage.completeStepOne({ ...validApplicant, email: 'not-an-email' });
    await joinPage.continueExpectingNoVerificationCall();
    await expect(joinPage.error('Email must use format lucy@mymail.com')).toBeVisible();
    await joinPage.expectStillOnPersonalDetailsStep();
  });

  test('a well-formed address is sent to the verification API', async ({ joinPage }) => {
    await joinPage.completeStepOne(validApplicant);
    const response = joinPage.lastEmailVerification;
    expect(response, 'expected a mailbox-verification call').not.toBeNull();

    const requestedEmail = new URL(response!.url()).searchParams.get('email');
    expect(requestedEmail).toBe(validApplicant.email);
    expect(response!.status()).toBe(200);

    await joinPage.submitStepOne();
    await joinPage.expectAdvancedToAddressStep();
  });

  test('an undeliverable mailbox is reported to the applicant', async ({
    joinPage,
    stubEmailVerification,
  }) => {
    test.skip(
      process.env.REAL_EMAIL_VERIFICATION === '1',
      'needs the stub to force an undeliverable verdict',
    );
    await stubEmailVerification(undeliverableEmail);

    await joinPage.completeStepOne(validApplicant);

    await expect(joinPage.error('The email account does not exist')).toBeVisible();
    await expect(joinPage.error('gmail.com')).toBeVisible();
  });

  test('a verification outage fails open rather than blocking the applicant', async ({
    joinPage,
    context,
  }) => {
    test.skip(
      process.env.REAL_EMAIL_VERIFICATION === '1',
      'deliberately breaks the verification API',
    );
    await context.route(JoinKiwiSaverPage.EMAIL_VERIFICATION_API, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await joinPage.completeStepOne(validApplicant);
    await expect(joinPage.errorMessages).toHaveCount(0);

    await joinPage.submitStepOne();
    await joinPage.expectAdvancedToAddressStep();
  });
});
