import type { ElogConfig } from '../../types/common';

/** 仅判断最外层是否为对象，后续字段合法性由 validateRuntimeConfig 负责。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 判断是否像 1.0 配置，允许单工作流或工作流数组两种入口。 */
export function isV1Config(raw: unknown): raw is ElogConfig | ElogConfig[] {
  if (Array.isArray(raw)) {
    return raw.every((item) => isRecord(item) && ('from' in item || 'to' in item));
  }

  return isRecord(raw) && ('from' in raw || 'to' in raw);
}
