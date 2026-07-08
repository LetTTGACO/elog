import { defineConfig } from 'vitest/config';

// 核心包测试运行在 Node 环境，覆盖 CLI、配置、运行时和插件契约。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
