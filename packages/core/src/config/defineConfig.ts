import type { ElogConfig } from '../types/common';

/** 仅提供类型约束和编辑器提示，不在运行时改变用户配置。 */
export function defineConfig(config: ElogConfig | ElogConfig[]) {
  return config;
}
