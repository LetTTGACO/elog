import inquirer from 'inquirer';
import { genConfigByName } from '../utils/gen-config';
import out from '../utils/logger';

const templateList = [
  { name: 'yuque-local', value: 'from-yuque_image-local_to-local' },
  { name: 'notion-local', value: 'from-notion_image-local_to-local' },
  { name: 'feishu-local', value: 'from-feishu_image-local_to-local' },
  { name: 'flowus-local', value: 'from-flowus_image-local_to-local' },
];

const init = async (template?: string, name?: string) => {
  // 如果使用默认模版
  if (template) {
    const templ = templateList.find((item) => item.name === template);
    if (templ) {
      void genConfigByName(templ.value, name);
    } else {
      out.warn('指定模版不存在');
    }
  } else {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'init',
          message: '请选择初始化方式',
          choices: [
            {
              name: '社区模版',
              value: 'template',
            },
            {
              name: '自定义配置',
              value: 'custom',
            },
          ],
        },
      ])
      .then((answers) => {
        if (answers.init === 'template') {
          // 使用模版初始化
          inquirer
            .prompt([
              {
                type: 'list',
                name: 'template',
                message: '请选择模版',
                choices: [
                  {
                    name: '语雀 + 本地图床 + 本地部署',
                    value: 'from-yuque_image-local_to-local',
                  },
                  {
                    name: 'Notion + 本地图床 + 本地部署',
                    value: 'from-notion_image-local_to-local',
                  },
                  {
                    name: 'FlowUs + 本地图床 + 本地部署',
                    value: 'from-flowus_image-local_to-local',
                  },
                  {
                    name: '飞书 + 本地图床 + 本地部署',
                    value: 'from-flowus_image-local_to-local',
                  },
                  // {
                  //   name: 'Notion + 本地图床 + Halo + 本地备份',
                  //   value: 'from-notion_image-local_to-halo_to-local',
                  // },
                ],
              },
            ])
            .then((answers) => {
              void genConfigByName(answers.template, name);
            });
        } else {
          // 自定义初始化
          inquirer
            .prompt([
              {
                type: 'list',
                name: 'from',
                message: '请选择写作平台',
                choices: [
                  {
                    name: '语雀',
                    value: 'from-yuque',
                  },
                  {
                    name: 'Notion',
                    value: 'from-notion',
                  },
                  {
                    name: '飞书',
                    value: 'from-feishu',
                  },
                  {
                    name: 'FlowUs',
                    value: 'from-flowus',
                  },
                  {
                    name: '我来',
                    value: 'from-wolai',
                  },
                ],
              },
              {
                type: 'list',
                name: 'to',
                message: '请选择博客平台',
                choices: [
                  {
                    name: '本地(适用于Hexo/HuGo/Vitepress等)',
                    value: 'to-local',
                  },
                  {
                    name: 'WordPress',
                    value: 'to-wordpress',
                  },
                  {
                    name: 'Halo',
                    value: 'to-halo',
                  },
                  {
                    name: 'Confluence',
                    value: 'to-confluence',
                  },
                ],
              },
              {
                type: 'list',
                name: 'plugin',
                message: '请选择插件',
                choices: [
                  {
                    name: '暂不',
                    value: '',
                  },
                  {
                    name: '本地图床',
                    value: 'image-local',
                  },
                ],
              },
            ])
            .then(async (answers) => {
              const from = answers.from;
              const to = answers.to;
              const plugin = answers.plugin;
              const template = from + '_' + to + '_' + plugin;
              void genConfigByName(template, name);
            })
            .catch((error) => {
              out.error(`'初始化失败', ${error.message}`);
            });
        }
      });
  }
};

export default init;
