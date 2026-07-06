# yuque-token-to-local

## 测试目的

这个 case 用来验证语雀 Token 登录下载、本地图床替换，以及本地 Markdown 部署的基础链路。

## 覆盖范围

- `fromYuque` 可以通过 Token、login 和 repo 读取指定语雀知识库。
- `imageLocal` 会把图片写入本地 `images` 目录并替换 Markdown 图片地址。
- `toLocal` 会生成带 Front Matter 的 Markdown。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_YUQUE_REPO` 指向稳定的语雀测试知识库。
- 知识库中至少保留一篇可下载文档。
- 至少一篇文档应包含图片，用来覆盖本地图床输出。

## 配置切换

图床切换点在 `tests/e2e/cases/yuque-token-to-local/elog.config.ts` 的 `e2eProfile.image`。

默认使用本地图床：

```ts
image: imageProfiles.local,
```

如果要关闭图床 transform，改成：

```ts
image: imageProfiles.none,
```

如果要切到 R2，改成：

```ts
image: imageProfiles.r2,
```

选择 R2 时，需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。R2 上传前缀在同一个文件的 `imageProfiles.r2.prefixKey` 里配置。

## 不覆盖

- 语雀密码登录路径；它由 `yuque-pwd-to-local` 覆盖。
- `pathFollowDoc` 的嵌套目录图片相对路径。
- 云图床上传。
