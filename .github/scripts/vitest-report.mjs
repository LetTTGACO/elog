import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default class WorkflowTestReporter {
  async onInit(ctx) {
    this.root = ctx.config.root;
    this.startedAt = Date.now();
    // Retain GitHub failure annotations while the CI job owns the summary.
    if (process.env.CI_REPORT_DIR && process.env.GITHUB_ACTIONS === 'true') {
      const require = createRequire(path.join(this.root, 'package.json'));
      const { GithubActionsReporter } = await import(
        pathToFileURL(require.resolve('vitest/reporters'))
      );
      this.github = new GithubActionsReporter({ jobSummary: { enabled: false } });
      this.github.onInit(ctx);
    }
  }

  onTestCaseAnnotate(testCase, annotation) {
    this.github?.onTestCaseAnnotate(testCase, annotation);
  }

  onTestRunEnd(modules, errors, reason) {
    this.github?.onTestRunEnd(modules, errors);
    const counts = { passed: 0, failed: 0, skipped: 0, pending: 0 };
    const failures = errors.map((error) => error.message);
    for (const module of modules) {
      for (const test of module.children.allTests()) {
        const result = test.result();
        counts[result.state]++;
        if (result.state === 'failed') {
          failures.push(`${module.relativeModuleId}: ${test.fullName}`);
        }
      }
      if (!module.ok()) failures.push(`测试文件失败：${module.relativeModuleId}`);
    }
    const name = JSON.parse(readFileSync(path.join(this.root, 'package.json'), 'utf8')).name;
    const dir = path.join(process.env.CI_REPORT_DIR ?? process.env.RELEASE_REPORT_DIR, 'tests');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, `${Buffer.from(name).toString('base64url')}.json`),
      JSON.stringify(
        {
          name,
          files: modules.length,
          counts,
          failures,
          reason,
          durationMs: Date.now() - this.startedAt,
        },
        null,
        2,
      ),
    );
  }
}
