import type { FromPlugin } from '@elogx-test/elog';
import type { NotionConfig } from './types';
import NotionClient from './NotionClient';

export default function notion(options: Partial<NotionConfig>): FromPlugin {
  return {
    name: 'from:notion',
    kind: 'from',
    async download(ctx) {
      const notion = new NotionClient(options as NotionConfig, ctx);
      return notion.getDocDetailList();
    },
  };
}
