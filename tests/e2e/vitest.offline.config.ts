import { defineConfig } from 'vitest/config';
import config from './vitest.config';

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    include: [
      'src/cli-command.e2e.test.ts',
      'src/cms-config.e2e.test.ts',
      'src/helpers/case-loader.e2e.test.ts',
      'src/helpers/run-cli.e2e.test.ts',
      'src/sync-matrix-controls.e2e.test.ts',
    ],
    setupFiles: [],
  },
});
