import path from 'node:path';
import { spawn } from 'node:child_process';
import type { CliResult } from './types';

export interface RunCliOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
}

export function repoRootFromE2e(): string {
  return path.resolve(process.cwd(), '../..');
}

export function elogBinPath(repoRoot = repoRootFromE2e()): string {
  return path.join(repoRoot, 'packages/elog/bin/elog.js');
}

export function runNodeScript(args: string[], options: RunCliOptions): Promise<CliResult> {
  return runProcess(process.execPath, args, options);
}

export function runElog(args: string[], options: RunCliOptions): Promise<CliResult> {
  const repoRoot = options.repoRoot ?? repoRootFromE2e();
  return runProcess(process.execPath, [elogBinPath(repoRoot), ...args], {
    ...options,
    repoRoot,
  });
}

function runProcess(command: string, args: string[], options: RunCliOptions): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', reject);

    child.on('close', (exitCode, signal) => {
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        combinedOutput: `${stdout}${stderr}`,
      });
    });
  });
}
