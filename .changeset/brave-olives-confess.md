---
'@elog/cli': patch
'@elog/core': patch
'@elog/deploy': patch
'@elog/plugin-adapter': patch
'@elog/plugin-image': patch
'@elog/sdk-confluence': patch
'@elog/sdk-notion': patch
'@elog/sdk-yuque': patch
'@elog/shared': patch
'@elog/types': patch
---

1.下线同步转异步逻辑和依赖包@kaciras/deasync，走正常初始化逻辑 2.初始化增加字段，适配 Notion 按目录下载
