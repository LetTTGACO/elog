import type { ElogConfig } from '../../types/common';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isV1Config(raw: unknown): raw is ElogConfig | ElogConfig[] {
  if (Array.isArray(raw)) {
    return raw.every((item) => isRecord(item) && ('from' in item || 'to' in item));
  }

  return isRecord(raw) && ('from' in raw || 'to' in raw);
}
