import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export default class ReleaseTestReporter {
  onInit(ctx) {
    this.root = ctx.config.root;
    this.startedAt = Date.now();
  }

  onTestRunEnd(modules, errors, reason) {
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
    const dir = path.join(process.env.RELEASE_REPORT_DIR, 'tests');
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
