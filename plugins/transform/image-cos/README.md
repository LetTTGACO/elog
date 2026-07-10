# @elog/plugin-transform-image-cos

Elog 1.0 的腾讯云 COS 图片转换插件。它把 Markdown 正文和指定文档属性中的图片上传到 COS，
并将原始地址替换为 COS 或自定义 CDN 地址。

## 安装

```bash
pnpm add @elog/plugin-transform-image-cos
```

## 基本配置

```ts
import imageCos from '@elog/plugin-transform-image-cos';

const plugins = [
  imageCos({
    secretId: process.env.COS_SECRET_ID,
    secretKey: process.env.COS_SECRET_KEY,
    bucket: process.env.COS_BUCKET,
    region: process.env.COS_REGION,
    host: process.env.COS_CDN_HOST,
    prefixKey: 'elog/images',
    propertyImageFields: ['cover'],
  }),
];
```

密钥建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置                  | 类型       | 默认值         | 说明                                      |
| --------------------- | ---------- | -------------- | ----------------------------------------- |
| `secretId`            | `string`   | —              | 腾讯云 SecretId，必填                     |
| `secretKey`           | `string`   | —              | 腾讯云 SecretKey，必填                    |
| `bucket`              | `string`   | —              | COS Bucket 名称，必填                     |
| `region`              | `string`   | —              | Bucket 所在地域，必填                     |
| `host`                | `string`   | COS 默认域名   | 自定义公开域名，不包含 `http(s)://`       |
| `prefixKey`           | `string`   | `''`           | COS 对象路径前缀                          |
| `propertyImageFields` | `string[]` | `[]`           | 同时处理的文档属性，例如 `cover`          |
| `limit`               | `number`   | `10`           | 并发处理图片的数量                        |
| `disable`             | `boolean`  | `false`        | 跳过整个图片转换步骤                      |

除上述字段外，也可以传入 `cos-nodejs-sdk-v5` 支持的客户端选项。`prefixKey` 会自动去除首尾
斜杠并保留一个结尾斜杠。

## 地址与权限

未设置 `host` 时，插件使用 COS 默认公开地址；设置后生成
`https://<host>/<prefixKey><文件名>`。自定义域名应直接填写 `cdn.example.com`，不要包含协议。

凭证至少需要检查和写入目标对象的权限。生成的地址还需要 Bucket 公开读取，或由配置的 CDN
域名提供读取能力。

## 转换行为

- 扫描 Markdown 正文中的图片，以及 `propertyImageFields` 指定的 URL 或 Data URL 属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 上传前通过 COS `headObject` 检查同一路径；已存在时直接复用公开地址。
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
