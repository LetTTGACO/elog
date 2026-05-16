import builtInRegistry from '../../registry/plugins.json' with { type: 'json' };
import type { PluginKind, PluginRegistry, PluginRegistryEntry } from './types';

export class InitCommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'InitCommandError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be a non-empty string.`);
  }
}

function assertPluginKind(value: unknown, path: string): asserts value is PluginKind {
  if (value !== 'from' && value !== 'to' && value !== 'transform') {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be from, to, or transform.`);
  }
}

function assertOptionSchema(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be an object.`);
  }
  assertString(value.type, `${path}.type`);
  if (value.type === 'object' && value.properties !== undefined && !isRecord(value.properties)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path}.properties must be an object.`);
  }
}

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
      throw new InitCommandError('REGISTRY_INVALID', `Duplicate plugin registry entry "${key}".`);
    }
    seen.add(key);
    return parsed;
  });

  return { schemaVersion: 1, plugins };
}

export function loadBuiltInPluginRegistry(): PluginRegistry {
  return parsePluginRegistry(builtInRegistry);
}

export function getPluginsByKind(
  registry: PluginRegistry,
  kind: PluginKind,
): PluginRegistryEntry[] {
  return registry.plugins.filter((plugin) => plugin.kind === kind);
}
