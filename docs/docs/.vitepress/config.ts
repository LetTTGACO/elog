import { defineConfig } from "vitepress";
import { genSideBar } from "../../utils/route";

export default defineConfig({
  lang: "zh-CN",
  title: 'Elog',
  description: 'doc for elog',
  themeConfig: {
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
