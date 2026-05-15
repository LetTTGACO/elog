import type { RuntimeWorkflowConfig } from '../runtime/types';
import type { ConfigDiagnostic } from '../types/common';

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

    const invalidTransform = workflow.transforms.find(
      (plugin) => !plugin || plugin.kind !== 'transform',
    );
    if (invalidTransform) {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_INVALID_TRANSFORM',
        message: 'Every transform plugin must declare kind "transform".',
        path: `${path}.plugins`,
      });
    }
  });

  return diagnostics;
}
