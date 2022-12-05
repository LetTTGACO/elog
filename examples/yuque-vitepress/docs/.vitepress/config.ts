import { defineConfig } from "vitepress";
import { genSideBar } from "../../utils/route";

export default defineConfig({
  lang: "zh-CN",
  title: 'yuque-vitepress',
  description: 'yuque-vitepress example',
  themeConfig: {
    outlineTitle: "当前目录",
    sidebar: [
      {
        items: genSideBar('elog'),
      },
    ],
    nav: [
      {
        text: '测试',
        link: "123"
      }
    ]
  }
})
