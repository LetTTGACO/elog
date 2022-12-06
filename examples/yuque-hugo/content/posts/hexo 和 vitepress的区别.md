---
title: hexo 和 vitepress的区别
urlname: ievch7tyaeyrr7bq
author: '1874'
date: '2022-12-05 23:50:15'
updated: '2022-12-06 13:27:40'
---
## Vitepress

- **vitepress 的一级标题不会被目录记录，只会从二级标题开始算目录，一级目录会被当作文章标题**

![image.png](https://raw.githubusercontent.com/LetTTGACO/image/master/elog-test/FnS81WZ8B1Dpv3uOfrKI6Ek4IIp4.png)

- **vitepress 不支持 todo 标签- [ ] ，会被渲染为 - [x]**

![image.png](https://raw.githubusercontent.com/LetTTGACO/image/master/elog-test/Fh48sEti5FGtTzWXKqvbUVEkWJhA.png)

- **vitepress 不会处理不可见 nul 字符（\x00），需要单独处理**

![image.png](https://raw.githubusercontent.com/LetTTGACO/image/master/elog-test/FjuCqlzX200TIakNXc_f8tSqhlq7.png)

## Hexo
