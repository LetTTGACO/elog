import type { ConfigDiagnostic } from '../../types/common';

export interface LegacyAdapterResult {
  handled: boolean;
  diagnostics: ConfigDiagnostic[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function detectLegacyV0Config(raw: unknown): LegacyAdapterResult {
  if (!isRecord(raw)) {
    return { handled: false, diagnostics: [] };
  }

  const legacyKeys = ['write', 'deploy', 'image', 'platform'];
  const matched = legacyKeys.some((key) => key in raw);

  if (!matched) {
    return { handled: false, diagnostics: [] };
  }

  return {
    handled: true,
    diagnostics: [
      {
        level: 'error',
        code: 'LEGACY_V0_CONFIG_DETECTED',
        message:
          'Detected an Elog 0.x style config. The 1.0 foundation can detect this format, but full migration support will be implemented by the migrate command.',
      },
    ],
  };
}
