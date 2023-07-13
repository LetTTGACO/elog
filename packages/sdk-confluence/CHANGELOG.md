# @elog/sdk-confluence

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
  - @elog/types@0.5.0

## 0.5.0-beta.10

### Patch Changes

- 优化 request 的超时时间
- Updated dependencies
  - @elog/shared@0.5.0-beta.10
  - @elog/types@0.5.0-beta.10

## 0.5.0-beta.9

### Patch Changes

- 升级 flowus-sdk 版本
- Updated dependencies
  - @elog/shared@0.5.0-beta.9
  - @elog/types@0.5.0-beta.9

## 0.5.0-beta.8

### Patch Changes

- fix: 优化 flowus 的 front-matter 的处理
- Updated dependencies
  - @elog/shared@0.5.0-beta.8
  - @elog/types@0.5.0-beta.8

## 0.5.0-beta.7

### Patch Changes

- confluence wiki 语言映射
- Updated dependencies
  - @elog/shared@0.5.0-beta.7
  - @elog/types@0.5.0-beta.7

## 0.5.0-beta.6

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题
- Updated dependencies
  - @elog/shared@0.5.0-beta.6
  - @elog/types@0.5.0-beta.6

## 0.5.0-beta.5

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题
- Updated dependencies
  - @elog/shared@0.5.0-beta.5
  - @elog/types@0.5.0-beta.5

## 0.5.0-beta.4

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题 2.notion title 表格属性不存在时，取默认
- Updated dependencies
  - @elog/shared@0.5.0-beta.4
  - @elog/types@0.5.0-beta.4

## 0.5.0-beta.3

### Patch Changes

- 去除 remark 库及相关依赖
- Updated dependencies
  - @elog/shared@0.5.0-beta.3
  - @elog/types@0.5.0-beta.3

## 0.5.0-beta.2

### Patch Changes

- 修复 pagkage.json 找不到的问题
- Updated dependencies
  - @elog/shared@0.5.0-beta.2
  - @elog/types@0.5.0-beta.2

## 0.5.0-beta.1

### Patch Changes

- 修复 elog init 模版
- Updated dependencies
  - @elog/shared@0.5.0-beta.1
  - @elog/types@0.5.0-beta.1

## 0.5.0-beta.0

### Minor Changes

- 1. 写作平台支持 FlowUs
  2. 构建工具改为 tsup
  3. Elog sync 支持 debug 模式
  4. 日志输出格式统一

### Patch Changes

- Updated dependencies
  - @elog/shared@0.5.0-beta.0
  - @elog/types@0.5.0-beta.0

## 0.4.3

### Patch Changes

- 修复 Front Matter 中字符超长问题
- dc21449: 修复 Front Matter 中字符超长问题
- Updated dependencies
- Updated dependencies [dc21449]
  - @elog/shared@0.4.3
  - @elog/types@0.4.3

## 0.4.3-beta.0

### Patch Changes

- 修复 Front Matter 中字符超长问题
- Updated dependencies
  - @elog/shared@0.4.3-beta.0
  - @elog/types@0.4.3-beta.0

## 0.4.2

### Patch Changes

- 锁定 notion-to-md 版本号
- a6d7495: 文档 front matter 生成失败时跳过
- Updated dependencies
- Updated dependencies [a6d7495]
  - @elog/shared@0.4.2
  - @elog/types@0.4.2

## 0.4.2-beta.0

### Patch Changes

- 文档 front matter 生成失败时跳过
- Updated dependencies
  - @elog/shared@0.4.2-beta.0
  - @elog/types@0.4.2-beta.0

## 0.4.1

### Patch Changes

- 修复 Notion 数据分页问题
- Updated dependencies
  - @elog/shared@0.4.1
  - @elog/types@0.4.1

## 0.4.0

### Minor Changes

- 905b5d5: 1.Elog 参数格式调整 2.增加 Html 文档处理适配器 3.支持自定义文档处理适配器 4.图床支持拓展点获取密钥 5.语雀特殊字符处理迁移到 yuque-sdk 中去

### Patch Changes

- feb4e0d: 1.下线同步转异步逻辑和依赖包@kaciras/deasync，走正常初始化逻辑 2.初始化增加字段，适配 Notion 按目录下载
- ab2d526: elog init 逻辑调整
- 0.4.0
- 848ed73: 修图图片下载问题
- 99fa8d2: 1.增加错误日志输出 2.增加 property 长度检测提醒
- a76af3b: 优化缓存文件体积
- 140d1c3: 1. notion 配置参数变更 2. notion 支持自定义筛选和排序 3. notion 支持生成目录配置
- ed24e95: 修复 markdown 处理问题
- 1461b0a: 1.调整 elog 初始化配置 2.调整 notion 配置项逻辑
- d9926e6: 取消高亮块处理
- 74d9b04: 修复语雀公式图和 uml 图片无法下载的问题
- Updated dependencies [905b5d5]
- Updated dependencies [feb4e0d]
- Updated dependencies [ab2d526]
- Updated dependencies
- Updated dependencies [848ed73]
- Updated dependencies [99fa8d2]
- Updated dependencies [a76af3b]
- Updated dependencies [140d1c3]
- Updated dependencies [ed24e95]
- Updated dependencies [1461b0a]
- Updated dependencies [d9926e6]
- Updated dependencies [74d9b04]
  - @elog/shared@0.4.0
  - @elog/types@0.4.0

## 0.4.0-beta.10

### Patch Changes

- 1.调整 elog 初始化配置 2.调整 notion 配置项逻辑
- Updated dependencies
  - @elog/shared@0.4.0-beta.10
  - @elog/types@0.4.0-beta.10

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
