# Elog Backblaze B2 图床插件
## 使用说明
### 1. 安装插件
```shell
npm install @elog/plugin-img-b2
```
### 2. elog.config.js 配置自定义插件
```javascript
// elog.config.js
const b2 = require('@elog/plugin-img-b2')

module.exports = {
  // ...省略
  image: {
    enable: true,
    plugin: b2,
    b2: {
      applicationKeyId: process.env.B2_APPLICATIONKEYID,
      applicationKey: process.env.B2_APPLICATIONKEY,
      bucket: process.env.B2_BUCKET,
      host: process.env.B2_HOST,
      prefixKey: process.env.B2_PREFIXKEY
    }
  },
}
````
### 本地调试
配置 `.elog.env`文件
```yml
# .elog.env 配置B2 相关账号参数
# B2
B2_APPLICATIONKEYID=
B2_APPLICATIONKEY=
# b2 bucket_name
B2_BUCKET=
# B2 host_url
B2_HOST=
# 文件夹前缀
B2_PREFIXKEY=
```
运行本地同步命令
```shell
elog sync -e .elog.env
```
### Github 流水线配置
将以上用到的环境变量放到 Github 流水线变量即可

## 插件开发文档
[插件开发文档](https://elog.1874.cool/notion/image-platform#plugin-%E5%AD%97%E6%AE%B5%E8%AF%B4%E6%98%8E)

