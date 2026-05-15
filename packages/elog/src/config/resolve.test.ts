import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

const fromPlugin: FromPlugin = {
  name: 'from:mock',
  kind: 'from',
  async download() {
    return { docDetailList: [], sortedDocList: [], docStatusMap: {} };
  },
};

const transformPlugin: TransformPlugin = {
  name: 'transform:mock',
  kind: 'transform',
  async transform(docs) {
    return docs;
  },
};

const toPlugin: ToPlugin = {
  name: 'to:mock',
  kind: 'to',
  deploy() {},
};

describe('resolveConfig', () => {
  it('normalizes a single v1 workflow', () => {
    const result = resolveConfig({
      from: fromPlugin,
      plugins: [transformPlugin],
      to: toPlugin,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0]).toMatchObject({
      id: 'workflow-1',
      disabled: false,
      cache: { disabled: false, filePath: 'elog.cache.json' },
      from: fromPlugin,
      transforms: [transformPlugin],
      to: [toPlugin],
      deployStrategy: 'serial',
    });
  });

  it('normalizes multi-workflow cache defaults', () => {
    const result = resolveConfig([
      { from: fromPlugin, to: toPlugin },
      { from: fromPlugin, to: [toPlugin] },
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.workflows.map((workflow) => workflow.cache.filePath)).toEqual([
      'elog.cache1.json',
      'elog.cache2.json',
    ]);
  });

  it('preserves disabled workflows in resolved output', () => {
    const result = resolveConfig({
      disable: true,
      from: fromPlugin,
      to: toPlugin,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0]).toMatchObject({
      id: 'workflow-1',
      disabled: true,
    });
  });

  it('reports missing from plugin', () => {
    const result = resolveConfig({ to: toPlugin });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'CONFIG_MISSING_FROM',
    });
  });

  it('rejects an empty workflow id', () => {
    const result = resolveConfig({
      id: '',
      from: fromPlugin,
      to: toPlugin,
    });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'CONFIG_INVALID_WORKFLOW_ID',
      path: 'workflows[0].id',
    });
  });

  it('rejects a non-string workflow id', () => {
    const result = resolveConfig({
      id: 123,
      from: fromPlugin,
      to: toPlugin,
    });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'CONFIG_INVALID_WORKFLOW_ID',
      path: 'workflows[0].id',
    });
  });

  it('rejects a nullish transform plugin entry', () => {
    const result = resolveConfig({
      from: fromPlugin,
      plugins: [undefined],
      to: toPlugin,
    });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'CONFIG_INVALID_TRANSFORM',
      path: 'workflows[0].plugins',
    });
  });

  it('detects likely Elog 0.x config', () => {
    const result = resolveConfig({
      write: { platform: 'yuque' },
      deploy: { platform: 'local' },
      image: { enable: true },
    });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'LEGACY_V0_CONFIG_DETECTED',
    });
  });
});
