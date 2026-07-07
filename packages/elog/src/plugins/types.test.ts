import { describe, expect, it } from 'vitest';
import { ElogPluginError } from './errors';
import type { ElogPlugin, PluginContext } from './types';

describe('plugin contract', () => {
  it('uses explicit plugin kind values', () => {
    const pluginKinds: ElogPlugin['kind'][] = ['from', 'transform', 'to'];
    expect(pluginKinds).toEqual(['from', 'transform', 'to']);
  });

  it('wraps plugin errors with hook metadata', () => {
    const cause = new Error('network failed');
    const error = new ElogPluginError('from:notion', 'download', cause);

    expect(error.name).toBe('ElogPluginError');
    expect(error.pluginName).toBe('from:notion');
    expect(error.hookName).toBe('download');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('from:notion');
    expect(error.message).toContain('download');
  });

  it('describes grouped plugin context capabilities', () => {
    const contextKeys: Array<keyof PluginContext> = [
      'workflow',
      'logger',
      'http',
      'cache',
      'image',
    ];

    expect(contextKeys).toEqual(['workflow', 'logger', 'http', 'cache', 'image']);
  });
});
