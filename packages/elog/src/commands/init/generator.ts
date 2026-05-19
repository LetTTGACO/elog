import type {
  ElogOptionSchema,
  GeneratedInitFiles,
  InitSelection,
  PluginRegistryEntry,
  SelectedPlugin,
} from './types';

export interface EnvValue {
  name: string;
  value: string;
}

function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n');
}

function quoteString(value: string): string {
  return JSON.stringify(value).replace(/"/g, "'");
}

function renderLiteral(value: unknown): string {
  if (typeof value === 'string') {
    return quoteString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(renderLiteral).join(', ')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${renderLiteral(entryValue)}`)
      .join(', ');
    return `{ ${entries} }`;
  }
  return 'undefined';
}

function collectProperties(schema: ElogOptionSchema): Record<string, ElogOptionSchema> {
  return schema.type === 'object' && schema.properties ? schema.properties : {};
}

export function renderObjectLiteral(
  answers: Record<string, unknown>,
  schema: ElogOptionSchema,
): string {
  const properties = collectProperties(schema);
  const lines = Object.entries(properties).flatMap(([key, property]) => {
    const value = answers[key] ?? property.default;
    if (value === undefined) {
      return [];
    }
    if (property['x-elog-env']) {
      return [`  ${key}: process.env.${property['x-elog-env']},`];
    }
    return [`  ${key}: ${renderLiteral(value)},`];
  });

  if (lines.length === 0) {
    return '{}';
  }

  return ['{', ...lines, '}'].join('\n');
}

function renderPluginCall(plugin: SelectedPlugin): string {
  return `${plugin.entry.importName}(${renderObjectLiteral(plugin.answers, plugin.entry.optionsSchema)})`;
}

function addTrailingComma(text: string): string {
  const lines = text.split('\n');
  const lastIndex = lines.length - 1;
  lines[lastIndex] = `${lines[lastIndex]},`;
  return lines.join('\n');
}

function renderPluginArray(plugins: SelectedPlugin[]): string {
  return [
    '[',
    plugins.map((plugin) => addTrailingComma(indent(renderPluginCall(plugin), 2))).join('\n'),
    ']',
  ].join('\n');
}

function renderConfigProperty(name: string, value: string): string {
  const lines = indent(value, 2).split('\n');
  const [firstLine, ...restLines] = lines;
  return [`  ${name}: ${firstLine!.trimStart()}`, ...restLines].join('\n').concat(',');
}

function uniquePlugins(selection: InitSelection): PluginRegistryEntry[] {
  const plugins = [selection.from, ...selection.transforms, ...selection.to].map(
    (plugin) => plugin.entry,
  );
  const seen = new Set<string>();
  return plugins.filter((plugin) => {
    if (seen.has(plugin.packageName)) {
      return false;
    }
    seen.add(plugin.packageName);
    return true;
  });
}

export function collectEnvValues(selection: InitSelection): EnvValue[] {
  const selected = [selection.from, ...selection.transforms, ...selection.to];
  const values: EnvValue[] = [];

  for (const plugin of selected) {
    for (const [key, property] of Object.entries(collectProperties(plugin.entry.optionsSchema))) {
      const envName = property['x-elog-env'];
      if (!envName) {
        continue;
      }
      const value = plugin.answers[key];
      values.push({ name: envName, value: value === undefined ? '' : String(value) });
    }
  }

  return values;
}

export function renderEnvText(values: EnvValue[], includeValues = true): string {
  return values
    .map((entry) => `${entry.name}=${includeValues ? entry.value : ''}`)
    .join('\n')
    .concat(values.length ? '\n' : '');
}

export function generateInitFiles(selection: InitSelection): GeneratedInitFiles {
  const imports = [
    "import { defineConfig } from '@elogx-test/elog';",
    ...uniquePlugins(selection).map(
      (plugin) => `import ${plugin.importName} from '${plugin.packageName}';`,
    ),
  ];
  const configLines = [
    ...imports,
    '',
    'export default defineConfig({',
    renderConfigProperty('from', renderPluginCall(selection.from)),
  ];

  if (selection.transforms.length) {
    configLines.push(renderConfigProperty('plugins', renderPluginArray(selection.transforms)));
  }

  const toValue =
    selection.to.length === 1
      ? renderPluginCall(selection.to[0]!)
      : renderPluginArray(selection.to);
  configLines.push(renderConfigProperty('to', toValue), '});', '');

  const envValues = collectEnvValues(selection);

  return {
    configText: configLines.join('\n'),
    envText: renderEnvText(envValues),
    envExampleText: renderEnvText(envValues, false),
  };
}
