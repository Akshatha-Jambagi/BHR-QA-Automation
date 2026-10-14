import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ExcelEmployeeDataSource } from '../../src/data/excel-employee-data-source';
import { EmployeesPage } from '../../src/pages/EmployeesPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { captureScreenshot, recordAction } from '../support/reporting';
import { BrightHrWorld } from '../support/world';

/** Logs into BrightHR and confirms the employee navigation is ready. */
Given('I am logged in to BrightHR', async function (this: BrightHrWorld) {
  if (!this.page) throw new Error('Browser page was not initialized by the Before hook.');
  const baseUrl = process.env.BASE_URL;
  const email = process.env.BRIGHTHR_EMAIL;
  const password = process.env.BRIGHTHR_PASSWORD;
  if (!baseUrl || !email || !password) throw new Error('Set BASE_URL, BRIGHTHR_EMAIL and BRIGHTHR_PASSWORD before running tests.');
  const login = new LoginPage(this.page);
  await login.open(baseUrl);
  await login.signIn(email, password);
  await expect(this.page.getByTestId('sideBar')).toBeVisible();
  await captureScreenshot(this.page, 'Logged in');
  if (!this.context) throw new Error('Browser context was not initialized by the Before hook.');
  await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  this.traceStarted = true;
});

/** Loads Excel test data and adds each employee through the page object. */
When('I add all employees from the spreadsheet', async function (this: BrightHrWorld) {
  if (!this.page) throw new Error('Browser page was not initialized by the Before hook.');
  const source = new ExcelEmployeeDataSource(process.env.EMPLOYEE_DATA_FILE ?? 'data/employees.xlsx');
  recordAction(this.page, 'Load employee test data from the configured workbook');
  this.employees = await source.loadEmployees();
  const runId = process.env.CI_TEST_RUN_ID?.replace(/[^a-z0-9]/gi, '');
  if (runId) {
    this.employees = this.employees.map(employee => {
      const [localPart, domain] = employee.emailAddress.split('@');
      if (!localPart || !domain || employee.emailAddress.indexOf('@') !== employee.emailAddress.lastIndexOf('@')) {
        throw new Error(`Invalid employee email address in the workbook: '${employee.emailAddress}'.`);
      }
      return {
        ...employee,
        firstName: `${employee.firstName}${runId}`,
        emailAddress: `${localPart}+${runId}@${domain}`
      };
    });
    recordAction(this.page, `Make employee names and emails unique for CI run ${runId}`);
  }
  const employeesPage = new EmployeesPage(this.page);
  await employeesPage.openDirectory();
  for (const [index, employee] of this.employees.entries()) {
    await employeesPage.addEmployee(employee, index === 0);
  }
  await captureScreenshot(this.page, 'Employee records submitted');
});

/** Verifies that each spreadsheet employee is visible in the directory. */
Then('both employees should be visible in the employee directory', async function (this: BrightHrWorld) {
  if (!this.page) throw new Error('Browser page was not initialized by the Before hook.');
  const employeesPage = new EmployeesPage(this.page);
  await employeesPage.closeEmployeeModal();
  await employeesPage.openDirectory();
  for (const employee of this.employees) await employeesPage.expectEmployeeVisible(employee);
  await captureScreenshot(this.page, 'Employee directory verification');
});
