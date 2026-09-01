import {
  expect,
  type Download,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";
import type { Applicant } from "../data/applicants";

export class JoinKiwiSaverPage {
  static readonly PATH = "/kiwisaver/join/";
  static readonly EMAIL_VERIFICATION_API =
    /api\.addressfinder\.io\/api\/email\/v1\/verification/;
  private static readonly APP_PAYLOAD = /\/_nuxt\/builds\/meta\/.*\.json/;

  readonly page: Page;

  lastEmailVerification: Response | null = null;

  // --- Step 1 fields -------------------------------------------------------
  readonly dateOfBirth: Locator;
  readonly firstName: Locator;
  readonly middleName: Locator;
  readonly lastName: Locator;
  readonly preferredName: Locator;
  readonly email: Locator;
  readonly countryCode: Locator;
  readonly mobileNumber: Locator;

  // --- Consent -------------------------------------------------------------
  readonly pdsCheckbox: Locator;
  readonly privacyCheckbox: Locator;
  readonly smsConsentCheckbox: Locator;
  readonly pdsLink: Locator;
  readonly privacyStatementLink: Locator;
  readonly declarationLink: Locator;

  // --- Actions / regions ---------------------------------------------------
  readonly continueButton: Locator;
  readonly stepOneHeading: Locator;
  readonly stepTwoHeading: Locator;
  readonly addressAutocomplete: Locator;

  readonly datePickerMenu: Locator;

  constructor(page: Page) {
    this.page = page;

    this.dateOfBirth = page.locator('input[name="birthdate"]');
    this.firstName = page.locator("#firstName");
    this.middleName = page.locator("#middleName");
    this.lastName = page.locator("#lastName");
    this.preferredName = page.locator("#preferredName");
    this.email = page.locator("#userEmail");
    this.countryCode = page.getByTestId("CountryCode");
    this.mobileNumber = page.getByTestId("MobileNumber");
    this.pdsCheckbox = page.locator('input[name="agreeStatus[0]"]');
    this.privacyCheckbox = page.locator('input[name="agreeStatus[1]"]');
    this.smsConsentCheckbox = page.locator('input[name="smsConsent"]');

    const consentBlock = this.consentBlockFor("agreeStatus[0]");

    this.pdsLink = consentBlock
      .locator("a")
      .filter({ hasText: "Product Disclosure Statement" });
    this.privacyStatementLink = this.consentBlockFor(
      "agreeStatus[1]",
    ).getByRole("link", {
      name: "Privacy Statement",
    });
    this.declarationLink = this.consentBlockFor("agreeStatus[1]").getByRole(
      "link",
      {
        name: "Declaration",
      },
    );

    this.continueButton = page.getByRole("button", {
      name: "Continue",
      exact: true,
    });
    this.stepOneHeading = page.getByRole("heading", {
      name: "Tell us a bit about you",
    });
    this.stepTwoHeading = page.getByRole("heading", {
      name: "Enter your residential address",
    });
    this.addressAutocomplete = page.getByTestId("autocomplete-residential");
    this.datePickerMenu = page.locator(".dp__menu");
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================
  async goto(): Promise<void> {
    await Promise.all([
      this.page
        .waitForResponse(
          (r) =>
            JoinKiwiSaverPage.APP_PAYLOAD.test(r.url()) && r.status() === 200,
          { timeout: 30_000 },
        )
        .catch(() => null),
      this.page.goto(JoinKiwiSaverPage.PATH, { waitUntil: "domcontentloaded" }),
    ]);

    await this.assertServedTheForm();

    await expect(this.firstName).toBeEditable({ timeout: 30_000 });
    await expect(this.dateOfBirth).toHaveAttribute(
      "data-maska",
      /#d\/#d\/####/,
      {
        timeout: 30_000,
      },
    );
  }

  private async assertServedTheForm(): Promise<void> {
    const blockedHeading = this.page
      .getByRole("heading", { name: /403 ERROR|could not be satisfied/i })
      .first();

    await expect(this.stepOneHeading.or(blockedHeading).first()).toBeVisible({
      timeout: 30_000,
    });

    if (await blockedHeading.isVisible()) {
      throw new Error(
        "Blocked by CloudFront (403) rather than served the join form. The suite is " +
          "being rate-limited: lower `workers` in playwright.config.ts, or wait a few " +
          'minutes and re-run. See NOTES.md "Running against production".',
      );
    }

    await expect(this.stepOneHeading).toBeVisible();
  }

  // ==========================================================================
  // Field interaction
  // ==========================================================================

  async enterDateOfBirth(value: string): Promise<string> {
    await this.dateOfBirth.click();

    await this.dateOfBirth.fill(value);

    if (value) {
      await this.dateOfBirth.press("Enter");
    }

    await this.closeDatePicker();
    return this.dateOfBirth.inputValue();
  }

  async setDateOfBirth(value: string): Promise<void> {
    await this.enterDateOfBirth(value);
    await expect(this.dateOfBirth).toHaveValue(value);
  }

  private async closeDatePicker(): Promise<void> {
    const open = await this.datePickerMenu.isVisible().catch(() => false);
    if (!open) return;

    await this.firstName.click();
    await expect(this.datePickerMenu).toBeHidden();
  }

  async fillEmailAndAwaitVerification(email: string): Promise<Response | null> {
    const looksWellFormed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!looksWellFormed) {
      await this.email.fill(email);
      await this.email.blur();
      this.lastEmailVerification = null;
      return null;
    }

    const [response] = await Promise.all([
      this.page
        .waitForResponse(
          (r) => JoinKiwiSaverPage.EMAIL_VERIFICATION_API.test(r.url()),
          { timeout: 30_000 },
        )
        .catch(() => null),
      (async () => {
        await this.email.fill(email);
        await this.email.blur();
      })(),
    ]);

    this.lastEmailVerification = response;
    return response;
  }

  async fillPersonalDetails(applicant: Applicant): Promise<void> {
    await this.setDateOfBirth(applicant.dateOfBirth);
    await this.firstName.fill(applicant.firstName);
    await this.middleName.fill(applicant.middleName ?? "");
    await this.lastName.fill(applicant.lastName);
    await this.preferredName.fill(applicant.preferredName ?? "");
    await this.fillEmailAndAwaitVerification(applicant.email);
    await this.mobileNumber.fill(applicant.mobileNumber);
  }

  async acceptRequiredConsents(): Promise<void> {
    await this.setConsent("pds", true);
    await this.setConsent("privacy", true);
  }

  async setConsent(
    checkbox: "pds" | "privacy" | "sms",
    checked: boolean,
  ): Promise<void> {
    const input = this.consentInput(checkbox);
    if ((await input.isChecked()) === checked) return;

    await input.dispatchEvent("click");

    await expect(input).toBeChecked({ checked });
  }

  private consentInput(checkbox: "pds" | "privacy" | "sms"): Locator {
    if (checkbox === "pds") return this.pdsCheckbox;
    if (checkbox === "privacy") return this.privacyCheckbox;
    return this.smsConsentCheckbox;
  }

  async completeStepOne(applicant: Applicant): Promise<void> {
    await this.fillPersonalDetails(applicant);
    await this.acceptRequiredConsents();
  }

  // ==========================================================================
  // Submission
  // ==========================================================================

  async clickContinue(): Promise<void> {
    await this.continueButton.scrollIntoViewIfNeeded();
    await this.continueButton.click();
  }

  async submitStepOne(): Promise<void> {
    await this.clickContinue();
    await expect(
      this.stepTwoHeading.or(this.errorMessages.first()).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async continueExpectingValidationErrors(): Promise<void> {
    await this.clickContinue();
    await expect(this.errorMessages.first()).toBeVisible({ timeout: 15_000 });
    await expect(this.stepOneHeading).toBeVisible();
  }

  async continueExpectingNoVerificationCall(): Promise<void> {
    let verificationCalled = false;
    const spy = (r: Response) => {
      if (JoinKiwiSaverPage.EMAIL_VERIFICATION_API.test(r.url()))
        verificationCalled = true;
    };
    this.page.on("response", spy);

    await this.continueExpectingValidationErrors();

    this.page.off("response", spy);
    expect(
      this.lastEmailVerification,
      "a malformed address should never reach the verification API",
    ).toBeNull();
    expect(
      verificationCalled,
      "submitting a malformed address should not call the verification API",
    ).toBe(false);
  }

  // ==========================================================================
  // Validation messages
  // ==========================================================================

  get errorMessages(): Locator {
    return this.page.locator(
      '[data-testid="message-box"][class*="text-system-warning"]:visible',
    );
  }

  error(text: string): Locator {
    return this.errorMessages.filter({ hasText: text });
  }

  async visibleErrorTexts(): Promise<string[]> {
    await this.page.waitForTimeout(0);
    return (await this.errorMessages.allInnerTexts()).map((t) => t.trim());
  }

  consentBlockFor(checkboxName: string): Locator {
    return this.page.locator(
      `div:has(> label > input[name="${checkboxName}"])`,
    );
  }

  consentError(checkbox: "pds" | "privacy"): Locator {
    const name = checkbox === "pds" ? "agreeStatus[0]" : "agreeStatus[1]";
    return this.consentBlockFor(name).getByTestId("message-box");
  }

  get invalidFields(): Locator {
    return this.page.locator('input[class*="border-system-warning"]');
  }

  // ==========================================================================
  // Documents
  // ==========================================================================

  async downloadProductDisclosureStatement(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent("download", { timeout: 30_000 }),
      this.pdsLink.click({ force: true }),
    ]);
    return download;
  }

  async openInNewTab(link: Locator): Promise<Page> {
    const [popup] = await Promise.all([
      this.page.context().waitForEvent("page", { timeout: 30_000 }),
      link.click({ force: true }),
    ]);
    await popup.waitForLoadState("domcontentloaded");
    return popup;
  }

  // ==========================================================================
  // Step state
  // ==========================================================================
  // Assert I'm on the correct next page
  async expectAdvancedToAddressStep(): Promise<void> {
    await expect(this.stepTwoHeading).toBeVisible({ timeout: 30_000 });
    await expect(this.addressAutocomplete).toBeVisible();
    await expect(this.firstName).toBeHidden();
  }

  async expectStillOnPersonalDetailsStep(): Promise<void> {
    await expect(this.stepOneHeading).toBeVisible();
    await expect(this.addressAutocomplete).toBeHidden();
  }
}
