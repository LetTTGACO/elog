import fs from 'fs';
import type {
  FromPlugin,
  ToPlugin,
  TransformPlugin,
} from '../../../packages/elog/src/plugins/types';

export const fromFixture: FromPlugin = {
  name: 'from:fixture',
  kind: 'from',
  async download() {
    return {
      docDetailList: [
        {
          id: 'fixture-doc',
          title: 'Fixture Doc',
          updateTime: 1,
          body: 'fixture',
          properties: { title: 'Fixture Doc', urlname: 'fixture-doc' },
        },
      ],
      sortedDocList: [{ id: 'fixture-doc', updateTime: 1 }],
      docStatusMap: {
        'fixture-doc': { _updateIndex: -1, _status: 1 },
      },
    };
  },
};

export const transformFixture: TransformPlugin = {
  name: 'transform:fixture',
  kind: 'transform',
  async transform(docs) {
    return docs.map((doc) => ({ ...doc, body: `${doc.body}-transformed` }));
  },
};

export const toFixture: ToPlugin = {
  name: 'to:fixture',
  kind: 'to',
  deploy(docs) {
    fs.writeFileSync('fixture.output.txt', docs.map((doc) => doc.body).join('\n'), 'utf8');
  },
};
