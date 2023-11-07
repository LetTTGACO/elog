# @elog/shared

## 0.11.0-beta.0

### Minor Changes

- 支持自定义图床插件

## 0.10.0

### Minor Changes

- 1. notion sdk 升级
  2. notion 支持文档图片转 Base64
  3. 去掉 request 代理
- 64dc211: 1. notion sdk 升级 2. notion 支持文档图片转 Base64

## 0.10.0-beta.0

### Minor Changes

- 1. notion sdk 升级
  2. notion 支持文档图片转 Base64

## 0.9.1

### Patch Changes

- 6304b5a: 删除文件顺序调整
- 86feaeb: 删除缓存优化
- a240d6c: rimraf 删除优化
- 删除缓存优化
- fb93cea: rimraf 删除优化
- 1cb8ee8: 删除缓存优化

## 0.9.1-beta.4

### Patch Changes

- 删除缓存优化

## 0.9.1-beta.3

### Patch Changes

- 删除缓存优化

## 0.9.1-beta.2

### Patch Changes

- rimraf 删除优化

## 0.9.1-beta.1

### Patch Changes

- 删除文件顺序调整

## 0.9.1-beta.0

### Patch Changes

- rimraf 删除优化

## 0.9.0

### Minor Changes

- 5d1e137: 1.飞书支持我的空间/知识库文档下载 2.飞书高亮块支持 emoji 3.飞书文档支持按层级下载 4.增加语雀参数校验 5.修复飞书云文档导出问题
- 0.9.0 正式版

### Patch Changes

- e5b4a63: 过滤语雀数据表文档类型
- ca153b0: 文档不需要更新时，不重复写入缓存文
- 04de58b: 日志优化
- 6046db7: 飞书依赖升级
- b13c88d: 删除 cache.json 缓存文件中的 body_original 字段
- f688e74: 1.新增文档图片路径跟随文档路径（适用于多层级导出本地文档） 2.新增文档图片路径自定义拓展点
- a102d80: 去除调试参数
- e23ff35: init 图床参数变更

## 0.9.0-beta.8

### Patch Changes

- 文档不需要更新时，不重复写入缓存文

## 0.9.0-beta.7

### Patch Changes

- 删除 cache.json 缓存文件中的 body_original 字段

## 0.9.0-beta.6

### Patch Changes

- 日志优化

## 0.9.0-beta.5

### Patch Changes

- 去除调试参数

## 0.9.0-beta.4

### Patch Changes

- init 图床参数变更

## 0.9.0-beta.3

### Patch Changes

- 1.新增文档图片路径跟随文档路径（适用于多层级导出本地文档） 2.新增文档图片路径自定义拓展点

## 0.9.0-beta.2

### Patch Changes

- 过滤语雀数据表文档类型

## 0.9.0-beta.1

### Patch Changes

- 飞书依赖升级

## 0.9.0-beta.0

### Minor Changes

- 1.飞书支持我的空间/知识库文档下载 2.飞书高亮块支持 emoji 3.飞书文档支持按层级下载 4.增加语雀参数校验 5.修复飞书云文档导出问题

## 0.8.3

### Patch Changes

- 增加语雀 pwd 模式下的参数
  1.onlyPublic 只下载公开文档
  2.onlyPublished 只下载已发布文档

## 0.8.2

### Patch Changes

- 修复 github 上传失败时日志输出问题

## 0.8.1

### Patch Changes

- 增加添加 env 文件到 gitignore 的提示

## 0.8.0

### Minor Changes

- 9776e2a: 写作平台支持飞书云文档

### Patch Changes

- 173b4b2: 修复飞书标题生成缺失
- 写作平台支持飞书云文档
- 2d9ee98: 升级 feishux 相关库依赖

## 0.8.0-beta.2

### Patch Changes

- 升级 feishux 相关库依赖

## 0.8.0-beta.1

### Patch Changes

- 修复飞书标题生成缺失

## 0.8.0-beta.0

### Minor Changes

- 写作平台支持飞书云文档

## 0.7.3

### Patch Changes

- 1c2ee30: 1.修复 prefix 前缀路径 2.修复图床传参问题 3.优化 debug 输出
- 16ede90: 修复 github 图床和 os 上传问题
- 1.修复 prefix 前缀路径 2.修复图床上传问题 3.优化 debug 输出

## 0.7.3-beta.1

### Patch Changes

- 1.修复 prefix 前缀路径 2.修复图床传参问题 3.优化 debug 输出

## 0.7.3-beta.0

### Patch Changes

- 修复 github 图床和 os 上传问题

## 0.7.2

### Patch Changes

- db2936f: 优化图片下载问题
- 优化图片下载问题

## 0.7.2-beta.0

### Patch Changes

- 优化图片下载问题

## 0.7.1

### Patch Changes

- 修复爬取语雀目录时鉴权问题
- 64fe962: 1.修复爬取目录时鉴权问题

## 0.7.1-beta.0

### Patch Changes

- 1.修复爬取目录时鉴权问题

## 0.7.0

### Minor Changes

- 6cd3013: 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
- 1.不再通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，大幅提升二次同步速度 2.修复 elog clean 可能报错的问题

### Patch Changes

- f3f9c3b: 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
- 6127171: 1.去除 crypto 依赖，改用 node 内置 crypto 2.修复 elog clean 可能报错的问题

## 0.7.0-beta.2

### Patch Changes

- 1.去除 crypto 依赖，改用 node 内置 crypto 2.修复 elog clean 可能报错的问题

## 0.7.0-beta.1

### Patch Changes

- 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度

## 0.7.0-beta.0

### Minor Changes

- 1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度

## 0.6.1

### Patch Changes

- 1.解决标签/分类/媒体的问题问题 2.删除 visible 字段

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

## 0.6.0-beta.9

### Patch Changes

- 文档下载并发调整为 3，且增加并发数配置，可手动调整下载并发

## 0.6.0-beta.8

### Patch Changes

- wordpress 增加代码高亮

## 0.6.0-beta.7

### Patch Changes

- 1.分类/标签创建失败时不影响运行 2.优化 debug 输出

## 0.6.0-beta.6

### Patch Changes

- 上传到 wordpress 时先将 md 转成 html

## 0.6.0-beta.5

### Patch Changes

- 1.新增同步文档到 WordPress 站点

## 0.6.0-beta.4

### Patch Changes

- 1.fix(yuque-sdk): 修复目录信息丢失的问题
  2.feat(yuque-sdk): 优化语雀 cookie 存储问题,登录成功后保存 cookie 到内存,不再保存到本地

## 0.6.0-beta.3

### Patch Changes

- elog init 适配语雀帐号密码方式

## 0.6.0-beta.2

### Patch Changes

- 支持通过帐号密码的方式同步语雀文档

## 0.6.0-beta.1

### Patch Changes

- 增加通过账号密码的方式同步语雀文档

## 0.6.0-beta.0

### Minor Changes

- elog sync 支持强制同步

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

## 0.5.0-beta.10

### Patch Changes

- 优化 request 的超时时间

## 0.5.0-beta.9

### Patch Changes

- 升级 flowus-sdk 版本

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

- 新增对 confluence 博客平台的支持

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
