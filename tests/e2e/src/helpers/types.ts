import type { Assertion } from 'vitest';

export interface CliResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  combinedOutput: string;
}

export interface TempWorkspace {
  path: string;
  cleanup: (force?: boolean) => void;
}

export interface CommandCaseContext {
  workspace: string;
  repoRoot: string;
}

export interface CommandCaseExpectContext extends CommandCaseContext {
  result: CliResult;
}

export interface CommandCase {
  id: string;
  command: string[];
  env?: NodeJS.ProcessEnv;
  setup?: (context: CommandCaseContext) => Promise<void> | void;
  expect: (context: CommandCaseExpectContext) => Promise<void> | void;
}

export interface SyncCaseExpected {
  cacheFile: string;
  outputDir: string;
  minMarkdownFiles: number;
  imageDir?: string;
  minImageFiles?: number;
}

export interface SyncCaseContext {
  workspace: string;
  repoRoot: string;
}

export interface SyncCaseAssertContext extends SyncCaseContext {
  firstRun: CliResult;
  secondRun: CliResult;
}

export interface SyncCase {
  id: string;
  title: string;
  requiredEnv: string[];
  configFile: string;
  expected: SyncCaseExpected;
  assert?: (context: SyncCaseAssertContext) => Promise<void> | void;
}

export type VitestExpect = <T = unknown>(actual: T, message?: string) => Assertion<T>;
