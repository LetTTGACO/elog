# @elog/sdk-confluence

## 0.4.0-beta.9

### Patch Changes

- 1.下线同步转异步逻辑和依赖包@kaciras/deasync，走正常初始化逻辑 2.初始化增加字段，适配 Notion 按目录下载
- Updated dependencies
  - @elog/shared@0.4.0-beta.9
  - @elog/types@0.4.0-beta.9

## 0.4.0-beta.8

### Patch Changes

- 优化缓存文件体积
- Updated dependencies
  - @elog/shared@0.4.0-beta.8
  - @elog/types@0.4.0-beta.8

## 0.4.0-beta.7

### Patch Changes

- 修复 markdown 处理问题
- Updated dependencies
  - @elog/shared@0.4.0-beta.7
  - @elog/types@0.4.0-beta.7

## 0.4.0-beta.6

### Patch Changes

- 1.增加错误日志输出 2.增加 property 长度检测提醒
- Updated dependencies
  - @elog/shared@0.4.0-beta.6
  - @elog/types@0.4.0-beta.6

## 0.4.0-beta.5

### Patch Changes

- 修图图片下载问题
- Updated dependencies
  - @elog/shared@0.4.0-beta.5
  - @elog/types@0.4.0-beta.5

## 0.4.0-beta.4

### Patch Changes

- 修复语雀公式图和 uml 图片无法下载的问题
- Updated dependencies
  - @elog/shared@0.4.0-beta.4
  - @elog/types@0.4.0-beta.4

## 0.4.0-beta.3

### Patch Changes

- 取消高亮块处理
- Updated dependencies
  - @elog/shared@0.4.0-beta.3
  - @elog/types@0.4.0-beta.3

## 0.4.0-beta.2

### Patch Changes

- 1. notion 配置参数变更
  2. notion 支持自定义筛选和排序
  3. notion 支持生成目录配置
- Updated dependencies
  - @elog/shared@0.4.0-beta.2
  - @elog/types@0.4.0-beta.2

## 0.4.0-beta.1

### Patch Changes

- elog init 逻辑调整
- Updated dependencies
  - @elog/shared@0.4.0-beta.1
  - @elog/types@0.4.0-beta.1

## 0.4.0-beta.0

### Minor Changes

- 1.Elog 参数格式调整
- 2.增加 Html 文档处理适配器
- 3.支持自定义文档处理适配器
- 4.图床支持拓展点获取密钥
- 5.语雀特殊字符处理迁移到 yuque-sdk 中去

### Patch Changes

- Updated dependencies
  - @elog/shared@0.4.0-beta.0
  - @elog/types@0.4.0-beta.0

## 0.3.0

### Feature:

- 🔥 文章详情增加目录信息
- 🔥 wiki 适配器
- 🔥 OSS 图床支持拓展点获取密钥
- 🔥 elog-cache.json 结构变更

### Bugs Fix:

- 🐞 修复语雀不可见字符的替换
- 🐞 修复不可见文章的目录为空的问题

## 0.3.0-beta.8

### Patch Changes

- 1. 修复不可见字符
  2. 调整构建逻辑
- Updated dependencies
  - @elog/shared@0.3.0-beta.8
