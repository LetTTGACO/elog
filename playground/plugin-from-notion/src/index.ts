import type { IPlugin } from '@elogx-test/elog';
import type { NotionConfig } from './types';
import NotionClient from './NotionClient';

export default function yuque(options: Partial<NotionConfig>): IPlugin {
  return {
    name: 'from-notion',
    async down(this) {
      const notion = new NotionClient(options as NotionConfig, this);
      return notion.getDocDetailList();
    },
  };
}
