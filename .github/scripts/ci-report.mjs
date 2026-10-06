import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './release-report.mjs';

const checks = [
  ['checkout', '源码检出'],
  ['pnpm', 'pnpm 配置'],
  ['node', 'Node.js 配置'],
  ['install', '依赖安装'],
  ['build', '构建'],
  ['typecheck', '类型检查'],
  ['test', '单元／集成测试'],
  ['report_test', 'CI／发布报告测试'],
  ['offline_test', '离线 E2E'],
];
const status = (value) =>
  ({ success: '✅ 通过', failure: '❌ 失败', cancelled: '⏹ 已取消', skipped: '— 未执行' })[value] ??
  '⚠️ 无报告';
const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\r?\n/g, ' ')
    .replace(/([\\`*_[\]])/g, '\\$1');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2));
const duration = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)}s`);
const totals = (tests) =>
  tests.reduce(
    (sum, test) => {
      sum.files += test.files;
      for (const key of ['passed', 'failed', 'skipped', 'pending'])
        sum[key] += test.counts[key] ?? 0;
      return sum;
    },
    { files: 0, passed: 0, failed: 0, skipped: 0, pending: 0 },
  );

export function collectReport(dir, nodeVersion, steps) {
  const metrics = Object.fromEntries(
    readdirSync(dir)
      .filter((file) => file.endsWith('.step.json'))
      .map((file) => [file.slice(0, -10), readJson(path.join(dir, file))]),
  );
  const testsDir = path.join(dir, 'tests');
  const tests = existsSync(testsDir)
    ? readdirSync(testsDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => readJson(path.join(testsDir, file)))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return { nodeVersion: String(nodeVersion), steps, metrics, tests };
}

export function renderSummary({ reports = [], needs = {}, nodeVersions, repository, sha, runUrl }) {
  const byNode = new Map(reports.map((report) => [report.nodeVersion, report]));
  const success =
    needs['workflow-lint']?.result === 'success' &&
    needs.build?.result === 'success' &&
    nodeVersions.every((node) =>
      checks.every(([id]) => byNode.get(String(node))?.steps[id]?.outcome === 'success'),
    );
  const outcomes = [
    ...Object.values(needs).map((job) => job.result),
    ...reports.flatMap((report) => Object.values(report.steps).map((step) => step.outcome)),
  ];
  const result = success
    ? '✅ 全部通过'
    : outcomes.includes('failure')
      ? '❌ 存在失败'
      : outcomes.includes('cancelled')
        ? '⏹ 已取消'
        : '⚠️ 验证未完成';
  const lines = [
    '# CI 验证结果',
    '',
    `**${result}**`,
    '',
    `- 源码：${repository && sha ? `[${sha.slice(0, 8)}](https://github.com/${repository}/commit/${sha})` : '—'}`,
    `- 运行环境：Ubuntu · ${nodeVersions.map((node) => `Node.js ${escape(node)}`).join(' / ')}`,
    ...(runUrl ? [`- [步骤日志与报告附件](${runUrl})`] : []),
    '',
    '## 验证结果',
    '',
    `工作流语法检查：**${status(needs['workflow-lint']?.result)}** · Node.js 矩阵：**${status(needs.build?.result)}**`,
    '',
    `| 检查 | ${nodeVersions.map((node) => `Node.js ${escape(node)}`).join(' | ')} |`,
    `| --- | ${nodeVersions.map(() => '---').join(' | ')} |`,
  ];
  for (const [id, label] of checks) {
    lines.push(
      `| ${label} | ${nodeVersions
        .map((node) => {
          const report = byNode.get(String(node));
          return `${status(report?.steps[id]?.outcome)}${report?.metrics[id] ? ` · ${duration(report.metrics[id].durationMs)}` : ''}`;
        })
        .join(' | ')} |`,
    );
  }
  lines.push(
    '',
    '## 测试统计',
    '',
    '| 环境 | 文件 | 通过 | 失败 | 跳过 | 未完成 |',
    '| --- | --- | --- | --- | --- | --- |',
  );
  for (const node of nodeVersions) {
    const report = byNode.get(String(node));
    if (!report?.tests.length) {
      lines.push(`| Node.js ${escape(node)} | — | — | — | — | — |`);
      continue;
    }
    const sum = totals(report.tests);
    lines.push(
      `| Node.js ${escape(node)} | ${sum.files} | ${sum.passed} | ${sum.failed} | ${sum.skipped} | ${sum.pending} |`,
    );
  }
  lines.push(
    '',
    '各 Node.js 环境分别统计，避免重复计数。数量来自 Vitest 单元／集成测试和离线 E2E；CI／发布报告测试以检查状态为准。未收到统计时显示「—」，最终结论以步骤和任务状态为准。',
    '',
  );

  const failures = [];
  if (['failure', 'cancelled'].includes(needs.build?.result))
    failures.push(
      `- Node.js 矩阵：${status(needs.build.result)}，请结合对应任务日志检查（含报告收集与上传步骤）。`,
    );
  if (['failure', 'cancelled'].includes(needs['workflow-lint']?.result))
    failures.push(
      `- 工作流语法检查：${status(needs['workflow-lint'].result)}，请查看 workflow-lint 日志。`,
    );
  for (const node of nodeVersions) {
    const report = byNode.get(String(node));
    if (!report) {
      failures.push(`- Node.js ${escape(node)}：未收到报告，请查看对应任务日志。`);
      continue;
    }
    for (const [id, label] of checks) {
      if (['failure', 'cancelled'].includes(report.steps[id]?.outcome))
        failures.push(
          `- Node.js ${escape(node)} · ${label}：${status(report.steps[id].outcome)}${report.metrics[id] ? `，日志：\`${id}.log\`` : ''}。`,
        );
    }
    for (const test of report.tests) {
      failures.push(
        ...test.failures
          .slice(0, 20)
          .map((failure) => `- Node.js ${escape(node)} · ${escape(test.name)}：${escape(failure)}`),
      );
      if (test.failures.length > 20)
        failures.push(`- 另有 ${test.failures.length - 20} 条失败信息，见报告附件。`);
    }
  }
  if (failures.length) lines.push('## 失败与未完成项', '', ...failures, '');
  for (const node of nodeVersions) {
    const report = byNode.get(String(node));
    if (!report?.tests.length) continue;
    lines.push(
      `<details><summary>Node.js ${escape(node)} · 各包测试明细</summary>`,
      '',
      '| 包 | 文件 | 通过 | 失败 | 跳过 | 未完成 | 耗时 |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const test of report.tests.filter((test) => test.files || test.failures.length))
      lines.push(
        `| ${escape(test.name)} | ${test.files} | ${test.counts.passed} | ${test.counts.failed} | ${test.counts.skipped} | ${test.counts.pending} | ${duration(test.durationMs)} |`,
      );
    lines.push('', '</details>', '');
  }
  return `${lines.join('\n')}\n`;
}

function summary(dir) {
  const reports = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name, 'report.json'))
    .filter((file) => existsSync(file))
    .map(readJson);
  const input = {
    reports,
    needs: JSON.parse(process.env.CI_NEEDS || '{}'),
    nodeVersions: JSON.parse(process.env.CI_NODE_VERSIONS),
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    runUrl: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  };
  const markdown = renderSummary(input);
  writeJson(path.join(dir, 'summary-data.json'), input);
  writeFileSync(path.join(dir, 'summary.md'), markdown);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      Buffer.byteLength(markdown) < 950000
        ? markdown
        : `${markdown.slice(0, 100000)}\n\n完整报告见 ci-report 附件。\n`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.env.CI_REPORT_DIR;
  if (!dir) throw new Error('CI_REPORT_DIR is required');
  mkdirSync(dir, { recursive: true });
  const [command, ...args] = process.argv.slice(2);
  if (command === 'run') await run(dir, ...args.slice(0, 2), args.slice(2));
  else if (command === 'collect')
    writeJson(
      path.join(dir, 'report.json'),
      collectReport(dir, process.env.CI_NODE_VERSION, JSON.parse(process.env.CI_STEPS || '{}')),
    );
  else if (command === 'summary') summary(dir);
  else throw new Error(`Unknown command: ${command}`);
}
