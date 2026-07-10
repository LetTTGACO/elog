# @elog/plugin-transform-image-qiniu

Elog 1.0 的七牛云图片转换插件。它把 Markdown 正文和指定文档属性中的图片上传到七牛云
对象存储，并将原始地址替换为配置的公开域名。

## 安装

```bash
pnpm add @elog/plugin-transform-image-qiniu
```

## 基本配置

```ts
import imageQiniu from '@elog/plugin-transform-image-qiniu';

const plugins = [
  imageQiniu({
    secretId: process.env.QINIU_ACCESS_KEY,
    secretKey: process.env.QINIU_SECRET_KEY,
    bucket: process.env.QINIU_BUCKET,
    region: process.env.QINIU_REGION,
    host: process.env.QINIU_PUBLIC_HOST,
    prefixKey: 'elog/images',
    propertyImageFields: ['cover'],
  }),
];
```

密钥建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置                  | 类型       | 默认值  | 说明                                         |
| --------------------- | ---------- | ------- | -------------------------------------------- |
| `secretId`            | `string`   | —       | 七牛云 Access Key，必填                      |
| `secretKey`           | `string`   | —       | 七牛云 Secret Key，必填                      |
| `bucket`              | `string`   | —       | 存储空间名称，必填                           |
| `region`              | `string`   | —       | 七牛 Node SDK 的存储区域键，必填             |
| `host`                | `string`   | —       | 完整公开域名，必填                           |
| `prefixKey`           | `string`   | `''`    | 对象路径前缀                                 |
| `propertyImageFields` | `string[]` | `[]`    | 同时处理的文档属性，例如 `cover`             |
| `limit`               | `number`   | `10`    | 并发处理图片的数量                           |
| `disable`             | `boolean`  | `false` | 跳过整个图片转换步骤                         |

`host` 不会被自动补充协议，建议填写不带结尾斜杠的完整地址，例如 `https://img.example.com`。
`prefixKey` 会自动去除首尾斜杠并保留一个结尾斜杠。

## 地址与权限

插件使用 `host` 拼接最终地址：`<host>/<prefixKey><文件名>`。凭证需要读取对象状态和上传对象的
权限，公开域名需要能够匿名访问目标空间中的文件。

## 转换行为

- 扫描 Markdown 正文中的图片，以及 `propertyImageFields` 指定的 URL 或 Data URL 属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 上传前检查同一路径是否存在；已存在时直接复用公开地址。
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
