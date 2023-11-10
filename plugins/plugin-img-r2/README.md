# Elog cloudflare R2 图床插件
## 使用说明
### 1. 安装插件
```shell
npm install @elog/plugin-img-r2
```
### 2. elog.config.js 配置自定义插件
```javascript
// elog.config.js
const r2 = require('@elog/plugin-img-r2')

module.exports = {
  // ...省略
  image: {
    enable: true,
    plugin: r2,
    r2: {
      accessKeyId: process.env.R2_ACCESSKEYID,
      secretAccessKey: process.env.R2_SECRET_ACCESSKEY,
      bucket: process.env.R2_BUCKET,
      endpoint: process.env.R2_ENDPOINT,
      host: process.env.R2_HOST,
      prefixKey: 'elog-image-plugin-test'
    }
  },
}
````
### 本地调试
配置 `.elog.env`文件
```yml
# .elog.env 配置R2 相关账号参数
#R2
# 访问密钥 ID
R2_ACCESSKEYID=
# 机密访问密钥
R2_SECRET_ACCESSKEY=
R2_ENDPOINT=
# R2 需要使r2.dev子域供网络访问或者绑定自己的域名
R2_HOST=
R2_BUCKET=
```
运行本地同步命令
```shell
elog sync -e .elog.env
```
### Github 流水线配置
将以上用到的环境变量放到 Github 流水线变量即可

## 插件开发文档
[插件开发文档](https://elog.1874.cool/notion/image-platform#plugin-%E5%AD%97%E6%AE%B5%E8%AF%B4%E6%98%8E)
