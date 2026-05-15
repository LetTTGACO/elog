import { fromFixture, toFixture, transformFixture } from './plugins';

export default {
  id: 'fixture',
  cacheFilePath: 'fixture.cache.json',
  from: fromFixture,
  plugins: [transformFixture],
  to: toFixture,
};
