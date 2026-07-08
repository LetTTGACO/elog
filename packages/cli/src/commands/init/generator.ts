import type {
  ElogOptionSchema,
  GeneratedInitFiles,
  InitSelection,
  PluginRegistryEntry,
  PluginSelection,
  SelectedPlugin,
} from './types';

export interface EnvValue {
  name: string;
  value: string;
}

/** 给多行对象字面量增加缩进，保证生成的配置文本保持可读。 */
function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n');
}

/** 生成配置时统一使用单引号风格，贴合仓库 Prettier 约定。 */
function quoteString(value: string): string {
  return JSON.stringify(value).replace(/"/g, "'");
}

/** 将 schema 默认值渲染为 TypeScript 字面量，仅覆盖 init 支持的简单类型。 */
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

/** 只从 object schema 中读取属性，其他 schema 类型没有可配置项。 */
function collectProperties(schema: ElogOptionSchema): Record<string, ElogOptionSchema> {
  return schema.type === 'object' && schema.properties ? schema.properties : {};
}

/** 为非交互选择生成默认答案，环境变量字段保留占位以写入 process.env。 */
function defaultAnswersForEntry(entry: PluginRegistryEntry): Record<string, unknown> {
  const properties = collectProperties(entry.optionsSchema);
  const entries = Object.entries(properties)
    .flatMap(([key, property]): Array<[string, unknown]> => {
      if (property['x-elog-env']) {
        return [[key, undefined]];
      }
      if ('default' in property) {
        return [[key, property.default]];
      }
      return [];
    })
    .filter(([key, value]) => {
      const property = properties[key];
      return property?.['x-elog-env'] || value !== undefined;
    });

  return Object.fromEntries(entries);
}

/** 区分已经携带 answers 的内部选择和只有注册表条目的公共选择。 */
function isInitSelection(selection: InitSelection | PluginSelection): selection is InitSelection {
  return 'entry' in selection.from;
}

/** 将公共选择补齐为内部选择，便于生成器复用同一套渲染逻辑。 */
function normalizeSelection(selection: InitSelection | PluginSelection): InitSelection {
  if (isInitSelection(selection)) {
    return selection;
  }

  return {
    from: selectedPluginFromEntry(selection.from),
    transforms: selection.transforms.map((entry) => selectedPluginFromEntry(entry)),
    to: selection.to.map((entry) => selectedPluginFromEntry(entry)),
  };
}

/** 把注册表条目包装为已选择插件，并填入默认答案。 */
function selectedPluginFromEntry(entry: PluginRegistryEntry): SelectedPlugin {
  return {
    entry,
    answers: defaultAnswersForEntry(entry),
  };
}

/** 根据插件 schema 和用户答案渲染插件配置对象。 */
export function renderObjectLiteral(
  answers: Record<string, unknown>,
  schema: ElogOptionSchema,
): string {
  const properties = collectProperties(schema);
  const lines = Object.entries(properties).flatMap(([key, property]) => {
    if (property['x-elog-env']) {
      // 环境变量字段不把敏感值写入配置文件，只引用 process.env。
      return [`  ${key}: process.env.${property['x-elog-env']},`];
    }
    const value = answers[key] ?? property.default;
    if (value === undefined) {
      return [];
    }
    return [`  ${key}: ${renderLiteral(value)},`];
  });

  if (lines.length === 0) {
    return '{}';
  }

  return ['{', ...lines, '}'].join('\n');
}

/** 渲染单个插件工厂调用，例如 notion({ token: process.env.NOTION_TOKEN })。 */
function renderPluginCall(plugin: SelectedPlugin): string {
  return `${plugin.entry.importName}(${renderObjectLiteral(plugin.answers, plugin.entry.optionsSchema)})`;
}

/** 多行插件调用在数组和对象属性中需要尾逗号，便于后续格式化和追加。 */
function addTrailingComma(text: string): string {
  const lines = text.split('\n');
  const lastIndex = lines.length - 1;
  lines[lastIndex] = `${lines[lastIndex]},`;
  return lines.join('\n');
}

/** 渲染插件数组，保持每个插件调用独立成块。 */
function renderPluginArray(plugins: SelectedPlugin[]): string {
  return [
    '[',
    plugins.map((plugin) => addTrailingComma(indent(renderPluginCall(plugin), 2))).join('\n'),
    ']',
  ].join('\n');
}

/** 把属性名和已渲染值拼接为 defineConfig 的对象属性。 */
function renderConfigProperty(name: string, value: string): string {
  const lines = indent(value, 2).split('\n');
  const [firstLine, ...restLines] = lines;
  return [`  ${name}: ${firstLine!.trimStart()}`, ...restLines].join('\n').concat(',');
}

/** 收集唯一插件导入，避免同一个包同时作为多个角色时重复 import。 */
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

/** 收集需要写入 .env 的字段，配置文件中只保留 process.env 引用。 */
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

/** 生成 .env 文本，includeValues=false 时可用于模板化输出。 */
export function renderEnvText(values: EnvValue[], includeValues = true): string {
  return values
    .map((entry) => `${entry.name}=${includeValues ? entry.value : ''}`)
    .join('\n')
    .concat(values.length ? '\n' : '');
}

/** 根据用户选择生成 init 需要写入的配置文件内容。 */
export function generateInitFiles(
  selectionInput: InitSelection | PluginSelection,
): GeneratedInitFiles {
  const selection = normalizeSelection(selectionInput);
  const imports = [
    "import { defineConfig } from '@elog/core';",
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
    // 没有转换插件时省略 plugins 字段，保持最小可用配置。
    configLines.push(renderConfigProperty('plugins', renderPluginArray(selection.transforms)));
  }

  const toValue =
    selection.to.length === 1
      ? renderPluginCall(selection.to[0]!)
      : renderPluginArray(selection.to);
  configLines.push(renderConfigProperty('to', toValue), '});', '');

  return {
    configText: configLines.join('\n'),
  };
}
