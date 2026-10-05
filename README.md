<div align="center">
  <h1>Elog</h1>
  <p>开放式跨端博客解决方案，随意组合写作平台（语雀/飞书/Notion）和博客平台（Hexo/Vitepress/Astro/Halo）等</p>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome">
  </a>
  <a href="https://www.npmjs.com/package/@elog/cli">
    <img src="https://img.shields.io/node/v/@elog/cli.svg?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/@elog/cli">
    <img src="https://img.shields.io/npm/v/@elog/cli.svg?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/@elog/cli">
    <img src="https://img.shields.io/npm/l/@elog/cli.svg?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/@elog/cli">
    <img src="https://img.shields.io/npm/dt/@elog/cli.svg?style=flat-square">
  </a>
  <a href="https://github.com/LetTTGACO/elog">
    <img src="https://img.shields.io/github/stars/LetTTGACO/elog" alt="GitHub stars">
  </a>
  <a href="https://github.com/LetTTGACO/elog">
    <img src="https://img.shields.io/github/forks/LetTTGACO/elog" alt="GitHub forks">
  </a>
  <a href="https://github.com/LetTTGACO/elog">
    <img src="https://img.shields.io/github/contributors/LetTTGACO/elog" alt="GitHub contributors">
  </a>
  <a href="https://github.com/LetTTGACO/elog">
    <img src="https://img.shields.io/github/commit-activity/w/LetTTGACO/elog" alt="GitHub commit activity">
  </a>
  <a href="https://github.com/LetTTGACO/elog">
    <img src="https://img.shields.io/github/issues-closed/LetTTGACO/elog" alt="GitHub closed issues">
  </a>
</div>

## 前言

在遇到Elog之前，你的博客可能是：

- 本地编辑器书写 + Hexo/Hugo/Vitepress部署
- 语雀记录
- Notion记录和发布
- WordPress在线书写和发布
- GHost在线书写和发布
- Github记录
- 掘金/知乎等在线平台记录

可以发现，大部分博客平台要么自己提供在线编辑器，要么就让用户本地书写再进行进行部署。
可惜目前好用的编辑器大都都不是博客平台自己提供的，而是一些第三方编辑器，代表产品：

- Notion：出色的数据库设计，灵活度非常高
- 飞书云文档：也是一个很出色的在线协同文档工具，主打工作/团队场景，也有个人版
- 语雀：阿里出品，笔者觉得很不错的一款在线编辑器，涵盖日常个人、工作所需要的各种场景，够用
- Typora：一款出色的本地编辑器，支持实时预览和流程书写

而博客平台一般分为两类，一种是轻量化的，只负责渲染文档不提供编辑器，代表产品：

- Hexo
- Vitepress
- HuGo

一种是内容管理系统软件，相对上面这些比较重，初期涉及到数据库和手动部署，拥有自己的编辑器，代表产品：

- WordPress
- Halo
- GHost

## Elog

如果我既想用最熟悉、最舒适的编辑器，又想用主流的博客平台，怎么办呢？

Elog就是为了解决这个问题而诞生的。

Elog将这些平台揉合在一起，你可以随意组合写作平台和博客平台，目前支持：

**写作平台**

- [X] Notion
- [X] 语雀
- [X] 飞书云文档

**博客平台**

- [X] Hexo
- [X] Vitepress
- [X] HuGo
- [X] Astro
- [X] Docusaurus
- [X] Docz
- [X] Halo


> 博客平台目前支持所有类似 Hexo 的框架：通过向指定目录存放 markdown 文档来进行渲染的方式

## 🌅 图床功能

和很多在线平台一样，Notion/语雀/飞书也同样存在图片防盗链的问题，直接将写作平台的图片链接放到其他站点的话，会加载不出来。
为了解决这个问题，Elog支持了在生成MD文件之前，将扫描到的图片上传到图床上，并对文档中的图片链接进行替换。
当前支持的图床有：

- [X] 本地
- [X] 腾讯云COS
- [X] 阿里云OSS
- [X] Github图床
- [X] 七牛云
- [X] 又拍云
- [X] Cloudflare R2
- [X] Backblaze B2

## ✨ 特性

- 📝 写作平台支持语雀/Notion/飞书云文档
- 🚀 博客平台支持所有通过渲染本地 Markdown 文档生成静态站点的博客平台
- 🚀 博客平台支持Halo站点
- 🌅 图床平台支持存放到本地或上传到阿里云/腾讯云/Github/七牛云/又拍云
- 📦 支持生成Front Matter Markdown
- ⚙️ 支持自定义插件


## 🔨 快速上手

[Elog 使用文档](https://elog.1874.cool/)

## 🌍 交流与反馈
如果遇到问题，请 [提交 issue](https://github.com/LetTTGACO/elog/issues/new/choose) 或在 [discussions 中留言](https://github.com/LetTTGACO/elog/discussions/categories/q-a)

## 🥫支持
- 我有两只猫，假如觉得 Elog 让你生活更美好，可以给猫 [喂罐头 🥫](https://1874.cool/cats)。
- 如果你喜欢 Elog，可以在 Github Star，更欢迎推荐给你志同道合的朋友使用。

## 🌹 感谢

感谢以下用户贡献了很多bugs和建议

- [CC康纳百川](https://github.com/CCKNBC)
- [Steven Shum](https://github.com/shenweiyan)
- [北门清燕](https://github.com/bmqy)
- [觉·白](https://github.com/vannvan)
- [JasonMa](https://github.com/JasonMa0012)
- [happyzhangyyds](https://github.com/happyzhangyyds)
- [蜗牛](https://github.com/Hiwoniu)
- [Derick](https://github.com/DerickIT)
- [BreakALegCml](https://github.com/BreakALegCml)
- [Ymriri](https://github.com/Ymriri)
- [ruibaby](https://github.com/ruibaby)
- [白](https://github.com/3401797899)

感谢下列项目提供了灵感

- [yuque-tools](https://github.com/vannvan/yuque-tools)
- [yuque-hexo](https://github.com/x-cold/yuque-hexo)

## 🔗 友情链接
- [youdaonote-pull](https://github.com/DeppWang/youdaonote-pull) 有道云笔记导出工具
- [NotionNext](https://github.com/tangly1024/NotionNext) 相比 Elog，支持更多 Notion 富文本格式。使用 NextJS + Notion API 实现的，支持多种部署方案的静态博客，无需服务器、零门槛搭建网站，为Notion和所有创作者设计
