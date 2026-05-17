import { describe, expect, it } from 'vitest';
import { runNodeScript } from './run-cli';

describe('runNodeScript', () => {
  it('captures stdout, stderr, exit code, and combined output', async () => {
    const result = await runNodeScript(
      ['-e', "console.log('out-line'); console.error('err-line'); process.exitCode = 3;"],
      {
        cwd: process.cwd(),
        env: {},
      },
    );

    expect(result.exitCode).toBe(3);
    expect(result.signal).toBeNull();
    expect(result.stdout).toContain('out-line');
    expect(result.stderr).toContain('err-line');
    expect(result.combinedOutput).toContain('out-line');
    expect(result.combinedOutput).toContain('err-line');
  });
});
