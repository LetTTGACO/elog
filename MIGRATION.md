# Elog 1.0 Migration Guide

## 1.0.0 Stable Support Matrix

`1.0.0` stable covers the highest-frequency sync path:

| Area | Stable support |
| --- | --- |
| From | `notion`, `yuque-token`, `yuque-pwd` |
| To | `local` |
| Image | `local`, `cos`, `oss`, `github`, `qiniu`, `upyun`, `r2`, `b2` |
| Core | multi-workflow, transform pipeline, multiple targets, incremental cache, `init`, `sync`, `export` |

In this repo, the matching image registry entry for `r2` is `image-r2`.
Anything outside this matrix may still exist in the repo, but it is not part of the `1.0.0` stable promise.

## What Changed From 0.x

Elog 1.0 uses a scoped config model:

- one source plugin under `from`
- zero or more transform plugins under `plugins`
- one or more deploy plugins under `to`

The old 0.x all-in-one config shape is not carried forward as a stable contract.

## Config Shape

```ts
// 0.x style
export default {
  write: {},
  deploy: {},
  image: {},
};
```

```ts
// 1.0 style
export default defineConfig({
  from: fromYuque({}),
  plugins: [imageLocal({})],
  to: toLocal({}),
});
```

`defineConfig()` is a typing helper only. The important migration is the shape:
source, transforms, and targets are separated on purpose.

## Notion -> Local

Use `from:notion` with `to:local` for the stable Notion export path.

- Keep the source settings on the `from` plugin.
- Put image rehosting or local rewrite logic in `plugins` if you need it.
- Keep local file output on `to:local`.

## Yuque Token -> Local

Use `from:yuque-token` with `to:local` for token-based Yuque exports.

- Move source credentials into the Yuque source plugin.
- Use `plugins` for image transforms when needed.
- Keep deployment simple with `to:local`.

## Yuque Password -> Local

Use `from:yuque-pwd` with `to:local` for password-based Yuque exports.

- This is still part of the stable matrix.
- The corresponding registry entry in this repo is `yuque-pwd`.
- Prefer env-backed config for secrets instead of embedding values inline.

## Image Transforms

Stable image transforms are plugin-based: `local`, `cos`, `oss`, `github`, `qiniu`, `upyun`, `r2`, and `b2`.

- `image.plugin` from 0.x does not map one-to-one to a single stable field.
- Use an official image transform plugin first.
- If you need custom behavior, write a custom transform plugin.

## Multi-Workflow Config

Elog 1.0 can run more than one workflow in a single config.

- Each workflow keeps its own source, transforms, and target set.
- Use this when you are migrating multiple 0.x configs into one workspace.
- Disabled workflows are preserved and skipped.

## Cache And Incremental Sync

Incremental sync is stable in 1.0.

- Cache is per workflow.
- Missing cache files start empty.
- Cache can be disabled when you need a full resync.
- No-change workflows skip deploy work.

## Extension Hook Migration

0.x extension hooks do not have a stable one-to-one migration.

- `formatExt`: move logic to a custom transform plugin.
- `imagePathExt`: move logic to a custom transform plugin or custom image plugin. Feishu Wiki-style dynamic local image paths are not a generic `image-local` option in `1.0.0`.
- `secretExt`: use env-backed JS config or a custom plugin.
- `image.plugin`: use an official image transform or a custom transform plugin.

## Unsupported In 1.0.0 Stable

These are out of scope for the stable promise:

- Feishu, FlowUs, Wolai, Outline source stability.
- Halo, WordPress, Confluence target stability.
- `clean`, `force`, `full-cache`, `upgrade`.
- local `html`, `html-highlight`, `wiki` outputs.

## Migration Checklist

- Move 0.x source settings into `from`.
- Move image handling into `plugins`.
- Move deployment settings into `to`.
- Keep only stable paths in the first 1.0.0 migration.
- Rewrite `formatExt`, `imagePathExt`, `secretExt`, and `image.plugin` logic into plugins or env-backed config.
- Do not assume unsupported sources, targets, or local output formats are part of the stable contract.
