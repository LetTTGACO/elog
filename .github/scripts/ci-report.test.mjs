import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderSummary } from './ci-report.mjs';

const script = fileURLToPath(new URL('./ci-report.mjs', import.meta.url));
const successfulSteps = Object.fromEntries(
  [
    'checkout',
    'pnpm',
    'node',
    'install',
    'build',
    'typecheck',
    'test',
    'report_test',
    'offline_test',
  ].map((id) => [id, { outcome: 'success' }]),
);
const testReport = {
  name: '@elog/core',
  files: 2,
  counts: { passed: 12, failed: 0, skipped: 1, pending: 0 },
  failures: [],
  durationMs: 1200,
};
const report = (nodeVersion, overrides = {}) => ({
  nodeVersion: String(nodeVersion),
  steps: successfulSteps,
  metrics: { build: { durationMs: 12500 } },
  tests: [testReport],
  ...overrides,
});
const input = {
  nodeVersions: [22, 24],
  needs: { 'workflow-lint': { result: 'success' }, build: { result: 'success' } },
  reports: [report(22), report(24)],
  repository: 'LetTTGACO/elog',
  sha: '123456789abcdef',
  runUrl: 'https://github.com/LetTTGACO/elog/actions/runs/123',
};

test('one summary compares Node environments with timings and separate test totals', () => {
  const markdown = renderSummary({
    ...input,
    reports: [
      report(22, {
        tests: [
          testReport,
          { ...testReport, name: '@elog/e2e', files: 1, counts: { passed: 3 } },
          { ...testReport, name: '@elog/empty', files: 0, counts: { passed: 0 } },
        ],
      }),
      report(24),
    ],
  });
  assert.match(markdown, /✅ 全部通过/);
  assert.match(markdown, /\| 构建 \| ✅ 通过 · 12.5s \| ✅ 通过 · 12.5s \|/);
  assert.match(markdown, /\| Node.js 22 \| 3 \| 15 \| 0 \| 1 \| 0 \|/);
  assert.match(markdown, /\| Node.js 24 \| 2 \| 12 \| 0 \| 1 \| 0 \|/);
  assert.match(markdown, /<details><summary>Node.js 22 · 各包测试明细<\/summary>/);
  assert.match(
    markdown,
    /\[12345678\]\(https:\/\/github.com\/LetTTGACO\/elog\/commit\/123456789abcdef\)/,
  );
  assert.doesNotMatch(markdown, /@elog\/empty|Vitest Test Report|失败与未完成项/);
});

test('step outcomes control the result even when the other environment passed', () => {
  const markdown = renderSummary({
    ...input,
    needs: { ...input.needs, build: { result: 'failure' } },
    reports: [
      report(22, {
        steps: { ...successfulSteps, build: { outcome: 'failure' }, test: { outcome: 'skipped' } },
        tests: [],
      }),
      report(24),
    ],
  });
  assert.match(markdown, /❌ 存在失败/);
  assert.match(markdown, /Node.js 22 · 构建：❌ 失败，日志：`build.log`/);
  assert.match(markdown, /\| 单元／集成测试 \| — 未执行 \| ✅ 通过 \|/);
  assert.match(markdown, /\| Node.js 22 \| — \| — \| — \| — \| — \|/);
  assert.doesNotMatch(markdown, /✅ 全部通过/);
});

test('missing reports, missing steps and workflow lint failures cannot claim success', () => {
  for (const overrides of [
    { reports: [report(22)] },
    { reports: [] },
    { reports: [report(22, { steps: {} }), report(24)] },
    { needs: { ...input.needs, 'workflow-lint': { result: 'failure' } } },
    { needs: { ...input.needs, build: { result: 'failure' } } },
  ]) {
    assert.doesNotMatch(renderSummary({ ...input, ...overrides }), /✅ 全部通过/);
  }
  assert.match(renderSummary({ ...input, reports: [] }), /Node.js 22：未收到报告/);
  assert.match(
    renderSummary({ ...input, needs: { ...input.needs, 'workflow-lint': { result: 'failure' } } }),
    /工作流语法检查：❌ 失败，请查看 workflow-lint 日志/,
  );
});

test('cancelled jobs retain partial statistics and failed test names are escaped', () => {
  const markdown = renderSummary({
    ...input,
    needs: { ...input.needs, build: { result: 'cancelled' } },
    reports: [
      report(22, {
        steps: { ...successfulSteps, offline_test: { outcome: 'cancelled' } },
        tests: [{ ...testReport, failures: ['broken | <script>\n[name]'] }],
      }),
    ],
  });
  assert.match(markdown, /⏹ 已取消/);
  assert.match(markdown, /\| Node.js 22 \| 2 \| 12 \| 0 \| 1 \| 0 \|/);
  assert.match(markdown, /broken &#124; &lt;script&gt; \\\[name\\\]/);
  assert.doesNotMatch(markdown, /<script>/);
});

test('a command failure keeps its exit code and logs through collection and aggregation', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'elog-ci-report-'));
  const nodeDir = path.join(dir, 'ci-report-node-22');
  const env = {
    ...process.env,
    CI_REPORT_DIR: nodeDir,
    CI_NODE_VERSION: '22',
    CI_STEPS: JSON.stringify({ build: { outcome: 'failure' }, test: { outcome: 'skipped' } }),
  };
  const invoke = (args, extraEnv = {}) =>
    spawnSync(process.execPath, [script, ...args], {
      env: { ...env, ...extraEnv },
      encoding: 'utf8',
    });
  try {
    const failed = invoke([
      'run',
      'build',
      process.execPath,
      '-e',
      'console.error("fixture build failure"); process.exit(7)',
    ]);
    assert.equal(failed.status, 7);
    assert.match(readFileSync(path.join(nodeDir, 'build.log'), 'utf8'), /fixture build failure/);
    mkdirSync(path.join(nodeDir, 'tests'));
    writeFileSync(path.join(nodeDir, 'tests', 'core.json'), JSON.stringify(testReport));
    const collected = invoke(['collect']);
    assert.equal(collected.status, 0, collected.stderr);
    const collectedData = JSON.parse(readFileSync(path.join(nodeDir, 'report.json'), 'utf8'));
    assert.equal(collectedData.nodeVersion, '22');
    assert.equal(collectedData.metrics.build.outcome, 'failure');
    assert.equal(collectedData.tests[0].counts.passed, 12);
    const summary = invoke(['summary'], {
      CI_REPORT_DIR: dir,
      CI_NEEDS: JSON.stringify({ ...input.needs, build: { result: 'failure' } }),
      CI_NODE_VERSIONS: '[22, 24]',
      GITHUB_STEP_SUMMARY: path.join(dir, 'github.md'),
    });
    assert.equal(summary.status, 0, summary.stderr);
    const markdown = readFileSync(path.join(dir, 'summary.md'), 'utf8');
    assert.match(markdown, /❌ 存在失败/);
    assert.match(markdown, /Node.js 24：未收到报告/);
    assert.equal(readFileSync(path.join(dir, 'github.md'), 'utf8'), markdown);
    assert.equal(
      JSON.parse(readFileSync(path.join(dir, 'summary-data.json'), 'utf8')).reports.length,
      1,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('real Vitest failures retain GitHub annotations without emitting package summaries', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'elog-ci-vitest-'));
  const core = fileURLToPath(new URL('../../packages/core/', import.meta.url));
  const require = createRequire(path.join(core, 'package.json'));
  const bin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const reporter = fileURLToPath(new URL('./vitest-report.mjs', import.meta.url));
  const summary = path.join(dir, 'github.md');
  const reportDir = path.join(dir, 'report');
  try {
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'reporter-fixture', type: 'module' }),
    );
    symlinkSync(path.join(core, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    writeFileSync(
      path.join(dir, 'failure.test.ts'),
      "import { test, expect } from 'vitest'; test('fixture failure', () => expect(1).toBe(2));",
    );
    writeFileSync(summary, '');
    const result = spawnSync(
      process.execPath,
      [bin, 'run', '--reporter=default', `--reporter=${reporter}`],
      {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_ACTIONS: 'true',
          CI_REPORT_DIR: reportDir,
          GITHUB_STEP_SUMMARY: summary,
        },
      },
    );
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /::error file=.*failure.test.ts/);
    assert.equal(readFileSync(summary, 'utf8'), '');
    const testsDir = path.join(reportDir, 'tests');
    const record = JSON.parse(readFileSync(path.join(testsDir, readdirSync(testsDir)[0]), 'utf8'));
    assert.equal(record.counts.failed, 1);
    assert.match(record.failures.join('\n'), /fixture failure/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
