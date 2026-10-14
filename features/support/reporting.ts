import { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface ReportEvent {
  timestamp: string;
  kind: 'action' | 'network';
  label: string;
  details?: string;
}

interface ReportScreenshot {
  label: string;
  dataUrl: string;
}

export interface ScenarioDiagnostics {
  name: string;
  status: string;
  startedAt: number;
  durationMs?: number;
  events: ReportEvent[];
  screenshots: ReportScreenshot[];
  tracePath?: string;
}

const diagnosticsByPage = new WeakMap<Page, ScenarioDiagnostics>();
const scenarios: ScenarioDiagnostics[] = [];

export function createScenarioDiagnostics(name: string): ScenarioDiagnostics {
  return {
    name,
    status: 'RUNNING',
    startedAt: Date.now(),
    events: [],
    screenshots: []
  };
}

export function attachPageDiagnostics(page: Page, diagnostics: ScenarioDiagnostics): void {
  diagnosticsByPage.set(page, diagnostics);

  page.on('request', request => {
    diagnostics.events.push({
      timestamp: new Date().toISOString(),
      kind: 'network',
      label: `→ ${request.method()} ${safeUrl(request.url())}`,
      details: request.resourceType()
    });
  });

  page.on('response', response => {
    diagnostics.events.push({
      timestamp: new Date().toISOString(),
      kind: 'network',
      label: `← ${response.status()} ${response.request().method()} ${safeUrl(response.url())}`
    });
  });

  page.on('requestfailed', request => {
    diagnostics.events.push({
      timestamp: new Date().toISOString(),
      kind: 'network',
      label: `× ${request.method()} ${safeUrl(request.url())}`,
      details: request.failure()?.errorText ?? 'Request failed'
    });
  });
}

export function recordAction(page: Page, label: string): void {
  const diagnostics = diagnosticsByPage.get(page);
  if (!diagnostics) throw new Error('Cannot record a browser action before page diagnostics are initialized.');
  diagnostics.events.push({
    timestamp: new Date().toISOString(),
    kind: 'action',
    label: `Started: ${label}`
  });
}

export async function captureScreenshot(page: Page, label: string): Promise<void> {
  const diagnostics = diagnosticsByPage.get(page);
  if (!diagnostics) throw new Error('Cannot capture a report screenshot before page diagnostics are initialized.');

  const image = await page.screenshot({ fullPage: false });
  diagnostics.screenshots.push({
    label,
    dataUrl: `data:image/png;base64,${image.toString('base64')}`
  });
}

export function addScenarioReport(diagnostics: ScenarioDiagnostics): void {
  scenarios.push(diagnostics);
}

export async function writePlaywrightReport(): Promise<void> {
  await mkdir('reports', { recursive: true });
  await writeFile('reports/playwright-report.html', renderReport(), 'utf8');
}

function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[unparseable URL]';
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);
}

function renderReport(): string {
  const scenarioSections = scenarios.map(scenario => {
    const elapsedSeconds = ((scenario.durationMs ?? Date.now() - scenario.startedAt) / 1000).toFixed(1);
    const events = scenario.events.map(event => `
      <tr>
        <td>${escapeHtml(new Date(event.timestamp).toLocaleTimeString())}</td>
        <td><span class="tag ${event.kind}">${event.kind}</span></td>
        <td>${escapeHtml(event.label)}${event.details ? `<small>${escapeHtml(event.details)}</small>` : ''}</td>
      </tr>`).join('');
    const screenshots = scenario.screenshots.map(screenshot => `
      <figure>
        <figcaption>${escapeHtml(screenshot.label)}</figcaption>
        <a href="${screenshot.dataUrl}" target="_blank" rel="noreferrer">
          <img src="${screenshot.dataUrl}" alt="${escapeHtml(screenshot.label)}">
        </a>
      </figure>`).join('');
    const trace = scenario.tracePath
      ? `<p class="trace">Detailed Playwright trace: <a href="${escapeHtml(scenario.tracePath)}">${escapeHtml(scenario.tracePath)}</a><br>
         Open it with <code>npx playwright show-trace "reports/${escapeHtml(scenario.tracePath)}"</code>.</p>`
      : '';

    return `<section>
      <header><h2>${escapeHtml(scenario.name)}</h2>
        <span class="status ${escapeHtml(scenario.status.toLowerCase())}">${escapeHtml(scenario.status)}</span>
        <span>${elapsedSeconds}s</span>
      </header>
      ${trace}
      <h3>Actions and network activity</h3>
      <div class="table-wrap"><table><thead><tr><th>Time</th><th>Type</th><th>Event</th></tr></thead>
      <tbody>${events || '<tr><td colspan="3">No events recorded</td></tr>'}</tbody></table></div>
      <h3>Screenshots</h3><div class="screenshots">${screenshots || '<p>No screenshots captured</p>'}</div>
    </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Playwright Test Report</title>
<style>
  :root{color-scheme:light dark;font:15px/1.5 system-ui,sans-serif;background:#f3f5f8;color:#172033}
  body{max-width:1200px;margin:32px auto;padding:0 20px}
  h1{margin-bottom:4px} .subtitle{color:#64748b;margin-top:0}
  section{background:#fff;border:1px solid #dbe2ea;border-radius:10px;padding:20px;margin:20px 0;box-shadow:0 2px 8px #1720330b}
  header{display:flex;align-items:center;gap:14px;flex-wrap:wrap} header h2{margin:0 auto 0 0}
  .status,.tag{border-radius:999px;padding:3px 9px;font-size:12px;font-weight:700;text-transform:uppercase}
  .passed{background:#dcfce7;color:#166534}.failed{background:#fee2e2;color:#991b1b}.running{background:#fef3c7;color:#92400e}
  .table-wrap{overflow:auto;max-height:520px;border:1px solid #e2e8f0;border-radius:6px}
  table{border-collapse:collapse;width:100%;font-size:13px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  th{position:sticky;top:0;background:#f8fafc} td:first-child{white-space:nowrap;color:#64748b}
  td small{display:block;color:#64748b}.tag.action{background:#dbeafe;color:#1e40af}.tag.network{background:#e2e8f0;color:#334155}
  .screenshots{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
  figure{margin:0}figcaption{font-weight:600;margin-bottom:6px}img{width:100%;height:auto;border:1px solid #cbd5e1;border-radius:6px}
  .trace{padding:10px;background:#f8fafc;border-radius:6px;overflow-wrap:anywhere}
  a{color:#2563eb}code{font-size:12px}
  @media(prefers-color-scheme:dark){:root{background:#0f172a;color:#e2e8f0}section{background:#1e293b;border-color:#334155}
    th,.trace{background:#0f172a}th,td{border-color:#334155}.tag.network{background:#334155;color:#e2e8f0}}
</style></head><body>
<h1>Playwright Test Report</h1><p class="subtitle">Actions, browser network activity, screenshots, and replayable traces. Generated ${new Date().toLocaleString()}.</p>
${scenarioSections || '<p>No scenarios have run.</p>'}
</body></html>`;
}
