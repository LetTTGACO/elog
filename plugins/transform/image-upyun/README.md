# @elog/plugin-transform-image-upyun

Elog 1.0 的又拍云图片转换插件。它把 Markdown 正文和指定文档属性中的图片上传到又拍云，
并将原始地址替换为配置的公开域名。

## 安装

```bash
pnpm add @elog/plugin-transform-image-upyun
```

## 基本配置

```ts
import imageUpyun from '@elog/plugin-transform-image-upyun';

const plugins = [
  imageUpyun({
    bucket: process.env.UPYUN_BUCKET,
    user: process.env.UPYUN_OPERATOR,
    password: process.env.UPYUN_PASSWORD,
    host: process.env.UPYUN_PUBLIC_HOST,
    prefixKey: 'elog/images',
    propertyImageFields: ['cover'],
  }),
];
```

操作员密码建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置                  | 类型       | 默认值                              | 说明                             |
| --------------------- | ---------- | ----------------------------------- | -------------------------------- |
| `bucket`              | `string`   | —                                   | 又拍云服务名，必填               |
| `user`                | `string`   | —                                   | 又拍云操作员名称，必填           |
| `password`            | `string`   | —                                   | 又拍云操作员密码，必填           |
| `host`                | `string`   | `http://<bucket>.test.upcdn.net`    | 完整公开域名                     |
| `prefixKey`           | `string`   | `''`                                | 文件路径前缀                     |
| `propertyImageFields` | `string[]` | `[]`                                | 同时处理的文档属性，例如 `cover` |
| `limit`               | `number`   | `10`                                | 并发处理图片的数量               |
| `disable`             | `boolean`  | `false`                             | 跳过整个图片转换步骤             |

`host` 不会被自动补充协议，建议填写不带结尾斜杠的完整 HTTPS 地址。
`prefixKey` 会自动去除首尾斜杠并保留一个结尾斜杠。

## 地址与权限

未配置 `host` 时，插件会记录警告并使用又拍云测试域名。生产站点应配置已经绑定服务的自定义
域名。操作员需要查询和上传目标路径的权限，最终域名需要能够公开访问上传后的文件。

## 转换行为

- 扫描 Markdown 正文中的图片，以及 `propertyImageFields` 指定的 URL 或 Data URL 属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 上传前通过 `headFile` 检查同一路径；已存在时直接复用公开地址。
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
