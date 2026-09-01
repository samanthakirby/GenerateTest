import { expect, test } from '../fixtures/join-form.fixture';
import { validApplicant } from '../data/applicants';

test.describe('Step 1 • date of birth rules', () => {
  test('a future date of birth cannot be entered', async ({ joinPage }) => {
    const committed = await joinPage.enterDateOfBirth('01/01/2030');

    expect(committed, 'a future date of birth must not be accepted as typed').not.toBe(
      '01/01/2030',
    );
    if (committed) {
      const [day, month, year] = committed.split('/').map(Number);
      expect(new Date(year, month - 1, day).getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  test('an under-18 date of birth prompts for guardian details', async ({ joinPage }) => {
    await joinPage.setDateOfBirth('01/01/2015');

    await expect(
      joinPage.page.getByText(/since you are under 18, we also need details of your guardian/i),
    ).toBeVisible();
  });

  test('under-18 field hints switch to referring to the minor', async ({ joinPage }) => {
    await joinPage.setDateOfBirth('01/01/2015');

    await expect(joinPage.page.getByText(/first name of the minor/i)).toBeVisible();
  });

  test('an adult date of birth prompts nothing about guardians', async ({ joinPage }) => {
    await joinPage.setDateOfBirth(validApplicant.dateOfBirth);

    await expect(joinPage.page.getByText(/details of your guardian/i)).toBeHidden();
    await expect(joinPage.errorMessages).toHaveCount(0);
  });
});
