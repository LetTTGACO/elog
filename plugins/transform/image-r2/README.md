# @elog/plugin-transform-image-r2

Elog 1.0 的 Cloudflare R2 图片转换插件。它通过 R2 的 S3 兼容 API 上传 Markdown 正文和
指定文档属性中的图片，并将原始地址替换为公开访问地址。

## 安装

```bash
pnpm add @elog/plugin-transform-image-r2
```

## 基本配置

```ts
import imageR2 from '@elog/plugin-transform-image-r2';

const plugins = [
  imageR2({
    host: process.env.R2_PUBLIC_HOST,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    endpoint: process.env.R2_ENDPOINT,
    prefixKey: 'elog/images',
    propertyImageFields: ['cover'],
  }),
];
```

密钥建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置                  | 类型       | 默认值  | 说明                                          |
| --------------------- | ---------- | ------- | --------------------------------------------- |
| `host`                | `string`   | —       | Bucket 的公开访问根地址，必填                 |
| `accessKeyId`         | `string`   | —       | R2 API Token 的 Access Key ID，必填           |
| `secretAccessKey`     | `string`   | —       | R2 API Token 的 Secret Access Key，必填       |
| `bucket`              | `string`   | —       | R2 Bucket 名称，必填                          |
| `endpoint`            | `string`   | —       | R2 S3 API Endpoint，必填                      |
| `region`              | `string`   | `auto`  | S3 客户端 Region                              |
| `prefixKey`           | `string`   | `''`    | 对象路径前缀                                  |
| `propertyImageFields` | `string[]` | `[]`    | 同时处理的文档属性，例如 `cover`              |
| `limit`               | `number`   | `10`    | 并发处理图片的数量                            |
| `disable`             | `boolean`  | `false` | 跳过整个图片转换步骤                          |

`endpoint` 是 S3 API 地址，`host` 是浏览器最终访问图片的公开地址，两者不能互换。`host` 可以
包含或省略协议，插件默认补充 HTTPS；`prefixKey` 会规范为无开头斜杠、单个结尾斜杠。

## 地址与权限

`host` 可以是 R2 自定义域名、允许公开访问的开发地址，或指向 Bucket 根路径的其他 CDN 地址。
API Token 至少需要读取对象元信息和写入对象的权限，最终地址需要能够匿名读取图片。

## 转换行为

- 扫描 Markdown 正文中的图片，以及 `propertyImageFields` 指定的 URL 或 Data URL 属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 上传前通过 `HeadObject` 检查同一路径；已存在时直接复用公开地址。
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
