import { World, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from '@playwright/test';
import { EmployeeData } from '../../src/models/employee-data';
import { ScenarioDiagnostics } from './reporting';

/** Holds the browser objects and scenario data shared by Cucumber steps. */
export class BrightHrWorld extends World {
  /** Playwright browser instance for the selected browser engine. */
  browser?: Browser;
  /** Isolated browser context for this scenario. */
  context?: BrowserContext;
  /** Active browser page used by page objects. */
  page?: Page;
  /** Employees loaded from the workbook for the current scenario. */
  employees: EmployeeData[] = [];
  /** Browser actions, network events, screenshots, and trace metadata for reporting. */
  diagnostics?: ScenarioDiagnostics;
  /** Whether the Playwright trace was started after authentication completed. */
  traceStarted = false;
}

setWorldConstructor(BrightHrWorld);
