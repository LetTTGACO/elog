---
'@elog/cli': patch
'@elog/core': patch
'@elog/deploy': patch
'@elog/plugin-adapter': patch
'@elog/plugin-image': patch
'@elog/sdk-confluence': patch
'@elog/sdk-flowus': patch
'@elog/sdk-notion': patch
'@elog/sdk-wordpress': patch
'@elog/sdk-yuque': patch
'@elog/shared': patch
'@elog/types': patch
---

1.去除 crypto 依赖，改用 node 内置 crypto 2.修复 elog clean 可能报错的问题
