# @elog/plugin-transform-markdown-to-html

Elog 1.0 的 Markdown 转 HTML 插件。它使用 `markdown-it` 渲染正文，并通过 `highlight.js`
为代码块添加语法高亮标记。

## 安装

```bash
pnpm add @elog/plugin-transform-markdown-to-html
```

## 使用

将插件放入工作流的 `plugins` 数组。转换插件会按照声明顺序依次执行：

```ts
import { defineConfig } from '@elog/core';
import fromNotion from '@elog/plugin-from-notion';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
  }),
  plugins: [markdownToHtml()],
  to: toLocal({
    outputDir: 'dist',
    fileExt: 'html',
  }),
});
```

该插件目前没有配置项。

## 输入与输出

插件接受 `bodyType` 为 `markdown` 的文档；未设置 `bodyType` 时也按 Markdown 处理。如果收到
`html` 或 `confluence-wiki`，当前工作流会以插件错误结束，避免重复或错误转换。

转换成功后，每篇文档会包含：

```ts
{
  body: '<h1>...</h1>',
  bodyType: 'html',
  rawBody: '# ...',
  rawBodyType: 'markdown'
}
```

除上述正文字段外，文档 ID、属性和目录结构保持不变。

## 渲染行为

- 支持 Markdown 中的原生 HTML。
- 普通换行会转换为 `<br>`。
- 自动识别可链接的 URL。
- 代码块使用声明的语言高亮；未知语言回退为纯文本。
- 输出不会执行 HTML 安全清理。处理不可信内容时，应在部署前增加清理步骤。

部署插件不会自动根据 `bodyType` 改变文件扩展名。例如配合
`@elog/plugin-to-local` 使用时，需要显式设置 `fileExt: 'html'`。

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
