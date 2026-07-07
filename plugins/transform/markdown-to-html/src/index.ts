import type { TransformPlugin } from '@elog/plugin-sdk';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';

const renderer = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight(code: string, lang: string) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
});

export default function markdownToHtml(): TransformPlugin {
  return {
    name: 'transform:markdown-to-html',
    kind: 'transform',
    async transform(docs, ctx) {
      return docs.map((doc) => {
        const bodyType = doc.bodyType ?? 'markdown';
        if (bodyType !== 'markdown') {
          return ctx.logger.error(
            `transform:markdown-to-html expects Markdown body input, received ${bodyType}`,
          );
        }

        return {
          ...doc,
          body: renderer.render(doc.body),
          bodyType: 'html',
          rawBody: doc.body,
          rawBodyType: 'markdown',
        };
      });
    },
  };
}
