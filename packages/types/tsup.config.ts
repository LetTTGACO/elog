import { defineConfig } from 'tsup'

export default defineConfig({
  // 入口文件 或者可以使用 entryPoints 底层是 esbuild
  entry: ['src/index.ts'],
  // 生成类型文件 xxx.d.ts
  dts: {
    only: true,
  },
  // 每次打包先删除dist
  clean: true,
})
