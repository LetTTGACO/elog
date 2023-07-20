# @elog/sdk-flowus

## 0.6.0-beta.0

### Minor Changes

- elog sync 支持强制同步

### Patch Changes

- Updated dependencies
  - @elog/shared@0.6.0-beta.0

## 0.5.0

### Minor Changes

- f25384d: 1. 写作平台支持 FlowUs 2. 构建工具改为 tsup 3. Elog sync 支持 debug 模式 4. 日志输出格式统一
- - 🔥 写作平台支持 FlowUs
  - 🔥 Elog sync 支持 debug 模式
  - 🐞 修复 flowus 生成 front-matter 时的处理问题
  - 🐞 修复 confluence wiki 语言映射
  - 🐞 修复 md2confluence 时无序/有序缩紧列表的问题
  - 🐞 由于 unified 库的 md 处理问题，在 sdk-yuque 中下线此库的相关处理逻辑
  - 🐞 修复运行时找不到 package.json 的问题
  - 🐞 修复 elog init FlowUs 模版字段错误的问题
  - 🍻 放开 request 的超时时间，支持自定义超时时间
  - 🍻 升级 flowus-sdk 版本到 0.0.1-beta.3
  - 🍻 构建工具改为 tsup
  - 🍻 日志输出格式统一

### Patch Changes

- ba035ca: 1.修复 md2confluence 时无序/有序缩紧列表的问题
- 71aecf3: 升级 flowus-sdk 版本
- 8c31924: fix: 优化 flowus 的 front-matter 的处理
- fd793be: 修复 elog init 模版
- a391990: 去除 remark 库及相关依赖
- bac4967: 1.修复 md2confluence 时无序/有序缩紧列表的问题 2.notion title 表格属性不存在时，取默认
- 61ff3f4: confluence wiki 语言映射
- bd24292: 优化 request 的超时时间
- 268c906: 1.修复 md2confluence 时无序/有序缩紧列表的问题
- be521fe: 修复 pagkage.json 找不到的问题
- Updated dependencies [ba035ca]
- Updated dependencies [71aecf3]
- Updated dependencies [8c31924]
- Updated dependencies [f25384d]
- Updated dependencies [fd793be]
- Updated dependencies [a391990]
- Updated dependencies [bac4967]
- Updated dependencies [61ff3f4]
- Updated dependencies [bd24292]
- Updated dependencies [268c906]
- Updated dependencies
- Updated dependencies [be521fe]
  - @elog/shared@0.5.0

## 0.5.0-beta.10

### Patch Changes

- 优化 request 的超时时间
- Updated dependencies
  - @elog/shared@0.5.0-beta.10

## 0.5.0-beta.9

### Patch Changes

- 升级 flowus-sdk 版本
- Updated dependencies
  - @elog/shared@0.5.0-beta.9

## 0.5.0-beta.8

### Patch Changes

- fix: 优化 flowus 的 front-matter 的处理
- Updated dependencies
  - @elog/shared@0.5.0-beta.8

## 0.5.0-beta.7

### Patch Changes

- confluence wiki 语言映射
- Updated dependencies
  - @elog/shared@0.5.0-beta.7

## 0.5.0-beta.6

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题
- Updated dependencies
  - @elog/shared@0.5.0-beta.6

## 0.5.0-beta.5

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题
- Updated dependencies
  - @elog/shared@0.5.0-beta.5

## 0.5.0-beta.4

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题 2.notion title 表格属性不存在时，取默认
- Updated dependencies
  - @elog/shared@0.5.0-beta.4

## 0.5.0-beta.3

### Patch Changes

- 去除 remark 库及相关依赖
- Updated dependencies
  - @elog/shared@0.5.0-beta.3

## 0.5.0-beta.2

### Patch Changes

- 修复 pagkage.json 找不到的问题
- Updated dependencies
  - @elog/shared@0.5.0-beta.2

## 0.5.0-beta.1

### Patch Changes

- 修复 elog init 模版
- Updated dependencies
  - @elog/shared@0.5.0-beta.1

## 0.5.0-beta.0

### Minor Changes

- 1. 写作平台支持 FlowUs
  2. 构建工具改为 tsup
  3. Elog sync 支持 debug 模式
  4. 日志输出格式统一

### Patch Changes

- Updated dependencies
  - @elog/shared@0.5.0-beta.0
