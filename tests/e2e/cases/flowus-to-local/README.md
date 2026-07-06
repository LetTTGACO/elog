# flowus-to-local

## 测试目的

这个 case 用来保留 FlowUs 下载到本地 Markdown 的手动回归覆盖。FlowUs 真实平台路径目前受会员能力影响，所以它是可选 e2e，不应作为必跑维护面。

## 覆盖范围

- `fromFlowUs` 可以读取指定多维表页面。
- 默认 profile 使用本地图床，并检查图片文件不会出现重复扩展名。
- 可手动切换到 R2 图床，检查 Markdown 中出现 R2 host 且不再保留 FlowUs 图片域名。
- `toLocal` 会生成本地 Markdown。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_FLOWUS_TABLE_PAGE_ID` 指向一个可访问的 FlowUs 多维表。
- 表中至少保留一篇可下载文档。
- 本地图床或 R2 profile 的图片断言需要至少一篇文档包含图片。

## 配置切换

图床切换点在 `tests/e2e/cases/flowus-to-local/elog.config.ts` 的 `e2eProfile.image`：

默认使用本地图床：

```ts
image: imageProfiles.local,
```

要切到 R2，改成：

```ts
image: imageProfiles.r2,
```

如果选择 R2，还必须提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。要改上传前缀，编辑同一个文件里的 `imageProfiles.r2.prefixKey`。

## 不覆盖

- FlowUs catalog 目录字段。
- FlowUs 会员限制本身。
- 所有云图床矩阵；这里只保留 local/R2 两条可切换路径。
