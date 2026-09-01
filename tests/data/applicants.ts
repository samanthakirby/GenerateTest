export interface Applicant {
  dateOfBirth: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  email: string;
  mobileNumber: string;
}

export const validApplicant: Applicant = {
  dateOfBirth: '01/01/1990',
  firstName: 'Playwright',
  middleName: 'Automated',
  lastName: 'Testuser',
  preferredName: 'QA Bot',
  email: process.env.TEST_EMAIL ?? 'qa.automation.playwright@gmail.com',
  mobileNumber: '211234567',
};

export function applicantWithout(...fields: (keyof Applicant)[]): Applicant {
  const applicant = { ...validApplicant };
  for (const field of fields) applicant[field] = '' as never;
  return applicant;
}

export const emptyApplicant: Applicant = {
  dateOfBirth: '',
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  email: '',
  mobileNumber: '',
};
