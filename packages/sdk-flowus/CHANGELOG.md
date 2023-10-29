# @elog/sdk-flowus

## 0.9.0-beta.6

### Patch Changes

- 日志优化
- Updated dependencies
  - @elog/shared@0.9.0-beta.6

## 0.9.0-beta.5

### Patch Changes

- 去除调试参数
- Updated dependencies
  - @elog/shared@0.9.0-beta.5

## 0.9.0-beta.4

### Patch Changes

- init 图床参数变更
- Updated dependencies
  - @elog/shared@0.9.0-beta.4

## 0.9.0-beta.3

### Patch Changes

- 1.新增文档图片路径跟随文档路径（适用于多层级导出本地文档） 2.新增文档图片路径自定义拓展点
- Updated dependencies
  - @elog/shared@0.9.0-beta.3

## 0.9.0-beta.2

### Patch Changes

- 过滤语雀数据表文档类型
- Updated dependencies
  - @elog/shared@0.9.0-beta.2

## 0.9.0-beta.1

### Patch Changes

- 飞书依赖升级
- Updated dependencies
  - @elog/shared@0.9.0-beta.1

## 0.9.0-beta.0

### Minor Changes

- 1.飞书支持我的空间/知识库文档下载 2.飞书高亮块支持 emoji 3.飞书文档支持按层级下载 4.增加语雀参数校验 5.修复飞书云文档导出问题

### Patch Changes

- Updated dependencies
  - @elog/shared@0.9.0-beta.0

## 0.8.3

### Patch Changes

- 增加语雀 pwd 模式下的参数
  1.onlyPublic 只下载公开文档
  2.onlyPublished 只下载已发布文档
- Updated dependencies
  - @elog/shared@0.8.3

## 0.8.2

### Patch Changes

- 修复 github 上传失败时日志输出问题
- Updated dependencies
  - @elog/shared@0.8.2

## 0.8.1

### Patch Changes

- 增加添加 env 文件到 gitignore 的提示
- Updated dependencies
  - @elog/shared@0.8.1

## 0.8.0

### Minor Changes

- 9776e2a: 写作平台支持飞书云文档

### Patch Changes

- 173b4b2: 修复飞书标题生成缺失
- 写作平台支持飞书云文档
- 2d9ee98: 升级 feishux 相关库依赖
- Updated dependencies [173b4b2]
- Updated dependencies [9776e2a]
- Updated dependencies
- Updated dependencies [2d9ee98]
  - @elog/shared@0.8.0

## 0.8.0-beta.2

### Patch Changes

- 升级 feishux 相关库依赖
- Updated dependencies
  - @elog/shared@0.8.0-beta.2

## 0.8.0-beta.1

### Patch Changes

- 修复飞书标题生成缺失
- Updated dependencies
  - @elog/shared@0.8.0-beta.1

## 0.8.0-beta.0

### Minor Changes

- 写作平台支持飞书云文档

### Patch Changes

- Updated dependencies
  - @elog/shared@0.8.0-beta.0

## 0.7.3

### Patch Changes

- 1c2ee30: 1.修复 prefix 前缀路径 2.修复图床传参问题 3.优化 debug 输出
- 16ede90: 修复 github 图床和 os 上传问题
- 1.修复 prefix 前缀路径 2.修复图床上传问题 3.优化 debug 输出
- Updated dependencies [1c2ee30]
- Updated dependencies [16ede90]
- Updated dependencies
  - @elog/shared@0.7.3

## 0.7.3-beta.1

### Patch Changes

- 1.修复 prefix 前缀路径 2.修复图床传参问题 3.优化 debug 输出
- Updated dependencies
  - @elog/shared@0.7.3-beta.1

## 0.7.3-beta.0

### Patch Changes

- 修复 github 图床和 os 上传问题
- Updated dependencies
  - @elog/shared@0.7.3-beta.0

## 0.7.2

### Patch Changes

- db2936f: 优化图片下载问题
- 优化图片下载问题
- Updated dependencies [db2936f]
- Updated dependencies
  - @elog/shared@0.7.2

## 0.7.2-beta.0

### Patch Changes

- 优化图片下载问题
- Updated dependencies
  - @elog/shared@0.7.2-beta.0

## 0.7.1

### Patch Changes

- 修复爬取语雀目录时鉴权问题
- 64fe962: 1.修复爬取目录时鉴权问题
- Updated dependencies
- Updated dependencies [64fe962]
  - @elog/shared@0.7.1

## 0.7.1-beta.0

### Patch Changes

- 1.修复爬取目录时鉴权问题
- Updated dependencies
  - @elog/shared@0.7.1-beta.0

## 0.7.0

### Minor Changes

- 6cd3013: 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
- 1.不再通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，大幅提升二次同步速度 2.修复 elog clean 可能报错的问题

### Patch Changes

- f3f9c3b: 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
- 6127171: 1.去除 crypto 依赖，改用 node 内置 crypto 2.修复 elog clean 可能报错的问题
- Updated dependencies [6cd3013]
- Updated dependencies
- Updated dependencies [f3f9c3b]
- Updated dependencies [6127171]
  - @elog/shared@0.7.0

## 0.7.0-beta.2

### Patch Changes

- 1.去除 crypto 依赖，改用 node 内置 crypto 2.修复 elog clean 可能报错的问题
- Updated dependencies
  - @elog/shared@0.7.0-beta.2

## 0.7.0-beta.1

### Patch Changes

- 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
- Updated dependencies
  - @elog/shared@0.7.0-beta.1

## 0.7.0-beta.0

### Minor Changes

- 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度

### Patch Changes

- Updated dependencies
  - @elog/shared@0.7.0-beta.0

## 0.6.1

### Patch Changes

- 1.解决标签/分类/媒体的问题问题 2.删除 visible 字段
- Updated dependencies
  - @elog/shared@0.6.1

## 0.6.0

### Minor Changes

- ca279b9: elog sync 支持强制同步

### Patch Changes

- 5f970b2: 增加通过账号密码的方式同步语雀文档
- 170762c: 1.新增同步文档到 WordPress 站点
- 2b6baf0: 1.fix(yuque-sdk): 修复目录信息丢失的问题
  2.feat(yuque-sdk): 优化语雀 cookie 存储问题,登录成功后保存 cookie 到内存,不再保存到本地
- 1.支持同步到 WordPress 站点

  2.支持通过帐号密码的方式同步语雀文档

  3.Elog 支持强制同步

  4.文档下载并发调整为 3，且增加并发数配置，可手动调整下载并发

  5.优化 debug 输出

  6.elog sync 拓展配置

- dc11c1c: elog init 适配语雀帐号密码方式
- 5dd5bac: 1.分类/标签创建失败时不影响运行 2.优化 debug 输出
- 14dd166: 支持通过帐号密码的方式同步语雀文档
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

## 0.6.0-beta.9

### Patch Changes

- 文档下载并发调整为 3，且增加并发数配置，可手动调整下载并发
- Updated dependencies
  - @elog/shared@0.6.0-beta.9

## 0.6.0-beta.8

### Patch Changes

- wordpress 增加代码高亮
- Updated dependencies
  - @elog/shared@0.6.0-beta.8

## 0.6.0-beta.7

### Patch Changes

- 1.分类/标签创建失败时不影响运行 2.优化 debug 输出
- Updated dependencies
  - @elog/shared@0.6.0-beta.7

## 0.6.0-beta.6

### Patch Changes

- 上传到 wordpress 时先将 md 转成 html
- Updated dependencies
  - @elog/shared@0.6.0-beta.6

## 0.6.0-beta.5

### Patch Changes

- 1.新增同步文档到 WordPress 站点
- Updated dependencies
  - @elog/shared@0.6.0-beta.5

## 0.6.0-beta.4

### Patch Changes

- 1.fix(yuque-sdk): 修复目录信息丢失的问题
  2.feat(yuque-sdk): 优化语雀 cookie 存储问题,登录成功后保存 cookie 到内存,不再保存到本地
- Updated dependencies
  - @elog/shared@0.6.0-beta.4

## 0.6.0-beta.3

### Patch Changes

- elog init 适配语雀帐号密码方式
- Updated dependencies
  - @elog/shared@0.6.0-beta.3

## 0.6.0-beta.2

### Patch Changes

- 支持通过帐号密码的方式同步语雀文档
- Updated dependencies
  - @elog/shared@0.6.0-beta.2

## 0.6.0-beta.1

### Patch Changes

- 增加通过账号密码的方式同步语雀文档
- Updated dependencies
  - @elog/shared@0.6.0-beta.1

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
