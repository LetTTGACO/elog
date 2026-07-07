import type { RuntimeWorkflowConfig } from '../runtime/types';
import type { ConfigDiagnostic } from '../types/common';

/** 对已归一化配置做运行前校验，输出可展示的诊断而不是直接抛错。 */
export function validateRuntimeConfig(workflows: RuntimeWorkflowConfig[]): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];
  const seenIds = new Set<string>();

  workflows.forEach((workflow, index) => {
    const path = `workflows[${index}]`;

    if (typeof workflow.id !== 'string' || workflow.id.trim() === '') {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_INVALID_WORKFLOW_ID',
        message: 'Workflow id must be a non-empty string.',
        path: `${path}.id`,
      });
    } else if (seenIds.has(workflow.id)) {
      // 工作流 ID 会出现在结果和缓存上下文里，因此必须在运行前保证唯一。
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_DUPLICATE_WORKFLOW_ID',
        message: `Duplicate workflow id "${workflow.id}".`,
        path: `${path}.id`,
      });
    }
    if (typeof workflow.id === 'string' && workflow.id.trim() !== '') {
      seenIds.add(workflow.id);
    }

    if (!workflow.from || workflow.from.kind !== 'from') {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_MISSING_FROM',
        message: 'Workflow must provide exactly one from plugin.',
        path: `${path}.from`,
      });
    }

    if (!workflow.to.length || workflow.to.some((plugin) => !plugin || plugin.kind !== 'to')) {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_MISSING_TO',
        message: 'Workflow must provide at least one to plugin.',
        path: `${path}.to`,
      });
    }

    const hasInvalidTransform =
      !Array.isArray(workflow.transforms) ||
      workflow.transforms.some((plugin) => !plugin || plugin.kind !== 'transform');
    if (hasInvalidTransform) {
      // plugins 必须是 transform 数组，常见的单对象误配在这里给出明确诊断。
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_INVALID_TRANSFORM',
        message:
          'Transform plugins must be an array and every entry must declare kind "transform".',
        path: `${path}.plugins`,
      });
    }
  });

  return diagnostics;
}
