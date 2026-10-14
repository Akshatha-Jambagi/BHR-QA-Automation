# BrightHR QA Automation

Browser-based end-to-end tests for the BrightHR sandbox, implemented with Playwright, TypeScript, and Cucumber. The test signs in, creates employee records from an Excel workbook (including optional form fields), then checks that the employees appear in the directory. GitHub Actions runs the scenario in Chromium.

## Prerequisites

- Node.js 22 or later and npm
- Access to a BrightHR sandbox account with permission to add employees
- A sandbox URL and account credentials

Complete account registration through the BrightHR sandbox if you do not already have a test account. Do not put account credentials in source control.

## Install and configure

```bash
npm ci
npx playwright install chromium
```

Copy `.env.example` to `.env` and replace the credential placeholders with your sandbox account details:

```dotenv
BASE_URL=https://sandbox-app.brighthr.com
BRIGHTHR_EMAIL=your-test-account@example.com
BRIGHTHR_PASSWORD=your-test-account-password
```

The `.env` file is ignored by Git. Keep credentials in your local `.env` or in your CI provider's secret store; never commit them. Cucumber loads `.env` automatically. The supported settings are:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | — | BrightHR sandbox URL |
| `BRIGHTHR_EMAIL` | — | Sandbox login email |
| `BRIGHTHR_PASSWORD` | — | Sandbox login password |
| `BROWSER` | `chromium` | Playwright browser: `chromium`, `firefox`, or `webkit` (`chrome` aliases Chromium) |
| `HEADLESS` | `true` | Set to `false` to show the browser |
| `EMPLOYEE_DATA_FILE` | `data/employees.xlsx` | Workbook containing employee test data |
| `SEND_REGISTRATION_EMAIL` | `false` | Set to `true` only if employee registration emails are intended |
| `TIMEOUT_MS` | `120000` | Cucumber step and hook timeout in milliseconds |
| `ACTION_TIMEOUT_MS` | `15000` | Playwright locator-action timeout in milliseconds |
| `NAVIGATION_TIMEOUT_MS` | `30000` | Playwright navigation timeout in milliseconds |

For Firefox or WebKit, install the corresponding browser with `npx playwright install firefox` or `npx playwright install webkit`.

## Run tests

```bash
npm test                 # Run the Cucumber scenario in Chromium
npm run test:headed      # Run with a visible browser
npm run test:chrome      # Alias for Chromium
npm run test:firefox     # Run in Firefox
npm run test:webkit      # Run in WebKit
npm run typecheck        # TypeScript validation
```

The scenario in `features/employees.feature` adds every employee row in the configured workbook and verifies each employee's full name in the directory. Use unique email addresses for each run because the application may reject duplicate employees. The automated flow leaves registration emails disabled by default.

## Employee workbook

The first worksheet in `data/employees.xlsx` must have these six columns, in this order:

| First name | Last name | Email address | Phone number | Start date | Job title |
| --- | --- | --- | --- | --- | --- |

Provide at least two complete employee rows. All six fields are filled, including the optional phone number, start date, and job title. Dates must be accepted by the application date input; the sample workbook uses `YYYY-MM-DD`. Email values may be plain text or hyperlinks (the displayed text is used).

The test creates employees in the sandbox and does not delete them. Use a dedicated test tenant and test records; do not use real employee data.

## Continuous integration

The workflow at `.github/workflows/ci.yml` runs TypeScript and Cucumber dry-run checks on pull requests and main pushes. Main pushes and manual dispatches also run the live Chromium scenario. Pull requests do not receive login secrets or create employees. Add these repository Actions secrets:

- `BRIGHTHR_BASE_URL`
- `BRIGHTHR_EMAIL`
- `BRIGHTHR_PASSWORD`

CI uses Chromium in headless mode, type-checks before running the test, and installs the browser dependencies. It adds the workflow run ID to employee names and email local parts to reduce collisions between runs. Generated HTML reports and Playwright traces are uploaded as a workflow artifact retained for 14 days. Runs create sandbox employees without deleting them.

## Reports and traces

Each run writes:

- `reports/cucumber-report.html` — Cucumber scenario results
- `reports/playwright-report.html` — recorded UI actions, sanitized network URLs and response statuses, and screenshots
- `reports/traces/` — replayable Playwright trace ZIPs

Open a trace with:

```bash
npx playwright show-trace reports/traces/<trace-file>.zip
```

Reports and traces can include screenshots and test data. Treat them as sensitive and do not publish them publicly.

## Project structure

- `features/employees.feature` — business-readable scenario.
- `features/step-definitions/employee-steps.ts` — login, workbook loading, employee creation, and directory assertions.
- `features/support/hooks.ts` — browser lifecycle, timeouts, screenshots, traces, and report generation.
- `features/support/world.ts` — per-scenario browser and employee state.
- `features/support/reporting.ts` — HTML diagnostics report and screenshots.
- `src/pages/BasePage.ts` — shared base class for page objects.
- `src/pages/EmployeesPage.ts` — employee directory and add-employee page object.
- `src/pages/LoginPage.ts` — BrightHR login page object.
- `src/data/excel-employee-data-source.ts` — workbook reader and validation.
- `src/models/employee-data.ts` — shared employee data types.
- `cucumber.js` — Cucumber feature, TypeScript, hooks, and report configuration.
- `.github/workflows/ci.yml` — GitHub Actions test workflow.

The page objects encapsulate browser interactions, while the `EmployeeDataSource` interface separates test steps from their data source. The current scenario uses Excel; a different data source can be added without changing the page objects.

### Activate and demonstrate CI

1. Upload this folder's contents as the repository root, including `.github`, `package-lock.json` and `data/employees.xlsx`. Keep `.env`, `node_modules` and generated reports out of Git.
2. Open **Settings > Secrets and variables > Actions > New repository secret** and add the three secrets listed above using your sandbox account.
3. Push to `main`, or select **Actions > BrightHR UI tests > Run workflow** on `main`. If your default branch is named differently, update the push branch filter in `ci.yml`.
4. Confirm both `checks` and `cucumber` pass. Download and extract the workflow artifact, then open `cucumber-report.html` or `playwright-report.html`. Keep the `traces` folder beside the HTML files.

The live job checks secrets before installation, installs Chromium and Linux dependencies, and executes the same `npm test` command used locally. Reports upload after failures too. Live jobs share a concurrency group to prevent simultaneous writes to the sandbox; GitHub can replace an older pending job when several runs queue. Tests are not automatically retried because employee creation has side effects.

For the interview, explain the flow: checkout → Node 22 → locked dependencies → static validation → browser installation → Cucumber scenario → downloadable reports. The HTML reports are produced by your existing Cucumber and custom Playwright reporting code; this framework does not use the native Playwright test runner.
