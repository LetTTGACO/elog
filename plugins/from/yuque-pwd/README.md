# @elog/plugin-from-yuque-pwd

Elog 1.0 的语雀账号密码来源插件。它登录语雀网页接口，读取指定知识库的目录和 Markdown
正文，适用于无法使用个人 Token 的场景。

> 该插件依赖语雀的非公开登录与网页接口。接口、验证码或登录策略变化都可能导致同步失效；
> 可以使用 Token 时优先选择 `@elog/plugin-from-yuque-token`。

## 安装

```bash
pnpm add @elog/plugin-from-yuque-pwd
```

## 基本配置

对于地址 `https://www.yuque.com/example-team/example-book`，`login` 是 `example-team`，
`repo` 是 `example-book`。

```ts
import { defineConfig } from '@elog/core';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromYuque({
    username: process.env.YUQUE_USERNAME,
    password: process.env.YUQUE_PASSWORD,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    onlyPublished: true,
  }),
  to: toLocal({
    outputDir: 'docs',
    keepToc: true,
    frontMatter: { enable: true },
  }),
});
```

账号和密码必须保存在不会提交到版本库的 env 文件中：

```dotenv
YUQUE_USERNAME=your-account
YUQUE_PASSWORD=your-password
YUQUE_LOGIN=example-team
YUQUE_REPO=example-book
```

```bash
pnpm exec elog sync --env .env
```

## 配置项

| 配置            | 类型      | 默认值                  | 说明                                  |
| --------------- | --------- | ----------------------- | ------------------------------------- |
| `username`      | `string`  | —                       | 语雀登录账号，必填                    |
| `password`      | `string`  | —                       | 语雀登录密码，必填                    |
| `login`         | `string`  | —                       | 用户或团队路径，必填                  |
| `repo`          | `string`  | —                       | 知识库路径，必填                      |
| `baseUrl`       | `string`  | `https://www.yuque.com` | 自定义语雀服务地址                    |
| `latexCode`     | `boolean` | `false`                 | 请求 Markdown 时保留 LaTeX 代码       |
| `linebreak`     | `boolean` | `false`                 | 请求 Markdown 时启用语雀换行选项      |
| `onlyPublic`    | `boolean` | `false`                 | 只同步公开文档                        |
| `onlyPublished` | `boolean` | `false`                 | 只同步已发布文档                      |
| `limit`         | `number`  | `10`                    | 并发下载文档详情的数量                |

缓存开关和缓存文件路径属于工作流配置，应写在 `defineConfig()` 顶层。

## 输出行为

- 登录成功后读取知识库目录和文档列表，登录 Cookie 只保存在当前进程内存中。
- 按知识库目录排序文档，并将分组路径写入 `docStructure`。
- 正文输出为 Markdown，并设置 `bodyType: 'markdown'`。
- 文档开头的 YAML Front Matter 会从正文移除并合并到 `properties`。
- 自动生成 `title`、`urlname`、`date` 和 `updated`，并保留封面与描述。
- `lakeboard`、`lakesheet` 和 `laketable` 等不支持的格式会跳过并记录警告。
- 文档列表会与工作流缓存比较，只下载新增、更新或上次失败的文档。

需要验证码、二次验证或其他交互式登录步骤的账号可能无法使用本插件。正文图片地址会原样保留；
需要长期保存图片时，建议在部署前增加图片转换插件。

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
