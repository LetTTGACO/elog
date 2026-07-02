import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

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
      prefixKey: './images',
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
