import fs from 'fs';

function hyphenToCamelCase(str: string) {
  // 将字符串按照 "-" 分割成数组
  const parts = str.split('-');
  // 将每个部分的首字母大写
  const camelCaseParts = parts.map((part, index) => {
    if (index === 0) {
      // 第一个部分保持小写
      return part;
    } else {
      // 其他部分首字母大写
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
  });
  // 将数组拼接成一个字符串
  return camelCaseParts.join('');
}

export const genConfigByName = async (template: string, configName = 'elog.config.ts') => {
  const plugins = template.split('_').filter((p) => p !== '');
  let option: any = {};
  for (let i = 0; i < plugins.length; i++) {
    const item = plugins[i];
    const pluginName = `@elogx-test/plugin-${item}`;
    if (item.startsWith('from')) {
      option.from = { alias: hyphenToCamelCase(item), plugin: pluginName };
    } else if (item.startsWith('to')) {
      option.to = { alias: hyphenToCamelCase(item), plugin: pluginName };
    } else {
      option.plugin = { alias: hyphenToCamelCase(item), plugin: pluginName };
    }
  }
  const str = genConfig(option);
  fs.writeFileSync(`${process.cwd()}/${configName}`, str, {
    encoding: 'utf-8',
  });
};

const genConfig = ({ from, to, plugin }: any) => {
  return `import { defineConfig } from '@elogx-test/elog'
import ${from.alias} from '${from.plugin}'
import ${to.alias} from '${to.plugin}'${
    plugin ? `\nimport ${plugin.alias} from '${plugin.plugin}'` : ''
  };

export default defineConfig({
  from: ${from.alias}({}),
  to: [${to.alias}({})],${plugin ? `\n  plugins: [${plugin.alias}({})]` : ''}
})`;
};
