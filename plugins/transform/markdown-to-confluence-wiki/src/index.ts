import type { TransformPlugin } from '@elog/plugin-sdk';
import { md2Wiki } from './WikiRender';

export default function markdownToConfluenceWiki(): TransformPlugin {
  return {
    name: 'transform:markdown-to-confluence-wiki',
    kind: 'transform',
    async transform(docs, ctx) {
      return docs.map((doc) => {
        const bodyType = doc.bodyType ?? 'markdown';
        if (bodyType !== 'markdown') {
          return ctx.logger.error(
            `transform:markdown-to-confluence-wiki expects Markdown body input, received ${bodyType}`,
          );
        }

        return {
          ...doc,
          body: md2Wiki(doc.body),
          bodyType: 'confluence-wiki',
        };
      });
    },
  };
}
