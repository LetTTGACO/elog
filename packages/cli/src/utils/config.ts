import { ElogConfig } from '@elog/core'

/**
 * Type helper to make it easier to use vite.config.ts
 * accepts a direct {@link ElogConfig} object, or a function that returns it.
 */
export function defineConfig(config: ElogConfig): ElogConfig {
  return config
}
