# @elog/plugin-transform-image-local

Elog 1.0 的本地图片转换插件。它下载 Markdown 正文和指定文档属性中的图片，写入本地目录，
再把原始地址替换为本地相对路径。

## 安装

```bash
pnpm add @elog/plugin-transform-image-local
```

## 基本配置

将图片输出到项目根目录的 `images`，并让 `docs` 中的 Markdown 使用 `../images/*`：

```ts
import imageLocal from '@elog/plugin-transform-image-local';

const plugins = [
  imageLocal({
    outputDir: 'images',
    prefixKey: '../images',
    propertyImageFields: ['cover'],
  }),
];
```

## 配置项

| 配置                          | 类型       | 默认值  | 说明                                           |
| ----------------------------- | ---------- | ------- | ---------------------------------------------- |
| `outputDir`                   | `string`   | —       | 图片输出目录，必填                             |
| `prefixKey`                   | `string`   | `./`    | 写回正文或属性的图片路径前缀                   |
| `pathFollowDoc.enable`        | `boolean`  | `false` | 根据每篇文档的目录计算相对路径                 |
| `pathFollowDoc.docOutputDir`  | `string`   | —       | 文档部署目录，启用路径跟随时必填               |
| `propertyImageFields`         | `string[]` | `[]`    | 同时处理的文档属性，例如 `cover`               |
| `limit`                       | `number`   | `10`    | 并发下载和写入图片的数量                       |
| `disable`                     | `boolean`  | `false` | 跳过整个图片转换步骤                           |

`outputDir` 和 `pathFollowDoc.docOutputDir` 都相对于运行 `elog` 时的当前目录解析。

## 跟随文档目录

文档启用 `toLocal({ keepToc: true })` 时，可以让插件按每篇文档的 `docStructure` 自动计算图片
相对路径：

```ts
imageLocal({
  outputDir: 'images',
  pathFollowDoc: {
    enable: true,
    docOutputDir: 'docs',
  },
});
```

例如文档输出到 `docs/guide/start.md`、图片输出到 `images` 时，正文会得到
`../../images/<文件名>`。文档缺少目录信息时，插件会记录警告并回退到 `prefixKey`。

## 转换行为

- 扫描 Markdown 正文中的 `![alt](url)` 图片。
- `propertyImageFields` 只处理值为图片 URL 或 Data URL 的字符串属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 输出目录不存在时自动创建；同名文件会被覆盖。
- 只替换图片地址，不改变 `bodyType` 或其他文档内容。

图片插件应放在 `markdown-to-html` 等正文格式转换插件之前；HTML 正文中的 `<img>` 当前不会被
扫描。

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
