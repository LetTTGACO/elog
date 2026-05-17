import { expect } from 'vitest';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-missing-config',
  command: ['sync', '--config', 'missing.config.ts'],
  expect({ result }) {
    expect(result.exitCode).toBe(1);
    expect(result.signal).toBeNull();
    expect(result.combinedOutput.length).toBeGreaterThan(0);
  },
};

export default commandCase;
