import { expect, test } from '../fixtures/join-form.fixture';
import { validApplicant } from '../data/applicants';

/**
 * The two mandatory consent checkboxes are the form's compliance gate, so they
 * get their own coverage: each must block submission independently, and neither
 * may be pre-ticked for the applicant.
 */

const CONSENT_ERROR = 'Please confirm that you have read the above';

test.describe('Step 1 • mandatory consent checkboxes', () => {
  test('neither mandatory consent is pre-ticked on load', async ({ joinPage }) => {
    // Pre-ticked consent would not be freely given — it must be an explicit act.
    await expect(joinPage.pdsCheckbox).not.toBeChecked();
    await expect(joinPage.privacyCheckbox).not.toBeChecked();
    await expect(joinPage.smsConsentCheckbox).not.toBeChecked();
  });

  test('both consents can be ticked and unticked', async ({ joinPage }) => {
    await joinPage.setConsent('pds', true);
    await joinPage.setConsent('privacy', true);
    await expect(joinPage.pdsCheckbox).toBeChecked();
    await expect(joinPage.privacyCheckbox).toBeChecked();

    await joinPage.setConsent('pds', false);
    await joinPage.setConsent('privacy', false);
    await expect(joinPage.pdsCheckbox).not.toBeChecked();
    await expect(joinPage.privacyCheckbox).not.toBeChecked();
  });

  test('unticked PDS consent alone blocks submission', async ({ joinPage }) => {
    await joinPage.fillPersonalDetails(validApplicant);
    await joinPage.setConsent('privacy', true);

    await joinPage.continueExpectingValidationErrors();

    await expect(joinPage.consentError('pds')).toHaveText(CONSENT_ERROR);
    await expect(joinPage.consentBlockFor('agreeStatus[0]')).toHaveAttribute('has-error', 'true');
    await expect(joinPage.consentError('privacy')).toBeHidden();
    await expect(joinPage.errorMessages).toHaveCount(1);
    await joinPage.expectStillOnPersonalDetailsStep();
  });

  test('unticked privacy/declaration consent alone blocks submission', async ({ joinPage }) => {
    await joinPage.fillPersonalDetails(validApplicant);
    await joinPage.setConsent('pds', true);

    await joinPage.continueExpectingValidationErrors();

    await expect(joinPage.consentError('privacy')).toHaveText(CONSENT_ERROR);
    await expect(joinPage.consentBlockFor('agreeStatus[1]')).toHaveAttribute('has-error', 'true');
    await expect(joinPage.consentError('pds')).toBeHidden();
    await expect(joinPage.errorMessages).toHaveCount(1);
    await joinPage.expectStillOnPersonalDetailsStep();
  });

  test('both consents unticked raises both errors', async ({ joinPage }) => {
    await joinPage.fillPersonalDetails(validApplicant);

    await joinPage.continueExpectingValidationErrors();

    await expect(joinPage.consentError('pds')).toHaveText(CONSENT_ERROR);
    await expect(joinPage.consentError('privacy')).toHaveText(CONSENT_ERROR);
    await expect(joinPage.errorMessages).toHaveCount(2);
  });

  test('SMS consent is optional and does not block submission', async ({ joinPage }) => {
    await joinPage.completeStepOne(validApplicant);
    await expect(joinPage.smsConsentCheckbox).not.toBeChecked();

    await joinPage.submitStepOne();

    await joinPage.expectAdvancedToAddressStep();
  });

  test('ticking both consents clears their errors', async ({ joinPage }) => {
    await joinPage.fillPersonalDetails(validApplicant);
    await joinPage.continueExpectingValidationErrors();
    await expect(joinPage.errorMessages).toHaveCount(2);

    await joinPage.acceptRequiredConsents();

    await expect(joinPage.errorMessages).toHaveCount(0);
    await expect(joinPage.consentError('pds')).toBeHidden();
    await expect(joinPage.consentError('privacy')).toBeHidden();
  });
});
