# @elog/plugin-transform-image-b2

Elog 1.0 的 Backblaze B2 图片转换插件。它把 Markdown 正文和指定文档属性中的图片上传到
指定 B2 Bucket，并将原始地址替换为公开访问地址。

## 安装

```bash
pnpm add @elog/plugin-transform-image-b2
```

## 基本配置

```ts
import imageB2 from '@elog/plugin-transform-image-b2';

const plugins = [
  imageB2({
    host: process.env.B2_PUBLIC_HOST,
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    bucket: process.env.B2_BUCKET,
    prefixKey: 'elog/images',
    propertyImageFields: ['cover'],
  }),
];
```

密钥建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置                  | 类型       | 默认值  | 说明                                           |
| --------------------- | ---------- | ------- | ---------------------------------------------- |
| `host`                | `string`   | —       | Bucket 的公开访问根地址，必填                  |
| `applicationKeyId`    | `string`   | —       | Backblaze Application Key ID，必填             |
| `applicationKey`      | `string`   | —       | Backblaze Application Key，必填                |
| `bucket`              | `string`   | —       | B2 Bucket 名称，必填                           |
| `prefixKey`           | `string`   | `''`    | 文件路径前缀                                   |
| `propertyImageFields` | `string[]` | `[]`    | 同时处理的文档属性，例如 `cover`               |
| `limit`               | `number`   | `10`    | 并发处理图片的数量                             |
| `disable`             | `boolean`  | `false` | 跳过整个图片转换步骤                           |

`host` 可以包含或省略协议，插件默认补充 HTTPS。它必须指向 Bucket 根路径，例如 Backblaze 下载
地址中的 `/file/<bucket>`，或等价的自定义 CDN 根地址。`prefixKey` 会规范为无开头斜杠、单个
结尾斜杠。

## 地址与权限

插件启动时会授权并按名称查找 Bucket。Application Key 需要查询 Bucket、列出文件和上传文件
所需的权限。Bucket 或自定义 CDN 还需要允许最终图片地址被匿名访问。

## 转换行为

- 扫描 Markdown 正文中的图片，以及 `propertyImageFields` 指定的 URL 或 Data URL 属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 上传前按完整对象路径查找同名文件；已存在时直接复用公开地址。
- 上传时为常见图片格式设置对应的 Content-Type。
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
