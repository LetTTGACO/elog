import { ElogConfig } from '../types/common';

/**
 * Type helper to make it easier to use elog.config.ts
 * accepts a direct {@link ElogConfig} object that returns it.
 */
export function defineConfig(config: ElogConfig | ElogConfig[]) {
  return config;
}
