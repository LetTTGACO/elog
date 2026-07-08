import inquirer from 'inquirer';
import { getPluginsByKind, InitCommandError } from './registry';
import type {
  ElogOptionSchema,
  ExportSelection,
  PluginRegistry,
  PluginRegistryEntry,
  PluginSelection,
  SelectedPlugin,
} from './types';

/** inquirer 问题的最小结构，测试不需要依赖 inquirer 的完整类型。 */
export interface InquirerQuestion {
  type: string;
  name: string;
  message: string;
  default?: unknown;
  choices?: Array<{ name: string; value: string }> | string[];
}

/** 插件选择向导选项，export 命令只允许单目标。 */
export interface PluginSelectionWizardOptions {
  targetSelection?: 'single' | 'multiple';
}

/** 将注册表条目转换为 inquirer choice，value 使用稳定插件 type。 */
export function buildPluginChoice(entry: PluginRegistryEntry): { name: string; value: string } {
  return { name: entry.displayName, value: entry.type };
}

/** 根据 schema 元数据推导 prompt 类型，敏感字段默认使用 password。 */
function promptType(schema: ElogOptionSchema): string {
  if (schema['x-elog-prompt']?.type) {
    return schema['x-elog-prompt'].type;
  }
  if (schema.enum) {
    return 'list';
  }
  if (schema.type === 'boolean') {
    return 'confirm';
  }
  if (schema.type === 'number') {
    return 'number';
  }
  return schema['x-elog-secret'] ? 'password' : 'input';
}

/** 根据插件 optionsSchema 生成可交互问题，隐藏字段不出现在 prompt 中。 */
export function buildOptionQuestions(entry: PluginRegistryEntry): InquirerQuestion[] {
  const properties = entry.optionsSchema.properties ?? {};
  return Object.entries(properties).flatMap(([name, schema]) => {
    if (schema['x-elog-hidden']) {
      return [];
    }
    const prompt = schema['x-elog-prompt'];
    return [
      {
        type: promptType(schema),
        name,
        message: prompt?.message ?? schema.title ?? name,
        default: schema.default,
        ...(schema.enum ? { choices: schema.enum.map(String) } : {}),
      },
    ];
  });
}

/** 在指定插件类型下查找用户选择的注册表条目。 */
function findPlugin(registry: PluginRegistry, kind: PluginRegistryEntry['kind'], type: string) {
  return getPluginsByKind(registry, kind).find((plugin) => plugin.type === type);
}

/** 合并隐藏字段默认值，保证未展示的配置仍能进入生成结果。 */
export function withHiddenDefaults(entry: PluginRegistryEntry, answers: Record<string, unknown>) {
  const properties = entry.optionsSchema.properties ?? {};
  return Object.fromEntries(
    Object.entries(properties)
      .map(([key, schema]) => [key, answers[key] ?? schema.default])
      .filter(([, value]) => value !== undefined),
  );
}

/** 询问单个插件的配置项，并返回带答案的选择结果。 */
async function askPluginOptions(entry: PluginRegistryEntry): Promise<SelectedPlugin> {
  const answers = (await inquirer.prompt(buildOptionQuestions(entry))) as Record<string, unknown>;
  return { entry, answers: withHiddenDefaults(entry, answers) };
}

/** 串行询问多个插件的配置，保持问题顺序与用户选择顺序一致。 */
async function askSelectedPluginOptions(entries: PluginRegistryEntry[]): Promise<SelectedPlugin[]> {
  const selected: SelectedPlugin[] = [];
  for (const entry of entries) {
    selected.push(await askPluginOptions(entry));
  }
  return selected;
}

/** checkbox 和 list 的答案形态不同，这里统一成数组方便后续查找。 */
function toSelectedTypes(answer: string | string[] | undefined): string[] {
  if (Array.isArray(answer)) {
    return answer;
  }
  return answer ? [answer] : [];
}

/** 运行 init/export 共用的插件选择向导，确保至少有一个来源和目标。 */
export async function runPluginSelectionWizard(
  registry: PluginRegistry,
  options: PluginSelectionWizardOptions = {},
): Promise<PluginSelection> {
  const targetSelection = options.targetSelection ?? 'multiple';
  // 来源插件是单选，因为一个工作流只能从一个平台下载文档。
  const fromAnswer = (await inquirer.prompt([
    {
      type: 'list',
      name: 'from',
      message: '你在哪里写文章？',
      choices: getPluginsByKind(registry, 'from').map(buildPluginChoice),
    },
  ])) as { from: string };
  const fromEntry = findPlugin(registry, 'from', fromAnswer.from);

  // init 支持多目标部署，export 需要单目标以便一次性导出语义清晰。
  const toAnswer = (await inquirer.prompt([
    {
      type: targetSelection === 'single' ? 'list' : 'checkbox',
      name: 'to',
      message: '你要发布到哪里？',
      choices: getPluginsByKind(registry, 'to').map(buildPluginChoice),
    },
  ])) as { to: string | string[] | undefined };
  const toEntries = toSelectedTypes(toAnswer.to).flatMap((type) => {
    const entry = findPlugin(registry, 'to', type);
    return entry ? [entry] : [];
  });

  const transformAnswer = (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'transforms',
      message: '是否处理图片？',
      choices: getPluginsByKind(registry, 'transform').map(buildPluginChoice),
    },
  ])) as { transforms: string[] };
  const transformEntries = transformAnswer.transforms.flatMap((type) => {
    const entry = findPlugin(registry, 'transform', type);
    return entry ? [entry] : [];
  });

  if (!fromEntry || toEntries.length === 0) {
    // 没有 from/to 的选择无法构成可运行工作流，必须在生成配置前失败。
    throw new InitCommandError(
      'PLUGIN_SELECTION_EMPTY',
      'Must select at least one source and one target plugin.',
    );
  }

  return {
    from: fromEntry,
    transforms: transformEntries,
    to: toEntries,
  };
}

/** export 命令复用选择向导，但会继续询问每个插件的运行时参数。 */
export async function runExportWizard(registry: PluginRegistry): Promise<ExportSelection> {
  const selection = await runPluginSelectionWizard(registry, { targetSelection: 'single' });
  const target = selection.to[0];

  if (!target) {
    // 这里再次校验目标，是为了保护未来向导逻辑变化时的 export 单目标约束。
    throw new InitCommandError(
      'PLUGIN_SELECTION_EMPTY',
      'Must select at least one source and one target plugin.',
    );
  }

  return {
    from: await askPluginOptions(selection.from),
    transforms: await askSelectedPluginOptions(selection.transforms),
    to: await askPluginOptions(target),
  };
}

/** 兼容命名导出，init 命令默认使用插件选择向导。 */
export const runInitWizard = runPluginSelectionWizard;
