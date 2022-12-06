---
title: 语雀 API和Notion API的区别
urlname: gsp78gzks66wxaqf
author: '1874'
date: '2022-12-06 00:01:58'
updated: '2022-12-06 13:27:44'
---
## 语雀 API

- 语雀返回的 markdown 内容存在语雀专有的锚点`<a name=\".*?\"><\/a>`，需要单独处理

## Notion API

- 暂不支持子页面的渲染
- 暂不支持 webhooks，网页版需要加载油猴插件或者谷歌插件，桌面版可以加载自定义的 js，但是需要适配 mac 和 windows 和 linux
