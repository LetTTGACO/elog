import type { TransformPlugin } from '@elog/plugin-sdk';

export default function appendFooter(footer: string): TransformPlugin {
  return {
    name: 'transform:append-footer',
    kind: 'transform',
    async transform(docs) {
      return docs.map((doc) => ({ ...doc, body: `${doc.body}\n\n${footer}` }));
    },
  };
}
