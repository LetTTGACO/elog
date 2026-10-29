<div align="center">
  <h1>Elog</h1>
  <p>开放式跨端博客解决方案，随意组合写作平台（语雀/飞书/Notion/FlowUs）和博客平台（Hexo/Vitepress/Confluence/WordPress）等</p>
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
- FlowUs：仿Notion的国内文档产品，用了下还不错
- 飞书云文档：也是一个很出色的在线协同文档工具，主打工作/团队场景，也有个人版
- 语雀：阿里出品，笔者觉得很不错的一款在线编辑器，涵盖日常个人、工作所需要的各种场景，够用
- Typora：一款出色的本地编辑器，支持实时预览和流程书写，可惜新版本收费了

而博客平台一般分为两类，一种是轻量化的，只负责渲染文档不提供编辑器，代表产品：

- Hexo
- Vitepress
- HuGo

一种是内容管理系统软件，相对上面这些比较重，初期涉及到数据库和手动部署，拥有自己的编辑器，代表产品：

- WordPress
- GHost

## Elog

如果我既想用最熟悉、最舒适的编辑器，又想用主流的博客平台，怎么办呢？

Elog就是为了解决这个问题而诞生的。

Elog将这些平台揉合在一起，你可以随意组合写作平台和博客平台，目前支持：

**写作平台**

- [X] Notion
- [X] 语雀
- [X] FlowUs
- [X] 飞书云文档
- [X] 我来

**博客平台**

- [X] Hexo
- [X] Vitepress
- [X] HuGo
- [X] Docusaurus
- [X] Docz
- [X] Halo
- [X] Confluence
- [X] WordPress

> 博客平台目前支持所有类似 Hexo 的框架：通过向指定目录存放 markdown 文档来进行渲染的方式

## 🌅 图床功能

和很多在线平台一样，Notion和语雀也同样存在图片防盗链的问题，直接将写作平台的图片链接放到其他站点的话，会加载不出来。
为了解决这个问题，Elog支持了在生成MD文件之前，将扫描到的图片上传到图床上，并对文档中的图片链接进行替换。
当前支持的图床有：

- [X] 本地
- [X] 腾讯云COS
- [X] 阿里云OSS
- [X] Github图床
- [X] 七牛云
- [X] 又拍云

> 你也可以通过自定义图床插件的方式上传文档图片到任意图床
> 
> 社区图床插件
> - [Cloudflare R2](https://github.com/LetTTGACO/elog/tree/master/plugins/plugin-img-r2#readme)
> - [Backblaze B2](https://github.com/LetTTGACO/elog/tree/master/plugins/plugin-img-b2#readme)

## ✨ 特性

- 📝 写作平台支持语雀/Notion/FlowUs/飞书云文档
- 🚀 博客平台支持所有通过渲染本地 Markdown 文档生成静态站点的博客平台
- 🚀 博客平台支持Halo/Confluence/WordPress站点
- 🌅 图床平台支持存放到本地或上传到阿里云/腾讯云/Github/七牛云/又拍云
- 📦 支持生成Front Matter Markdown
- ⚙️ 支持自定义文档处理适配器
- 🛡 支持自定义图床插件

更多详情见 [ELog 开发计划](https://1874.notion.site/Elog-91dd2037c9c847e6bc90b712b124189c)

## 🔨 快速上手

[Elog 使用文档](https://elog.1874.cool/)

备用文档地址1：[https://1874.notion.site](https://1874.notion.site/0aa9217e5bcc46768bdae424fddcbc28)

备用文档地址2：[https://wordpress.1874.cool](https://wordpress.1874.cool)

## 📦 开箱即用

- [Notion + Elog + Hexo + GitHub Actions + Vercel 博客解决方案](https://github.com/elog-x/notion-hexo)  👉  [Notion-Hexo](https://notion-hexo.vercel.app/)
- [语雀 + Elog + Hexo + GitHub Actions + Vercel 博客解决方案](https://github.com/elog-x/yuque-hexo)  👉  [Yuque-Hexo](https://yuque-hexo.vercel.app/)
- [语雀 + Elog + VitePress + GitHub Actions + Vercel 文档站点解决方案](https://github.com/elog-x/yuque-vitepress)  👉  [Yuque-Vitepress](https://yuque-vitepress.vercel.app/)
- [FlowUs + Elog + Halo + GitHub Actions 博客解决方案](https://github.com/elog-x/flowus-halo)  👉  [FlowUs-Halo](https://halo.1874.cool/archives/flowus-halo)
- [Notion + Elog + Halo + GitHub Actions 博客解决方案](https://github.com/elog-x/notion-halo)  👉  [Notion-Halo](https://halo.1874.cool/archives/notion-halo)

## 🔗 最佳实践

- [elog-docs](https://github.com/LetTTGACO/elog-docs) 多写作平台云端写作 + vitepress + GitHub Action + GitHub Pages 持续集成  👉  [Elog Docs](https://elog.1874.cool/)
- [jasonma0012.github.io](https://github.com/JasonMa0012/jasonma0012.github.io) 语雀 + hexo + GitHub Action 抓取文章 + Vercel 部署  👉  [Elysium](https://elysium.jason-ma.com/)
- [Knowledge-Garden](https://github.com/shenweiyan/Knowledge-Garden) 语雀 + mkdocs + GitHub Action 持续集成  👉  [生信知识花园](https://doc.weiyan.cc/)
- [blog-butterfly](https://github.com/ccknbc-actions/blog-butterfly) 语雀 + hexo + GitHub Action 抓取文章 + Webify/GitHub/Vercel/GitLab/Gitee/Netlify/BitBucket/CloudFlare 部署  👉  [CC的部落格](https://blog.ccknbc.cc/about/)
- [hexo.bmqy.net](https://github.com/bmqy/hexo.bmqy.net) notion + hexo + GitHub Action 持续集成  👉  [北门清燕](https://www.bmqy.net/)
- [www](https://github.com/ql-isaac/www) 语雀 + hexo + GitHub Action 抓取文章 + Webify（境内）/Vercel（境外）部署  👉  [IMQL.LIFE](https://www.imql.life/categories/%E6%88%91%E7%9A%84%E5%8D%9A%E5%AE%A2/)
- [Notion-Action-MD](https://github.com/cyolc932/elog) Notion + Elog 文档备份 + GitHub Action 持续集成  👉  [DC&#39;s Blog](https://aaqq.cc/article/24c2897b-78f3-4f6a-b8e6-292ea60edf7c)
- [happyzhangyyds](https://github.com/happyzhangyyds/elog) Notion + Elog 文档备份 + GitHub Action 持续集成  👉  [MatrixCore&#39;s Blog](https://matrixcore.top/article/elog)
- Notion + hexo + GitHub Action + cloudflare 持续集成  👉  [Derick&#39;s Blog](https://blog.ithuo.net/post/2023-11-07%2FNotion%E5%8D%9A%E5%AE%A2%E6%8A%98%E8%85%BE%E6%8C%87%E5%8D%97)
- [语雀写作，Kubernetes部署——Elog+Hexo博客持续集成](https://juejin.cn/post/7304540675668181003)
- [next-yuque-elog](https://github.com/lidelong-0201/next-yuque-elog) yuque写作 + elog同步 + NextJs渲染 + vercel部署  👉  [delong的博客](https://lidelong.xyz/)
- [Ymri's Haven](https://github.com/Ymriri/Haven) 语雀 + VitePress + GitHub Actions + Vercel部署  👉  [Ymri's Haven](https://blog.ym94.cn/)
- [Xlenco&#39;s Blog](https://github.com/xlenco/blog) hexo+elog+语雀，部署在vercel和azure web  👉  [Xlenco&#39;s Blog](https://blog.xlenco.top/p/1420.html)
- FlowUs+Hexo+Github Actions+Vercel 博客解决方案  👉  [白](https://www.imbai.cn/posts/32113.html)
- [OfferNow](https://github.com/white0dew/OfferNow) 语雀 + Elog + NextJs渲染   👉  [OffewNow](https://offernow.cn/)
- [yuque_halo](https://github.com/Flionay/yuque_halo) 语雀 + Halo + GitHub Actions 👉  [AngYi](https://www.angyi.online/archives/rw9pet6kloggaehv)
- [Elog-Quarto](https://github.com/Wattskemov/Elog-Quarto) Notion 写作 + Elog 同步 + Quarto 构建 + Netlify 部署 👉 [Elog-Quarto 示例站点](https://elog-quarto.netlify.app/)

## 👬 社区生态
可访问 [awesome-elog仓库](https://github.com/elog-x/awesome-elog) 查看相关资源，如果你也有优秀的实践或工具，欢迎提交PR到 [awesome-elog](https://github.com/elog-x/awesome-elog)
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
