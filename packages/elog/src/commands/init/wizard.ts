import inquirer from 'inquirer';
import { getPluginsByKind, InitCommandError } from './registry';
import type {
  ElogOptionSchema,
  InitSelection,
  PluginRegistry,
  PluginRegistryEntry,
  SelectedPlugin,
} from './types';

export interface InquirerQuestion {
  type: string;
  name: string;
  message: string;
  default?: unknown;
  choices?: Array<{ name: string; value: string }> | string[];
}

export function buildPluginChoice(entry: PluginRegistryEntry): { name: string; value: string } {
  return { name: entry.displayName, value: entry.type };
}

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

function findPlugin(registry: PluginRegistry, kind: PluginRegistryEntry['kind'], type: string) {
  return getPluginsByKind(registry, kind).find((plugin) => plugin.type === type);
}

export function withHiddenDefaults(entry: PluginRegistryEntry, answers: Record<string, unknown>) {
  const properties = entry.optionsSchema.properties ?? {};
  return Object.fromEntries(
    Object.entries(properties)
      .map(([key, schema]) => [key, answers[key] ?? schema.default])
      .filter(([, value]) => value !== undefined),
  );
}

async function askPluginOptions(entry: PluginRegistryEntry): Promise<SelectedPlugin> {
  const answers = (await inquirer.prompt(buildOptionQuestions(entry))) as Record<string, unknown>;
  return { entry, answers: withHiddenDefaults(entry, answers) };
}

export async function runInitWizard(registry: PluginRegistry): Promise<InitSelection> {
  const fromAnswer = (await inquirer.prompt([
    {
      type: 'list',
      name: 'from',
      message: '你在哪里写文章？',
      choices: getPluginsByKind(registry, 'from').map(buildPluginChoice),
    },
  ])) as { from: string };
  const fromEntry = findPlugin(registry, 'from', fromAnswer.from);

  const toAnswer = (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'to',
      message: '你要发布到哪里？',
      choices: getPluginsByKind(registry, 'to').map(buildPluginChoice),
    },
  ])) as { to: string[] };
  const toEntries = toAnswer.to.flatMap((type) => {
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
    throw new InitCommandError(
      'PLUGIN_SELECTION_EMPTY',
      'Must select at least one source and one target plugin.',
    );
  }

  return {
    from: await askPluginOptions(fromEntry),
    transforms: await Promise.all(transformEntries.map(askPluginOptions)),
    to: await Promise.all(toEntries.map(askPluginOptions)),
  };
}
