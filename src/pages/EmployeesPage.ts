import { expect, type Locator, type Page } from '@playwright/test';
import { EmployeeData } from '../models/employee-data';
import { BasePage } from './BasePage';
import { recordAction } from '../../features/support/reporting';

/** Page object for the employee directory and add-employee form. */
export class EmployeesPage extends BasePage {
  // Locators declared outside the methods.
  private readonly employeesSidebarLink = this.page
    .getByTestId('sideBar')
    .getByRole('link', { name: 'Employees' });

  private readonly addEmployeeButton = this.page.getByRole('button', {
    name: 'Add employee',
  });

  private readonly addAnotherEmployeeButton = this.page.getByRole('button', {
    name: 'Add another employee',
  });

  private readonly registrationEmailCheckbox = this.page.getByRole('checkbox', {
    name: 'Send registration email',
  });

  private readonly registrationEmailLabel = this.page.locator(
    'label[for="registrationEmail"]',
  );

  private readonly firstNameTextbox = this.page.getByRole('textbox', {
    name: 'First name',
  });

  private readonly lastNameTextbox = this.page.getByRole('textbox', {
    name: 'Last name',
  });

  private readonly emailAddressTextbox = this.page.getByRole('textbox', {
    name: 'Email address',
  });

  private readonly phoneNumberTextbox = this.page.getByRole('textbox', {
    name: 'Phone number (optional)',
  });

  private readonly startDateTextbox = this.page.getByRole('textbox', {
    name: 'Start date (optional)',
  });

  private readonly jobTitleTextbox = this.page.getByRole('textbox', {
    name: 'Job title (optional)',
  });

  private readonly saveNewEmployeeButton = this.page.getByRole('button', {
    name: 'Save new employee',
  });

  private readonly closeModalButton = this.page.getByRole('button', {
    name: 'Close modal',
  });

  private readonly employeeName = (employee: EmployeeData): Locator =>
    this.page
      .getByRole('heading', {
        name: `${employee.firstName} ${employee.lastName}`,
        exact: true,
      })
      .first();

  /** Creates the employee page object. */
  constructor(page: Page) {
    super(page);
  }

  /** Opens the employee section from the BrightHR sidebar. */
  async openDirectory(): Promise<void> {
    recordAction(this.page, 'Open the Employees directory');
    await this.employeesSidebarLink.click();
  }

  /** Saves one employee; the next iteration uses the add-another control. */
  async addEmployee(
    employee: EmployeeData,
    firstEmployee: boolean,
  ): Promise<void> {
    if (firstEmployee) {
      recordAction(this.page, 'Start adding an employee');
      await this.addEmployeeButton.click();
    } else {
      recordAction(this.page, 'Start adding another employee');
      await this.addAnotherEmployeeButton.click();
    }

    const sendRegistrationEmail =
      process.env.SEND_REGISTRATION_EMAIL?.toLowerCase() === 'true';

    recordAction(
      this.page,
      `Set send registration email to ${sendRegistrationEmail}`,
    );

    if (
      (await this.registrationEmailCheckbox.isChecked()) !==
      sendRegistrationEmail
    ) {
      await this.registrationEmailLabel.click();
    }

    await expect(this.registrationEmailCheckbox).toBeChecked({
      checked: sendRegistrationEmail,
    });

    recordAction(this.page, 'Fill employee first name');
    await this.firstNameTextbox.fill(employee.firstName);

    recordAction(this.page, 'Fill employee last name');
    await this.lastNameTextbox.fill(employee.lastName);

    recordAction(this.page, 'Fill employee email address');
    await this.emailAddressTextbox.fill(employee.emailAddress);

    recordAction(this.page, 'Fill employee phone number');
    await this.phoneNumberTextbox.fill(employee.phoneNumber);

    recordAction(this.page, 'Fill employee start date');
    await this.startDateTextbox.fill(employee.startDate);

    recordAction(this.page, 'Fill employee job title');
    await this.jobTitleTextbox.fill(employee.jobTitle);

    recordAction(this.page, 'Save the new employee');
    await this.saveNewEmployeeButton.click();
  }

  /** Closes the add-employee modal before returning to directory checks. */
  async closeEmployeeModal(): Promise<void> {
    recordAction(this.page, 'Close the add-employee modal');
    await this.closeModalButton.click();
  }

  /** Checks that the directory displays an employee's full name. */
  async expectEmployeeVisible(employee: EmployeeData): Promise<void> {
    recordAction(
      this.page,
      'Verify an employee name is visible in the directory',
    );
    await expect(this.employeeName(employee)).toBeVisible();
  }
}