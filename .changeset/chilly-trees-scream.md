---
'@elog/cli': patch
'@elog/core': patch
'@elog/deploy': patch
'@elog/plugin-adapter': patch
'@elog/plugin-image': patch
'@elog/sdk-confluence': patch
'@elog/sdk-flowus': patch
'@elog/sdk-notion': patch
'@elog/sdk-yuque': patch
'@elog/shared': patch
'@elog/types': patch
---

1.fix(yuque-sdk): 修复目录信息丢失的问题
2.feat(yuque-sdk): 优化语雀 cookie 存储问题,登录成功后保存 cookie 到内存,不再保存到本地
