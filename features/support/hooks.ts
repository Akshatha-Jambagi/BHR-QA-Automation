import { After, AfterAll, Before, ITestCaseHookParameter, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, firefox, webkit, BrowserType } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  addScenarioReport,
  attachPageDiagnostics,
  captureScreenshot,
  createScenarioDiagnostics,
  writePlaywrightReport
} from './reporting';
import { BrightHrWorld } from './world';

function getTimeout(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number; received '${process.env[name]}'.`);
  }
  return value;
}

setDefaultTimeout(getTimeout('TIMEOUT_MS', 120000));

/** Creates an isolated browser session before each scenario. */
Before(async function (this: BrightHrWorld, { pickle }: ITestCaseHookParameter) {
  mkdirSync('reports', { recursive: true });
  this.diagnostics = createScenarioDiagnostics(pickle.name);
  const browserName = (process.env.BROWSER ?? 'chromium').toLowerCase();
  const browserTypes: Record<string, BrowserType> = { chromium, chrome: chromium, firefox, webkit };
  const browserType = browserTypes[browserName];
  if (!browserType) throw new Error(`Unsupported BROWSER '${browserName}'. Use chromium, firefox or webkit.`);

  try {
    this.browser = await browserType.launch({ headless: process.env.HEADLESS !== 'false' });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(getTimeout('ACTION_TIMEOUT_MS', 15000));
    this.page.setDefaultNavigationTimeout(getTimeout('NAVIGATION_TIMEOUT_MS', 30000));
    attachPageDiagnostics(this.page, this.diagnostics);
  } catch (error) {
    throw new Error(`Could not start ${browserName}. Install its Playwright browser and retry. ${String(error)}`);
  }
});

/** Captures scenario artifacts and always closes its browser. */
After(async function (this: BrightHrWorld, scenario) {
  try {
    if (this.diagnostics) {
      this.diagnostics.status = scenario.result?.status === Status.PASSED ? 'PASSED' : 'FAILED';
      this.diagnostics.durationMs = Date.now() - this.diagnostics.startedAt;
    }
    if (this.page && this.diagnostics) {
      await captureScreenshot(this.page, `Scenario ${this.diagnostics.status.toLowerCase()}`);
    }
    if (scenario.result?.status === Status.FAILED && this.page) {
      const screenshot = await this.page.screenshot({ fullPage: true });
      await this.attach(screenshot, 'image/png');
    }
    if (this.context && this.diagnostics && this.traceStarted) {
      const safeName = this.diagnostics.name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      const traceFile = join('reports', 'traces', `${safeName || 'scenario'}-${this.diagnostics.startedAt}.zip`);
      await mkdir('reports/traces', { recursive: true });
      await this.context.tracing.stop({ path: traceFile });
      this.diagnostics.tracePath = traceFile.replace(/^reports[\\/]/, '').replace(/\\/g, '/');
    }
    if (this.diagnostics) addScenarioReport(this.diagnostics);
  } finally {
    await this.context?.close();
    await this.browser?.close();
  }
});

AfterAll(async function () {
  await writePlaywrightReport();
});
