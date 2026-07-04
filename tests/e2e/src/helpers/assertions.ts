import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import type { CliResult, SyncCaseExpected } from './types';

export function expectExitCode(result: CliResult, exitCode: number): void {
  expect(result.exitCode, result.combinedOutput).toBe(exitCode);
  expect(result.signal, result.combinedOutput).toBeNull();
}

export function expectOutputContains(result: CliResult, text: string): void {
  expect(result.combinedOutput).toContain(text);
}

export function requireFile(filePath: string): string {
  expect(fs.existsSync(filePath), `${filePath} should exist`).toBe(true);
  expect(fs.statSync(filePath).isFile(), `${filePath} should be a file`).toBe(true);
  return filePath;
}

export function requireDirectory(directoryPath: string): string {
  expect(fs.existsSync(directoryPath), `${directoryPath} should exist`).toBe(true);
  expect(fs.statSync(directoryPath).isDirectory(), `${directoryPath} should be a directory`).toBe(
    true,
  );
  return directoryPath;
}

export function readJsonFile(filePath: string): unknown {
  requireFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function countFilesByExtension(directoryPath: string, extension: string): number {
  requireDirectory(directoryPath);

  let count = 0;
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      count += countFilesByExtension(entryPath, extension);
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      count += 1;
    }
  }

  return count;
}

export function countFiles(directoryPath: string): number {
  requireDirectory(directoryPath);

  let count = 0;
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

export function expectSyncArtifacts(workspace: string, expected: SyncCaseExpected): void {
  const cachePath = path.join(workspace, expected.cacheFile);
  const cache = readJsonFile(cachePath);

  expect(cache).toHaveProperty('sortedDocList');

  if (expected.outputDir) {
    const outputDir = path.join(workspace, expected.outputDir);
    requireDirectory(outputDir);
    expect(countFilesByExtension(outputDir, '.md')).toBeGreaterThanOrEqual(
      expected.minMarkdownFiles ?? 1,
    );
  }

  if (expected.imageDir) {
    const imageDir = path.join(workspace, expected.imageDir);
    requireDirectory(imageDir);
    expect(countFiles(imageDir)).toBeGreaterThanOrEqual(expected.minImageFiles ?? 1);
  }
}
