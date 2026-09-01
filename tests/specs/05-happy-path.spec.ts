import { expect, test } from '../fixtures/join-form.fixture';
import { validApplicant } from '../data/applicants';

test.describe('Step 1 • happy path', () => {
  test('valid details advance the applicant to the residential address step', async ({ joinPage }) => {
    await joinPage.completeStepOne(validApplicant);

    await expect(joinPage.errorMessages).toHaveCount(0);
    await expect(joinPage.invalidFields).toHaveCount(0);

    expect(joinPage.lastEmailVerification?.status()).toBe(200);

    await joinPage.submitStepOne();
    await joinPage.expectAdvancedToAddressStep();
    await expect(joinPage.errorMessages).toHaveCount(0);
  });

  test('entered values survive the submit', async ({ joinPage }) => {
    await joinPage.completeStepOne(validApplicant);

    await expect(joinPage.dateOfBirth).toHaveValue(validApplicant.dateOfBirth);
    await expect(joinPage.firstName).toHaveValue(validApplicant.firstName);
    await expect(joinPage.lastName).toHaveValue(validApplicant.lastName);
    await expect(joinPage.email).toHaveValue(validApplicant.email);
    await expect(joinPage.mobileNumber).toHaveValue(validApplicant.mobileNumber);
    await expect(joinPage.countryCode).toHaveValue('64');

    await joinPage.submitStepOne();
    await joinPage.expectAdvancedToAddressStep();
  });

  test('optional fields are accepted when supplied', async ({ joinPage }) => {
    await joinPage.completeStepOne(validApplicant);

    await expect(joinPage.middleName).toHaveValue(validApplicant.middleName!);
    await expect(joinPage.preferredName).toHaveValue(validApplicant.preferredName!);

    await joinPage.submitStepOne();
    await joinPage.expectAdvancedToAddressStep();
  });
});
