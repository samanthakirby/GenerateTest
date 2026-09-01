import { expect, test } from '../fixtures/join-form.fixture';
import { applicantWithout, emptyApplicant, validApplicant } from '../data/applicants';

const REQUIRED_FIELD_ERRORS = {
  dateOfBirth: 'Date of birth is a required field',
  firstName: 'First Name is a required field',
  lastName: 'Last name is a required field',
  email: 'Email is a required field',
  mobileNumber: 'Please enter your mobile number',
} as const;
const CONSENT_ERROR = 'Please confirm that you have read the above';

test.describe('Step 1 • required field validation', () => {
  test('Continue on an empty form shows every required-field validation message', async ({
    joinPage,
  }) => {
    await joinPage.continueExpectingValidationErrors();

    for (const [field, message] of Object.entries(REQUIRED_FIELD_ERRORS)) {
      await expect(joinPage.error(message), `expected the ${field} error`).toBeVisible();
    }

    await expect(joinPage.consentError('pds')).toHaveText(CONSENT_ERROR);
    await expect(joinPage.consentError('privacy')).toHaveText(CONSENT_ERROR);

    await expect(joinPage.errorMessages).toHaveCount(7);
    await expect(joinPage.invalidFields).toHaveCount(5);

    await joinPage.expectStillOnPersonalDetailsStep();
  });

  test('optional fields are not required to submit', async ({ joinPage }) => {
    await joinPage.continueExpectingValidationErrors();

    const errors = (await joinPage.visibleErrorTexts()).join(' | ');
    expect(errors).not.toMatch(/middle/i);
    expect(errors).not.toMatch(/preferred/i);
    expect(errors).not.toMatch(/title/i);
    expect(errors).not.toMatch(/sms/i);
    await expect(joinPage.smsConsentCheckbox).not.toBeChecked();
  });

  test('each required field is required on its own', async ({ joinPage }) => {
    for (const [field, message] of Object.entries(REQUIRED_FIELD_ERRORS)) {
      await test.step(`${field} alone is missing, expects "${message}"`, async () => {
        await joinPage.completeStepOne(applicantWithout(field as keyof typeof validApplicant));

        await joinPage.continueExpectingValidationErrors();

        await expect(joinPage.error(message)).toBeVisible();
        await expect(joinPage.errorMessages).toHaveCount(1);
        await joinPage.expectStillOnPersonalDetailsStep();

        await joinPage.fillPersonalDetails(validApplicant);
        await expect(joinPage.errorMessages).toHaveCount(0);
      });
    }
  });

  test('all required fields empty at once blocks submission', async ({ joinPage }) => {
    await joinPage.fillPersonalDetails(emptyApplicant);

    await joinPage.continueExpectingValidationErrors();

    await expect(joinPage.errorMessages).toHaveCount(7);
    await joinPage.expectStillOnPersonalDetailsStep();
  });

  test('errors clear once the missing fields are supplied', async ({ joinPage }) => {
    await joinPage.continueExpectingValidationErrors();
    await expect(joinPage.errorMessages).toHaveCount(7);

    await joinPage.completeStepOne(validApplicant);

    await expect(joinPage.errorMessages).toHaveCount(0);
    await expect(joinPage.invalidFields).toHaveCount(0);
  });

  test('a numeric middle name is rejected', async ({ joinPage }) => {
    await joinPage.completeStepOne({ ...validApplicant, middleName: '12' });

    await joinPage.continueExpectingValidationErrors();

    await expect(joinPage.error('Please provide a valid middle name')).toBeVisible();
    await joinPage.expectStillOnPersonalDetailsStep();
  });
});
