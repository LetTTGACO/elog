import type { ConfigDiagnostic } from '../../types/common';

/** 旧版配置适配器结果，handled 表示当前适配器已经识别该配置形态。 */
export interface LegacyAdapterResult {
  handled: boolean;
  diagnostics: ConfigDiagnostic[];
}

/** 运行时只需要判断对象边界，避免对未知配置做过深假设。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 识别 0.x 公共配置关键词，但暂不做自动迁移。 */
export function detectLegacyV0Config(raw: unknown): LegacyAdapterResult {
  if (!isRecord(raw)) {
    return { handled: false, diagnostics: [] };
  }

  const legacyKeys = ['write', 'deploy', 'image', 'platform'];
  // 命中任一旧字段即可认为需要迁移提示，避免混入 v1 运行时后行为不可预测。
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
          'Detected an Elog 0.x style config. Elog 1.0 uses the new plugin workflow; please rewrite this config with from, plugins, and to entries.',
      },
    ],
  };
}
