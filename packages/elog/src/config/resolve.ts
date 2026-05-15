import type { RawUserConfig, ResolveConfigResult } from '../types/common';
import { detectLegacyV0Config } from './adapters/legacy-v0';
import { isV1Config } from './adapters/v1';
import { normalizeV1Config } from './normalize';
import { validateRuntimeConfig } from './validate';

export function resolveConfig(raw: RawUserConfig): ResolveConfigResult {
  const legacy = detectLegacyV0Config(raw);
  if (legacy.handled) {
    return { workflows: [], diagnostics: legacy.diagnostics };
  }

  if (!isV1Config(raw)) {
    return {
      workflows: [],
      diagnostics: [
        {
          level: 'error',
          code: 'CONFIG_UNRECOGNIZED',
          message: 'Unable to recognize Elog config shape.',
        },
      ],
    };
  }

  const workflows = normalizeV1Config(raw).filter((workflow) => !workflow.disabled);
  const diagnostics = validateRuntimeConfig(workflows);

  return {
    workflows: diagnostics.some((diagnostic) => diagnostic.level === 'error') ? [] : workflows,
    diagnostics,
  };
}
