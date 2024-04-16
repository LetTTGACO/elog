import type { IPlugin } from '@elogx-test/elog';
import ConfluenceDeploy from './ConfluenceDeploy';
import type { ConfluenceConfig } from './types';

export default function toLocal(options: Partial<ConfluenceConfig>): IPlugin {
  return {
    name: 'to-confluence',
    async deploy(docs) {
      const confluenceDeploy = new ConfluenceDeploy(options as ConfluenceConfig, this);
      await confluenceDeploy.deploy(docs);
    },
  };
}
