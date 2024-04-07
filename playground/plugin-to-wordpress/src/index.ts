import type { IPlugin } from '@elogx-test/elog';
import WordPressDeploy from './WordPressDeploy';
import { WordPressConfig } from './types';

export default function toLocal(options: Partial<WordPressConfig>): IPlugin {
  return {
    name: 'to-wordpress',
    async deploy(docs) {
      const haloDeploy = new WordPressDeploy(options as WordPressConfig, this);
      await haloDeploy.deploy(docs);
    },
  };
}
