import { defineConfig } from '@elog/core';
import { fromFixture, toFixture, transformFixture } from './plugins';

export default defineConfig({
  id: 'fixture',
  cacheFilePath: 'fixture.cache.json',
  from: fromFixture,
  plugins: [transformFixture],
  to: toFixture,
});
