import type { ElogPlugin, FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

/** 用户原始配置先以 unknown 接收，必须经过解析和校验后才能进入运行时。 */
export type RawUserConfig = unknown;
/** 程序化调用支持单工作流或多工作流数组两种输入。 */
export type InputOptions = ElogConfig | ElogConfig[];

/** 配置诊断用于向 CLI 和调用方解释错误位置，而不是只返回异常文本。 */
export interface ConfigDiagnostic {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

/** 配置解析结果同时携带工作流和诊断，便于 CLI 在运行前统一处理。 */
export interface ResolveConfigResult {
  workflows: import('../runtime/types').RuntimeWorkflowConfig[];
  diagnostics: ConfigDiagnostic[];
}

/** 用户可配置的缓存行为，归一化后会进入 RuntimeWorkflowConfig.cache。 */
export interface ElogCacheConfig {
  /** 是否禁用当前工作流缓存，禁用后会强制全量同步。 */
  disableCache?: boolean;
  /** @internal 仅 export 命令使用，用于一次性导出时禁止写缓存。 */
  disableCacheWrite?: boolean;
  /** 缓存文件路径，单/多工作流有不同默认值。 */
  cacheFilePath?: string;
}

/** Elog 1.0 用户配置边界，插件实例在这里按生命周期分组声明。 */
export interface ElogConfig extends ElogCacheConfig {
  /** 可选工作流 ID，默认按 workflow-序号 生成。 */
  id?: string;
  /** 是否禁用当前工作流，禁用后仍会返回 skipped 结果。 */
  disable?: boolean;
  /** 来源插件，一个工作流只能有一个 from。 */
  from: FromPlugin;
  /** 部署目标插件，单目标可写对象，多目标写数组。 */
  to: ToPlugin | ToPlugin[];
  /** 转换插件数组，按声明顺序串行执行。 */
  plugins?: TransformPlugin[];
  /** 部署执行策略，默认串行以便调试外部副作用。 */
  deployStrategy?: 'serial' | 'parallel';
}

/** 兼容旧公共类型命名，表示任意 Elog 插件实例。 */
export type AnyElogPlugin = ElogPlugin;
