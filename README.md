<div align="center">
  <h1>Elog</h1>
  <p>开放式跨端博客解决方案，随意组合写作平台（语雀/Notion/FlowUs）和部署平台（Hexo/Vitepress/HuGo）等</p>
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

## 🌍 交流与反馈
<p>如果遇到问题，请加入下方交流群进行反馈，获取最新进展。</p>
<p>微信扫码加入群聊</p>
<img style="width: 200px; height: 200px" src="https://user-images.githubusercontent.com/37357188/217702971-47dd05ea-e689-4091-b4e7-3ae4559ca215.png">

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
- FlowUs：仿Notion的国内文档产品，用了下还不错，就是AI有点智障
- 语雀：阿里出品，笔者之前觉得很不错的一款在线编辑器，涵盖日常个人、工作所需要的各种场景，够用
- Typora：一款出色的本地编辑器，支持实时预览和流程书写，可惜新版本收费了
> 语雀最近限制了【互联网公开】的权限，需要会员才能使用，所以对于一些想直接把语雀当成博客站点的用户变得不太友好。~~好在API目前还不受限制，可以稳定使用~~
> 
> GG 语雀API需要超级会员才能用，不过之前生成过的还能用

而博客平台一般分为两类，一种是轻量化的，只负责渲染文档不提供编辑器，代表产品：
- Hexo
- Vitepress
- HuGo

一种是内容管理系统软件，相对上面这些比较重，初期涉及到数据库和手动部署，拥有自己的编辑器，代表产品：
- WordPress
- GHost
## ELog
如果我既想用最熟悉、最舒适的编辑器，又想用主流的博客平台，怎么办呢？

Elog就是为了解决这个问题而诞生的。 

Elog将这些平台揉合在一起，你可以随意组合写作平台和部署平台，目前支持：
- [x] Notion
- [x] 语雀
- [x] FlowUs(内测中)

**部署平台**
- [x]  Hexo
- [x]  Vitepress
- [x]  HuGo
- [x]  Docusaurus
- [x]  Docz
- [x]  Confluence
> 部署平台目前支持所有类似 Hexo 的框架：通过向指定目录存放 markdown 文档来进行渲染的方式

## 🌅 图床功能
和很多在线平台一样，Notion和语雀也同样存在图片防盗链的问题，直接将写作平台的图片链接放到其他站点的话，会加载不出来。
为了解决这个问题，Elog支持了在生成MD文件之前，将扫描到的图片上传到图床上，并对文档中的图片链接进行替换。
当前支持的图床有：
- [x] 腾讯云COS
- [x] 阿里云OSS
- [x] Github图床
- [x] 七牛云
- [x] 又拍云

## ✨ 特性
- 📝 写作平台支持语雀/Notion/FlowUs
- 🚀 部署平台支持所有通过渲染本地 Markdown 文档生成静态站点的博客平台
- 🌅 图床平台支持存放到本地或上传到阿里云/腾讯云/Github/七牛云/又拍云
- 📦 支持生成Front Matter Markdown/支持代码高亮的HTML/适用于Confluence的wiki
- ⚙️ 支持自定义文档处理适配器
- 🛡 图床平台支持通过拓展点注入密钥

更多详情见 [ELog 开发计划](https://1874.notion.site/Elog-91dd2037c9c847e6bc90b712b124189c)

## 🔨 快速上手
[Elog 使用文档](https://elog.1874.cool/)

## 🔗 最佳实践
- [Elog Docs](https://github.com/LetTTGACO/elog-docs) 多写作平台云端写作 + vitepress 按目录生成路由 + GitHub Action + GitHub Pages 持续集成

## 感谢
感谢以下用户贡献了很多bugs和建议
- [CC康纳百川](https://github.com/CCKNBC) 
- [Steven Shum](https://github.com/shenweiyan)
- [北门清燕](https://github.com/bmqy)
- [觉·白](https://github.com/vannvan)

感谢下列项目提供了灵感
- [yuque-tools](https://github.com/vannvan/yuque-tools)
- [yuque-hexo](https://github.com/x-cold/yuque-hexo)
