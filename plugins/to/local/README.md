# @elog/plugin-to-local

Elog 1.0 的本地部署插件。它将工作流中的每篇文档写入本地文件，可选生成 Front Matter，并可
按照来源插件提供的目录结构创建嵌套目录。

## 安装

```bash
pnpm add @elog/plugin-to-local
```

## 基本配置

```ts
import { defineConfig } from '@elog/core';
import fromNotion from '@elog/plugin-from-notion';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
  }),
  to: toLocal({
    outputDir: 'docs',
    frontMatter: {
      enable: true,
      exclude: ['status'],
    },
  }),
});
```

`outputDir` 相对于运行 `elog` 命令时的当前目录解析。同步后，文档会写入 `docs` 目录。

## 配置项

| 配置                      | 类型       | 默认值  | 说明                                      |
| ------------------------- | ---------- | ------- | ----------------------------------------- |
| `outputDir`               | `string`   | —       | 文档输出目录，必填                        |
| `filename`                | `string`   | `title` | 用作文件名的文档属性                      |
| `fileExt`                 | `string`   | `md`    | 文件扩展名，不包含点号                    |
| `keepToc`                 | `boolean`  | `false` | 根据 `docStructure` 创建嵌套目录          |
| `frontMatter.enable`      | `boolean`  | —       | 是否把文档属性写入 Front Matter           |
| `frontMatter.include`     | `string[]` | —       | 只保留指定的 Front Matter 属性            |
| `frontMatter.exclude`     | `string[]` | —       | 从 Front Matter 中排除指定属性            |
| `deployByStructure`       | `boolean`  | —       | 已废弃，请使用 `keepToc`                  |

`frontMatter.include` 与 `frontMatter.exclude` 只影响写入文件的属性，不会改变传给其他部署目标的
原始文档。用作文件名的属性始终保留。

## 按目录输出

来源插件可以通过 `docStructure` 为文档提供目录信息：

```ts
toLocal({
  outputDir: 'docs',
  keepToc: true,
});
```

开启后，插件按照 `docStructure` 中各项的 `title` 依次创建目录。如果文档没有目录信息，会
输出到 `outputDir` 根目录并记录警告。

## 文件名处理

- `filename` 对应属性为空时，使用 `未命名文档_<文档 ID>`。
- 文件名中的系统保留字符会替换为 `-`。
- 同一次部署中出现重复文件名时，后续文档会在文件名中追加文档 ID。
- `fileExt` 只控制扩展名，不会转换正文格式。

例如，先使用 `@elog/plugin-transform-markdown-to-html` 转换正文时，应同时设置：

```ts
toLocal({
  outputDir: 'dist',
  fileExt: 'html',
});
```

## Front Matter

不开启 `frontMatter.enable` 时，文件内容就是文档的 `body`。开启后，插件使用文档的
`properties` 生成 YAML Front Matter，并将正文放在其后。

通常只需要设置 `include` 或 `exclude` 其中一个：

```ts
toLocal({
  outputDir: 'docs',
  frontMatter: {
    enable: true,
    include: ['title', 'date', 'updated', 'tags'],
  },
});
```

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
