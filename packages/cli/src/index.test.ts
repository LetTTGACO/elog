import { describe, expect, it } from 'vitest';
import * as cliEntry from './index';

// @ts-expect-error @elog/cli must not expose plugin authoring contracts.
import type { PluginContext as ForbiddenPluginContext } from './index';
// @ts-expect-error @elog/cli must not expose config authoring contracts.
import type { ElogConfig as ForbiddenElogConfig } from './index';
// @ts-expect-error @elog/cli must not expose Core workflow result types.
import type { WorkflowResult as ForbiddenWorkflowResult } from './index';

export type ForbiddenCliRootTypeExports = [
  ForbiddenPluginContext,
  ForbiddenElogConfig,
  ForbiddenWorkflowResult,
];

describe('@elog/cli package entry', () => {
  it('only exposes CLI command entrypoints at runtime', () => {
    expect(Object.keys(cliEntry).sort()).toEqual(['createProgram', 'default', 'run']);
  });
});
