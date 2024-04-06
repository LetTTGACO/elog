// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);

import fs from 'fs';

function hyphenToCamelCase(str) {
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

const genConfigByName = async (name) => {
  const plugins = name.split('_');

  let option = {
    from: {},
    to: {},
    plugin: {},
  };
  for (let i = 0; i < plugins.length; i++) {
    const item = plugins[i];
    // NOTE 暂定都使用官方模版
    const pluginName = `@elogx-test/plugin-${item}`;
    const res = await import(pluginName);
    const pluginFunc = res.default;
    console.log(pluginFunc);
    const plugin = pluginFunc();
    const config = JSON.stringify(plugin?.config(), null, 2);
    console.log(item);
    if (item.startsWith('from')) {
      option.from = { alias: hyphenToCamelCase(item), plugin: pluginName, config };
    } else if (item.startsWith('to')) {
      option.to = { alias: hyphenToCamelCase(item), plugin: pluginName, config };
    } else {
      option.plugin = { alias: hyphenToCamelCase(item), plugin: pluginName, config };
    }
  }
  console.log(option);

  return genConfig(option);
};

const genConfig = ({ from, to, plugin }) => {
  return `
import { defineConfig } from '@elogx-test/elog';
import ${from.alias} from '${from.plugin}';
import ${to.alias} from '${to.plugin}';
import ${plugin.alias} from '${plugin.plugin}';

export default defineConfig({
  from: ${from.alias}(${from.config}),
  to: ${to.alias}(${to.config}),
  plugins: [${plugin.alias}(${plugin.config})]
});`;
};

const name = 'from-yuque_image-local_to-local';
genConfigByName(name).then((str) => {
  // 把 process 开头的 字符串去除引号
  fs.writeFileSync('./elog1.config.ts', str, {
    encoding: 'utf-8',
  });
});
