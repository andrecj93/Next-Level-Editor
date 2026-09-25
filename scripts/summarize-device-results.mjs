import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';

// Keep every outcome and failure readable without downloading hundreds of
// inline screenshots. The complete Playwright report remains a separate artifact.
const input = process.argv[2] ?? 'playwright-report/devices/results.json';
const output = process.argv[3] ?? 'playwright-report/devices/summary.json';
const log = (event, details) => console.log(JSON.stringify({ time: new Date().toISOString(), event, ...details }));

try {
  log('device-summary-started', { input, output });
  const source = await readFile(input, 'utf8');
  const report = JSON.parse(source);
  const tests = [];
  const visit = (suite, parents = []) => {
    const titles = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        tests.push({
          id: spec.id, file: spec.file, line: spec.line,
          title: [...titles, spec.title].join(' › '),
          project: test.projectName, status: test.status,
          expectedStatus: test.expectedStatus, annotations: test.annotations,
          results: (test.results ?? []).map(result => ({
            ...result,
            attachments: (result.attachments ?? []).map(({ body, ...attachment }) => ({
              ...attachment,
              ...(body ? { embeddedBytes: Buffer.byteLength(body, 'base64') } : {}),
            })),
          })),
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  };
  for (const suite of report.suites ?? []) visit(suite);
  const summary = JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    stats: report.stats,
    errors: report.errors,
    tests,
  }, null, 2) + '\n';
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, summary);
  log('device-summary-completed', { tests: tests.length, inputBytes: Buffer.byteLength(source), outputBytes: Buffer.byteLength(summary) });
} catch (error) {
  log('device-summary-failed', { reason: error instanceof Error ? error.message : 'Unknown error' });
  process.exitCode = 1;
}
