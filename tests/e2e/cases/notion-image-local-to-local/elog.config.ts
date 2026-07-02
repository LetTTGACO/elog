import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  id: 'notion-image-local-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromNotion({
    token: process.env.ELOG_E2E_NOTION_TOKEN,
    dataSourceId: process.env.ELOG_E2E_NOTION_DATA_SOURCE_ID,
    catalog: false,
  }),
  plugins: [
    imageLocal({
      outputDir: './images',
      prefixKey: '../images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: './docs',
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
