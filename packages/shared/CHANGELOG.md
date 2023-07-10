# @elog/shared

## 0.4.5

### Patch Changes

- 放开 request 的超时时间，支持配置 REQUEST_TIMEOUT 环境变量来自定义超时时间

## 0.4.4

### Patch Changes

- f087107: 临时去掉处理 md 表格的相关逻辑
- ea16d27: 支持修改文档属性
- 去除 remark 相关逻辑及依赖

## 0.4.4-beta.1

### Patch Changes

- 临时去掉处理 md 表格的相关逻辑

## 0.4.4-beta.0

### Patch Changes

- 支持修改文档属性

## 0.4.3

### Patch Changes

- 修复 Front Matter 中字符超长问题
- dc21449: 修复 Front Matter 中字符超长问题

## 0.4.3-beta.0

### Patch Changes

- 修复 Front Matter 中字符超长问题

## 0.4.2

### Patch Changes

- 锁定 notion-to-md 版本号
- a6d7495: 文档 front matter 生成失败时跳过

## 0.4.2-beta.0

### Patch Changes

- 文档 front matter 生成失败时跳过

## 0.4.1

### Patch Changes

- 修复 Notion 数据分页问题

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

## 0.4.0-beta.10

### Patch Changes

- 1.调整 elog 初始化配置 2.调整 notion 配置项逻辑

## 0.4.0-beta.9

### Patch Changes

- 1.下线同步转异步逻辑和依赖包@kaciras/deasync，走正常初始化逻辑 2.初始化增加字段，适配 Notion 按目录下载

## 0.4.0-beta.8

### Patch Changes

- 优化缓存文件体积

## 0.4.0-beta.7

### Patch Changes

- 修复 markdown 处理问题

## 0.4.0-beta.6

### Patch Changes

- 1.增加错误日志输出 2.增加 property 长度检测提醒

## 0.4.0-beta.5

### Patch Changes

- 修图图片下载问题

## 0.4.0-beta.4

### Patch Changes

- 修复语雀公式图和 uml 图片无法下载的问题

## 0.4.0-beta.3

### Patch Changes

- 取消高亮块处理

## 0.4.0-beta.2

### Patch Changes

- 1. notion 配置参数变更
  2. notion 支持自定义筛选和排序
  3. notion 支持生成目录配置

## 0.4.0-beta.1

### Patch Changes

- elog init 逻辑调整

## 0.4.0-beta.0

### Minor Changes

- 1.Elog 参数格式调整
- 2.增加 Html 文档处理适配器
- 3.支持自定义文档处理适配器
- 4.图床支持拓展点获取密钥
- 5.语雀特殊字符处理迁移到 yuque-sdk 中去

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

## 0.3.0-beta.7

### Patch Changes

- 1.优化部署流程 2.缓存目录信息

## 0.3.0-beta.6

### Patch Changes

- 自动生成文档目录

## 0.3.0-beta.5

### Patch Changes

- 增加日志输出

## 0.3.0-beta.4

### Patch Changes

- 修复 OSS STS 上传

## 0.3.0-beta.3

### Patch Changes

- 增加 oss sts 支持

## 0.3.0-beta.2

### Patch Changes

- 增加密钥拓展点

## 0.3.0-beta.1

### Patch Changes

- 1. 修复不可见文章的目录为空的问题
  2. 修复创建文章失败阻碍流程的问题

## 0.3.0-beta.0

### Minor Changes

- 新增对 confluence 部署平台的支持

## 0.2.2

### Patch Changes

- 8ae4405: 🐞 修复 frontmatter 渲染不正常
- 9ddcb6d: 🐞 修复 frontmatter 渲染不正常
- 🐞 修复 frontmatter 渲染不正常

## 0.2.2-beta.1

### Patch Changes

- 🐞 修复 frontmatter 渲染不正常

## 0.2.2-beta.0

### Patch Changes

- 🐞 修复 frontmatter 渲染不正常

## 0.2.1

### Patch Changes

- fb79bfc: 🐞 修复拉取语雀文章超时 🐞 修复本地生成图片时文件夹找不到 🐞 修复渲染表格出错
- 33e1734: 🐞 修复渲染表格出错
- 🐞 修复拉取语雀文章超时 🐞 修复本地生成图片时文件夹找不到 🐞 修复渲染表格出错

## 0.2.1-beta.3

### Patch Changes

- 🐞 修复渲染表格出错

## 0.2.1-beta.2

### Patch Changes

- 🐞 修复拉取语雀文章超时 🐞 修复本地生成图片时文件夹找不到 🐞 修复渲染表格出错

## 0.2.1-beta.1

### Patch Changes

- 修复文件创建失败

## 0.2.1-beta.0

### Patch Changes

- 1. 修复拉取语雀文章超时 2.修复本地生成图片时文件夹找不到 3.修复 Vitepress 渲染表格出错

## 0.2.0

### Minor Changes

- 增加对语雀空间的 API 支持

## 0.1.3

### Patch Changes

- 修复 upgrade 命令

## 0.1.2

### Patch Changes

- 修复正则匹配图片遗漏的问题

## 0.1.1

### Patch Changes

- 修复图片下载失败的问题

## 0.1.0

### Minor Changes

- 新增 upgrade 命令

## 0.0.5

### Patch Changes

- 新增 upgrade 命令，用于更新 elog

## 0.0.4

### Patch Changes

- 修复--version 错误

## 0.0.3

### Patch Changes

- 修复 cli 模版错误问题

## 0.0.2

### Patch Changes

- 图床支持本地存储

## 0.0.1

### Patch Changes

- 图床支持本地存储 & bugs fix
- 图床支持本地存储

## 0.0.1-beta.1

### Patch Changes

- 图床支持本地存储 & bugs fix

## 0.0.1-beta.0

### Patch Changes

- 第一次发布
