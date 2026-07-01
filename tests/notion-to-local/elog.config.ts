import { defineConfig } from '@elogx-test/elog';
import fromNotion from '@elogx-test/plugin-from-notion';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  id: 'notion-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
    databaseId: process.env.NOTION_DATABASE_ID,
    filter: {
      property: 'status',
      select: {
        equals: '已发布',
      },
    },
    catalog: false,
  }),
  plugins: [
    imageLocal({
      outputDir: './source/images',
      prefixKey: '/images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: './source/_posts',
    filename: 'title',
    frontMatter: {
      enable: true,
      include: [
        'categories',
        'tags',
        'title',
        'date',
        'updated',
        'permalink',
        'cover',
        'description',
      ],
    },
  }),
});
