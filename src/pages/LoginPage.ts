import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { recordAction } from '../../features/support/reporting';

/** Page object for signing in to BrightHR. */
export class LoginPage extends BasePage {
  // Locators declared outside the methods.
  private readonly emailAddressTextbox = this.page.getByRole('textbox', {
    name: 'Email address',
  });

  private readonly passwordTextbox = this.page.getByRole('textbox', {
    name: 'Password visibility',
  });

  private readonly loginButton = this.page.getByTestId('login-button');

  private readonly employeesSidebarLink = this.page
    .getByTestId('sideBar')
    .getByRole('link', { name: 'Employees' });

  /** Creates the login page object. */
  constructor(page: Page) {
    super(page);
  }

  /** Opens the configured BrightHR login page. */
  async open(baseUrl: string): Promise<void> {
    recordAction(this.page, 'Navigate to the BrightHR login page');
    await this.page.goto(baseUrl);
  }

  /** Signs in with credentials supplied securely through environment variables. */
  async signIn(email: string, password: string): Promise<void> {
    recordAction(this.page, 'Fill the email address field');
    await this.emailAddressTextbox.fill(email);

    recordAction(this.page, 'Fill the password field');
    await this.passwordTextbox.fill(password);

    recordAction(this.page, 'Submit the login form');
    await this.loginButton.click();

    recordAction(this.page, 'Wait for the Employees navigation link');
    await this.employeesSidebarLink.waitFor();
  }
}