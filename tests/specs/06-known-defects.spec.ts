import { expect, test } from '../fixtures/join-form.fixture';
import { validApplicant } from '../data/applicants';

// Note these test are expected to fail given the current sign up form
test.describe('Step 1 • defects (expected to fail) @defect', () => {
  test('rejects an implausibly short mobile number', async ({ joinPage }) => {
    test.info().annotations.push({
      type: 'suspected defect',
      description:
        'A 2-digit mobile number ("12") passes validation and advances the applicant. ' +
        'Assumed rule: a NZ mobile number must be a plausible length/format.',
    });

    await joinPage.completeStepOne({ ...validApplicant, mobileNumber: '12' });
    await joinPage.submitStepOne();

    await expect(
      joinPage.errorMessages,
      'expected a validation error for a 2-digit mobile number',
    ).not.toHaveCount(0);
    await joinPage.expectStillOnPersonalDetailsStep();
  });

  test('announces validation errors to assistive technology', async ({ joinPage }) => {
    test.info().annotations.push({
      type: 'accessibility defect',
      description:
        'Error messages carry no role="alert"/aria-live, and invalid inputs get no ' +
        'aria-invalid or aria-describedby, the failure is conveyed by a red border ' +
        'and colour-coded text alone. A screen reader user gets no feedback on why ' +
        'Continue did nothing. WCAG 2.1: 3.3.1 Error Identification, 4.1.3 Status ' +
        'Messages.',
    });

    await joinPage.continueExpectingValidationErrors();
    await expect(joinPage.firstName).toHaveAttribute('aria-invalid', 'true');
    await expect(joinPage.firstName).toHaveAttribute('aria-describedby', /.+/);

    const announced = await joinPage.errorMessages
      .first()
      .evaluate((el) => el.getAttribute('role') ?? el.getAttribute('aria-live'));
    expect(announced, 'error messages should be an alert/live region').toBeTruthy();
  });

  test('opening the Product Disclosure Statement ticks the consent box', async ({
    joinPage,
  }) => {
    test.info().annotations.push({
      type: 'suspected defect',
      description:
        'Clicking "Product Disclosure Statement" to read it ALSO ticks "I have ' +
        'downloaded and read the Product Disclosure Statement". Because the anchor ' +
        'has no href it is not an interactive element, so the click falls through ' +
        'to the surrounding <label> and toggles the checkbox. The applicant is ' +
        'recorded as having read a document at the moment they open it.',
    });

    await expect(joinPage.pdsCheckbox).not.toBeChecked();

    await joinPage.downloadProductDisclosureStatement();
    await expect(joinPage.pdsCheckbox).not.toBeChecked();
  });
});
