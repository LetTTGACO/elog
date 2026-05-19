import builtInRegistry from '../../registry/plugins.json' with { type: 'json' };
import type { PluginKind, PluginRegistry, PluginRegistryEntry } from './types';

/** init/export 命令专用错误，code 便于测试和 CLI 诊断。 */
export class InitCommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'InitCommandError';
    this.code = code;
  }
}

/** 注册表解析只接受普通对象，避免 JSON 结构异常继续向下传播。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 注册表字符串字段必须非空，否则生成 import 或 prompt 时无法定位。 */
function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be a non-empty string.`);
  }
}

/** 插件类型必须落在生命周期集合内，和运行时插件 kind 保持一致。 */
function assertPluginKind(value: unknown, path: string): asserts value is PluginKind {
  if (value !== 'from' && value !== 'to' && value !== 'transform') {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be from, to, or transform.`);
  }
}

/** 校验插件配置 schema 的最小结构，复杂 schema 细节留给生成器按需读取。 */
function assertOptionSchema(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be an object.`);
  }
  assertString(value.type, `${path}.type`);
  if (value.type === 'object' && value.properties !== undefined && !isRecord(value.properties)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path}.properties must be an object.`);
  }
}

/** 解析单个注册表条目，集中维护报错路径便于定位坏数据。 */
function parseEntry(value: unknown, index: number): PluginRegistryEntry {
  const path = `plugins[${index}]`;
  if (!isRecord(value)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be an object.`);
  }

  assertPluginKind(value.kind, `${path}.kind`);
  assertString(value.type, `${path}.type`);
  assertString(value.displayName, `${path}.displayName`);
  assertString(value.packageName, `${path}.packageName`);
  assertString(value.importName, `${path}.importName`);
  assertOptionSchema(value.optionsSchema, `${path}.optionsSchema`);

  return value as unknown as PluginRegistryEntry;
}

/** 解析插件注册表，并保证同 kind/type 不重复。 */
export function parsePluginRegistry(raw: unknown): PluginRegistry {
  if (!isRecord(raw)) {
    throw new InitCommandError('REGISTRY_INVALID', 'Plugin registry must be an object.');
  }
  if (raw.schemaVersion !== 1) {
    throw new InitCommandError('REGISTRY_INVALID', 'Plugin registry schemaVersion must be 1.');
  }
  if (!Array.isArray(raw.plugins)) {
    throw new InitCommandError('REGISTRY_INVALID', 'Plugin registry plugins must be an array.');
  }

  const seen = new Set<string>();
  const plugins = raw.plugins.map((entry, index) => {
    const parsed = parseEntry(entry, index);
    const key = `${parsed.kind}:${parsed.type}`;
    if (seen.has(key)) {
      // kind/type 是向导选择的稳定键，重复会导致用户选择无法唯一解析。
      throw new InitCommandError('REGISTRY_INVALID', `Duplicate plugin registry entry "${key}".`);
    }
    seen.add(key);
    return parsed;
  });

  return { schemaVersion: 1, plugins };
}

/** 加载内置插件注册表，所有 JSON 数据仍经过同一套运行时校验。 */
export function loadBuiltInPluginRegistry(): PluginRegistry {
  return parsePluginRegistry(builtInRegistry);
}

/** 按插件生命周期筛选注册表，供向导生成 from/to/transform 选项。 */
export function getPluginsByKind(
  registry: PluginRegistry,
  kind: PluginKind,
): PluginRegistryEntry[] {
  return registry.plugins.filter((plugin) => plugin.kind === kind);
}
