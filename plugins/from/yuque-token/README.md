# @elog/plugin-from-yuque-token

Elog 1.0 的语雀 Token 来源插件。它通过语雀开放 API 读取指定知识库的目录和文档，将正文
转换为 Markdown `DocDetail`。

## 安装

```bash
pnpm add @elog/plugin-from-yuque-token
```

## 准备语雀

使用前需要准备：

- `token`：语雀个人 Token，可在 `https://www.yuque.com/settings/tokens` 创建。
- `login`：知识库所属用户或团队的路径。
- `repo`：知识库路径。

对于地址 `https://www.yuque.com/example-team/example-book`，`login` 是 `example-team`，
`repo` 是 `example-book`。

## 基本配置

```ts
import { defineConfig } from '@elog/core';
import fromYuque from '@elog/plugin-from-yuque-token';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromYuque({
    token: process.env.YUQUE_TOKEN,
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

凭证建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置            | 类型      | 默认值                  | 说明                              |
| --------------- | --------- | ----------------------- | --------------------------------- |
| `token`         | `string`  | —                       | 语雀个人 Token，必填              |
| `login`         | `string`  | —                       | 用户或团队路径，必填              |
| `repo`          | `string`  | —                       | 知识库路径，必填                  |
| `baseUrl`       | `string`  | `https://www.yuque.com` | 自定义语雀服务地址                |
| `onlyPublic`    | `boolean` | `false`                 | 只同步公开文档                    |
| `onlyPublished` | `boolean` | `false`                 | 只同步已发布文档                  |
| `limit`         | `number`  | `10`                    | 并发下载文档详情的数量            |

缓存开关和缓存文件路径属于工作流配置，应写在 `defineConfig()` 顶层。

## 输出行为

- 按语雀知识库目录排序文档，并将分组路径写入 `docStructure`。
- 正文输出为 Markdown，并设置 `bodyType: 'markdown'`。
- 文档开头的 YAML Front Matter 会从正文移除并合并到 `properties`。
- 自动生成 `title`、`urlname`、`date` 和 `updated`，并保留封面与描述。
- 清理语雀正文中的不可见字符、隐藏内容和专用空锚点。
- `lakeboard`、`lakesheet` 和 `laketable` 等不支持的格式会跳过并记录警告。
- 文档列表会与工作流缓存比较，只下载新增、更新或上次失败的文档。

正文图片地址会原样保留。需要长期保存图片时，建议在部署前增加图片转换插件。

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
