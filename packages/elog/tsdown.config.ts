import { defineConfig } from 'tsdown';

// 包构建配置保持 sourcemap，方便插件侧调试 ESM 输出。
export default defineConfig({
  sourcemap: true,
  // 当前包保持原始扩展名策略，避免改变现有 ESM 导入路径。
  fixedExtension: false,
});
