import { describe, expect, expectTypeOf, it } from 'vitest';
import * as cliEntry from './index';
import type { ElogConfig } from './index';

// @ts-expect-error @elog/cli must not expose plugin authoring contracts.
import type { PluginContext as ForbiddenPluginContext } from './index';
// @ts-expect-error @elog/cli must not expose Core workflow result types.
import type { WorkflowResult as ForbiddenWorkflowResult } from './index';

export type ForbiddenCliRootTypeExports = [ForbiddenPluginContext, ForbiddenWorkflowResult];

describe('@elog/cli package entry', () => {
  it('exposes command entrypoints and config authoring', () => {
    expect(Object.keys(cliEntry).sort()).toEqual([
      'createProgram',
      'default',
      'defineConfig',
      'run',
    ]);
    expectTypeOf(cliEntry.defineConfig).parameter(0).toEqualTypeOf<ElogConfig | ElogConfig[]>();
  });
});
