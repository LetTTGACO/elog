import type { RawUserConfig, ResolveConfigResult } from '../types/common';
import { detectLegacyV0Config } from './adapters/legacy-v0';
import { isV1Config } from './adapters/v1';
import { normalizeV1Config } from './normalize';
import { validateRuntimeConfig } from './validate';

/** 配置解析入口：先做版本识别，再归一化并输出诊断信息。 */
export function resolveConfig(raw: RawUserConfig): ResolveConfigResult {
  const legacy = detectLegacyV0Config(raw);
  // 0.x 配置只做识别和诊断，迁移命令未实现前不尝试猜测转换。
  if (legacy.handled) {
    return { workflows: [], diagnostics: legacy.diagnostics };
  }

  // 未知形态在进入运行时前拦截，避免插件阶段出现难以定位的 TypeError。
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

  const workflows = normalizeV1Config(raw);
  const diagnostics = validateRuntimeConfig(workflows);

  return {
    // 只要存在错误级诊断就不返回工作流，保证运行时拿到的配置已通过基础校验。
    workflows: diagnostics.some((diagnostic) => diagnostic.level === 'error') ? [] : workflows,
    diagnostics,
  };
}
