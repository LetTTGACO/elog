import type { ToPlugin } from '@elog/plugin-sdk';
import WordPressDeploy from './WordPressDeploy';
import type { WordPressConfig } from './types';

export default function toWordPress(options: Partial<WordPressConfig>): ToPlugin {
  return {
    name: 'to:wordpress',
    kind: 'to',
    plugins: options.plugins,
    async deploy(docs, ctx) {
      const wordPressDeploy = new WordPressDeploy(options as WordPressConfig, ctx);
      await wordPressDeploy.deploy(docs);
    },
  };
}
