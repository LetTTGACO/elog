# @elog/types

## 0.5.0-beta.8

### Patch Changes

- fix: 优化 flowus 的 front-matter 的处理

## 0.5.0-beta.7

### Patch Changes

- confluence wiki 语言映射

## 0.5.0-beta.6

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题

## 0.5.0-beta.5

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题

## 0.5.0-beta.4

### Patch Changes

- 1.修复 md2confluence 时无序/有序缩紧列表的问题 2.notion title 表格属性不存在时，取默认

## 0.5.0-beta.3

### Patch Changes

- 去除 remark 库及相关依赖

## 0.5.0-beta.2

### Patch Changes

- 修复 pagkage.json 找不到的问题

## 0.5.0-beta.1

### Patch Changes

- 修复 elog init 模版

## 0.5.0-beta.0

### Minor Changes

- 1. 写作平台支持 FlowUs
  2. 构建工具改为 tsup
  3. Elog sync 支持 debug 模式
  4. 日志输出格式统一

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
