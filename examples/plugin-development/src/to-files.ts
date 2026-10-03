import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ToPlugin, TransformPlugin } from '@elog/plugin-sdk';

export interface ToFilesOptions {
  outputDir: string;
  plugins?: TransformPlugin[];
}

export default function toFiles(options: ToFilesOptions): ToPlugin {
  return {
    name: 'to:files',
    kind: 'to',
    plugins: options.plugins,
    async deploy(docs, ctx) {
      await mkdir(options.outputDir, { recursive: true });
      for (const doc of docs) {
        const bodyType = doc.bodyType ?? 'markdown';
        if (bodyType !== 'markdown') {
          ctx.logger.error(`to:files 需要 Markdown 正文，收到 ${bodyType}`);
        }
        // 稳定 ID 决定文件名，重跑时覆盖同一文件；编码避免 ID 成为目录路径。
        const filename = `${encodeURIComponent(doc.id)}.md`;
        await writeFile(path.join(options.outputDir, filename), doc.body, 'utf8');
        ctx.logger.info('写入文件', filename);
      }
    },
  };
}
