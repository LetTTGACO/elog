export type PluginKind = 'from' | 'to' | 'transform';

export type JsonSchemaPrimitiveType = 'object' | 'string' | 'number' | 'boolean' | 'array';

export interface ElogPromptMetadata {
  type?: 'input' | 'password' | 'confirm' | 'number' | 'list' | 'checkbox';
  message?: string;
  choices?: string[];
}

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

export interface PluginRegistryEntry {
  kind: PluginKind;
  type: string;
  displayName: string;
  packageName: string;
  importName: string;
  optionsSchema: ElogOptionSchema;
}

export interface PluginRegistry {
  schemaVersion: 1;
  plugins: PluginRegistryEntry[];
}

export interface SelectedPlugin {
  entry: PluginRegistryEntry;
  answers: Record<string, unknown>;
}

export interface PluginSelection {
  from: PluginRegistryEntry;
  transforms: PluginRegistryEntry[];
  to: PluginRegistryEntry[];
}

export interface InitSelection {
  from: SelectedPlugin;
  transforms: SelectedPlugin[];
  to: SelectedPlugin[];
}

export interface GeneratedInitFiles {
  configText: string;
}
