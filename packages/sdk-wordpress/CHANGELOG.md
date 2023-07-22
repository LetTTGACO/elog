# @elog/sdk-wordpress

## 0.7.0-beta.1

### Patch Changes

- 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
- Updated dependencies
  - @elog/shared@0.7.0-beta.1
  - @elog/types@0.7.0-beta.1

## 0.7.0-beta.0

### Minor Changes

- 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度

### Patch Changes

- Updated dependencies
  - @elog/shared@0.7.0-beta.0
  - @elog/types@0.7.0-beta.0

## 0.6.0

### Patch Changes

- 170762c: 1.新增同步文档到 WordPress 站点
- 1.支持同步到 WordPress 站点

  2.支持通过帐号密码的方式同步语雀文档

  3.Elog 支持强制同步

  4.文档下载并发调整为 3，且增加并发数配置，可手动调整下载并发

  5.优化 debug 输出

  6.elog sync 拓展配置

- 5dd5bac: 1.分类/标签创建失败时不影响运行 2.优化 debug 输出
- 84e3960: 上传到 wordpress 时先将 md 转成 html
- 840b1ac: 文档下载并发调整为 3，且增加并发数配置，可手动调整下载并发
- 8432c0a: wordpress 增加代码高亮
- Updated dependencies [5f970b2]
- Updated dependencies [170762c]
- Updated dependencies [2b6baf0]
- Updated dependencies
- Updated dependencies [ca279b9]
- Updated dependencies [dc11c1c]
- Updated dependencies [5dd5bac]
- Updated dependencies [14dd166]
- Updated dependencies [84e3960]
- Updated dependencies [840b1ac]
- Updated dependencies [8432c0a]
  - @elog/shared@0.6.0
  - @elog/types@0.6.0

## 0.6.0-beta.9

### Patch Changes

- 文档下载并发调整为 3，且增加并发数配置，可手动调整下载并发
- Updated dependencies
  - @elog/shared@0.6.0-beta.9
  - @elog/types@0.6.0-beta.9

## 0.6.0-beta.8

### Patch Changes

- wordpress 增加代码高亮
- Updated dependencies
  - @elog/shared@0.6.0-beta.8
  - @elog/types@0.6.0-beta.8

## 0.6.0-beta.7

### Patch Changes

- 1.分类/标签创建失败时不影响运行 2.优化 debug 输出
- Updated dependencies
  - @elog/shared@0.6.0-beta.7
  - @elog/types@0.6.0-beta.7

## 0.6.0-beta.6

### Patch Changes

- 上传到 wordpress 时先将 md 转成 html
- Updated dependencies
  - @elog/shared@0.6.0-beta.6
  - @elog/types@0.6.0-beta.6

## 0.6.0-beta.5

### Patch Changes

- 1.新增同步文档到 WordPress 站点
- Updated dependencies
  - @elog/shared@0.6.0-beta.5
  - @elog/types@0.6.0-beta.5
