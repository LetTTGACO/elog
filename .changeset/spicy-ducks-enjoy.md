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

1.不在通过图片 Buffer 生成唯一 ID，直接通过图片 URL 生成唯一 ID，提升二次同步速度
