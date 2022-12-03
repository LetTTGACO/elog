import { defineConfig } from 'father';

export default defineConfig({
  cjs: {
    output: 'dist/cjs',
    sourcemap: true
  },
  esm: {
    output: 'dist/esm',
    sourcemap: true
  }
});
