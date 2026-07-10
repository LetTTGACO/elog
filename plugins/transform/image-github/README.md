# @elog/plugin-transform-image-github

Elog 1.0 的 GitHub 图片转换插件。它通过 GitHub Contents API 把 Markdown 正文和指定文档属性
中的图片提交到仓库，并将原始地址替换为 GitHub Raw 或 CDN 地址。

## 安装

```bash
pnpm add @elog/plugin-transform-image-github
```

## 基本配置

```ts
import imageGithub from '@elog/plugin-transform-image-github';

const plugins = [
  imageGithub({
    user: process.env.GITHUB_USER,
    repo: process.env.GITHUB_REPO,
    token: process.env.GITHUB_TOKEN,
    branch: 'main',
    prefixKey: 'images',
    host: 'https://cdn.jsdelivr.net',
    propertyImageFields: ['cover'],
  }),
];
```

Token 建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置                  | 类型       | 默认值                          | 说明                                      |
| --------------------- | ---------- | -------------------------------- | ----------------------------------------- |
| `user`                | `string`   | —                                | GitHub 用户或组织名，必填                 |
| `repo`                | `string`   | —                                | 保存图片的仓库名，必填                    |
| `token`               | `string`   | —                                | 具备仓库 Contents 写权限的 Token，必填    |
| `branch`              | `string`   | `master`                         | 图片提交到的分支                          |
| `host`                | `string`   | GitHub `download_url`            | 可选 CDN 地址                             |
| `prefixKey`           | `string`   | `''`                             | 仓库内的图片目录前缀                      |
| `propertyImageFields` | `string[]` | `[]`                             | 同时处理的文档属性，例如 `cover`          |
| `disable`             | `boolean`  | `false`                          | 跳过整个图片转换步骤                      |

GitHub 上传固定使用 3 个并发请求，以降低 Contents API 并发提交冲突。`prefixKey` 会自动去除首尾
斜杠并保留一个结尾斜杠。

## 地址与权限

未设置 `host` 时，插件使用 GitHub API 返回的 `download_url`。配置包含
`cdn.jsdelivr.net` 的地址时，插件会生成 jsDelivr 的 `/gh/<user>/<repo>/...` 地址。

Token 必须能够读取和写入目标仓库内容。私有仓库的 Raw 地址或公共 CDN 地址不一定能匿名
访问；用于公开站点时，应确认最终图片 URL 在未登录状态下可用。

## 转换行为

- 扫描 Markdown 正文中的图片，以及 `propertyImageFields` 指定的 URL 或 Data URL 属性。
- 根据原始地址生成稳定的哈希文件名，并自动识别图片扩展名。
- 上传前读取仓库中的同一路径；已存在时直接复用下载地址。
- 每张新图片产生一次提交，提交信息为 `Upload by elog`。
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
