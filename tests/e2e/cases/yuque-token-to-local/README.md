# yuque-token-to-local

## 测试目的

这个 case 用来验证语雀 Token 登录下载、R2 图床替换，以及本地 Markdown 部署的基础链路。

## 覆盖范围

- `fromYuque` 可以通过 Token、login 和 repo 读取指定语雀知识库。
- `imageR2` 会把图片上传到 R2，并替换 Markdown 图片地址。
- `toLocal` 会生成带 Front Matter 的 Markdown。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_YUQUE_REPO` 指向稳定的语雀测试知识库。
- 知识库中至少保留一篇可下载文档。
- 至少一篇文档应包含图片，用来覆盖 R2 图床替换。
- R2 环境变量指向可写入的测试 bucket。

## 配置切换

默认图床是 R2。临时切换图床时，运行测试前设置 `ELOG_E2E_IMAGE`：

```bash
ELOG_E2E_IMAGE=local pnpm --dir tests/e2e run test:yuque-token-local
```

可选值包括 `local`、`r2`。图床选择点集中在 `tests/e2e/cases/yuque-token-to-local/elog.config.ts`：

```ts
image: selectImageProfile('r2'),
```

如果想固定默认图床，也可以直接改成对应 profile：

```ts
image: imageProfiles.local,
```

运行默认 R2 profile 时，需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。R2 上传前缀在同一个文件的 `imageProfiles.r2.prefixKey` 里配置。

## 不覆盖

- 语雀密码登录路径；它由 `yuque-pwd-to-local` 覆盖。
- `pathFollowDoc` 的嵌套目录图片相对路径。
- R2 以外的云图床矩阵。
- 本地图床作为手动切换 profile 保留，不是默认覆盖路径。
