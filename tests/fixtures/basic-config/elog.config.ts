import { defineConfig, type ElogConfig } from '@elog/cli';
import { fromFixture, toFixture, transformFixture } from './plugins';

export default defineConfig({
  id: 'fixture',
  cacheFilePath: 'fixture.cache.json',
  from: fromFixture,
  plugins: [transformFixture],
  to: toFixture,
} satisfies ElogConfig);
