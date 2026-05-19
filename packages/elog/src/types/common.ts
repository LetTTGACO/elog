import type { ElogPlugin, FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

export type RawUserConfig = unknown;
export type InputOptions = ElogConfig | ElogConfig[];

export interface ConfigDiagnostic {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface ResolveConfigResult {
  workflows: import('../runtime/types').RuntimeWorkflowConfig[];
  diagnostics: ConfigDiagnostic[];
}

export interface ElogCacheConfig {
  /** Whether to disable cache for this workflow. */
  disableCache?: boolean;
  /** @internal Export command only. Prevents writing cache after sync. */
  disableCacheWrite?: boolean;
  /** Cache file path. */
  cacheFilePath?: string;
}

export interface ElogConfig extends ElogCacheConfig {
  /** Optional workflow id. */
  id?: string;
  /** Whether to disable this workflow. */
  disable?: boolean;
  /** Source plugin. */
  from: FromPlugin;
  /** Deploy target plugins. */
  to: ToPlugin | ToPlugin[];
  /** Transform plugins. */
  plugins?: TransformPlugin[];
  /** Deploy execution strategy. Defaults to serial. */
  deployStrategy?: 'serial' | 'parallel';
}

export type AnyElogPlugin = ElogPlugin;
