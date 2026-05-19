/** 插件生命周期分类，和运行时插件 kind 一一对应。 */
export type PluginKind = 'from' | 'to' | 'transform';

/** init 注册表支持的 JSON schema 基础类型集合。 */
export type JsonSchemaPrimitiveType = 'object' | 'string' | 'number' | 'boolean' | 'array';

/** Elog 扩展的 prompt 元数据，用于从 schema 生成 inquirer 问题。 */
export interface ElogPromptMetadata {
  type?: 'input' | 'password' | 'confirm' | 'number' | 'list' | 'checkbox';
  message?: string;
  choices?: string[];
}

/** 插件配置 schema，额外 x-elog 字段用于控制 env、secret 和隐藏项。 */
export interface ElogOptionSchema {
  type: JsonSchemaPrimitiveType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, ElogOptionSchema>;
  items?: ElogOptionSchema;
  additionalProperties?: boolean;
  'x-elog-env'?: string;
  'x-elog-secret'?: boolean;
  'x-elog-prompt'?: ElogPromptMetadata;
  'x-elog-hidden'?: boolean;
}

/** 注册表中的单个插件条目，描述安装包、导入名和配置 schema。 */
export interface PluginRegistryEntry {
  kind: PluginKind;
  type: string;
  displayName: string;
  packageName: string;
  importName: string;
  optionsSchema: ElogOptionSchema;
}

/** 插件注册表顶层结构，schemaVersion 用于未来兼容升级。 */
export interface PluginRegistry {
  schemaVersion: 1;
  plugins: PluginRegistryEntry[];
}

/** 已选择插件及其配置答案，供 init/export 生成配置或运行时插件。 */
export interface SelectedPlugin {
  entry: PluginRegistryEntry;
  answers: Record<string, unknown>;
}

/** init 向导的轻量选择结果，尚未询问具体插件参数。 */
export interface PluginSelection {
  from: PluginRegistryEntry;
  transforms: PluginRegistryEntry[];
  to: PluginRegistryEntry[];
}

/** 内部生成配置使用的选择结果，已包含每个插件的 answers。 */
export interface InitSelection {
  from: SelectedPlugin;
  transforms: SelectedPlugin[];
  to: SelectedPlugin[];
}

/** export 命令选择结果，目标插件固定为单个以执行一次性导出。 */
export interface ExportSelection {
  from: SelectedPlugin;
  transforms: SelectedPlugin[];
  to: SelectedPlugin;
}

/** init 生成的文件内容集合，目前只包含主配置文件。 */
export interface GeneratedInitFiles {
  configText: string;
}
