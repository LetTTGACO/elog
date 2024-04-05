import type { LocalConfig } from './types';
import type { DocDetail, PluginContext } from '@elogx-test/elog';
import path from 'path';
import fs from 'fs';
import { mkdirp } from 'mkdirp';

export default class {
  private readonly config: LocalConfig;
  private readonly ctx: PluginContext;
  private cacheFileNames: string[] = [];

  constructor(config: LocalConfig, ctx: PluginContext) {
    this.config = config;
    this.ctx = ctx;
  }

  /**
   * 过滤 Front-Matter
   * @param doc
   * @param filename
   */
  private filterFrontMatter(doc: DocDetail, filename: string) {
    const frontMatter = this.config.frontMatter;
    if (frontMatter?.enable) {
      if (this.config.frontMatter?.include?.length) {
        Object.keys(doc.properties).forEach((item: string) => {
          // 过滤不需要的属性
          if (!this.config.frontMatter?.include?.includes(item)) {
            if (item !== filename) {
              delete doc.properties[item];
            }
          }
        });
      }
      if (frontMatter?.exclude?.length) {
        Object.keys(doc.properties).forEach((item: string) => {
          if (this.config.frontMatter?.exclude?.includes(item)) {
            if (item !== filename) {
              delete doc.properties[item];
            }
          }
        });
      }
    }
  }

  /**
   * 本地部署
   * @param docDetailList
   */
  deploy(docDetailList: DocDetail[]) {
    let { filename = 'title' } = this.config;
    const outputDir = path.join(process.cwd(), this.config.outputDir);
    if (!docDetailList?.length) {
      this.ctx.success('任务结束', '没有需要部署的文档');
      process.exit();
    }
    const newDocDetailList = JSON.parse(JSON.stringify(docDetailList)) as DocDetail[];

    for (let doc of newDocDetailList) {
      this.filterFrontMatter(doc, filename);

      let fileName = doc.properties[filename];
      if (!doc.properties[filename]) {
        // 没有文件名的文档
        this.ctx.warn(`存在未命名文档，将自动重命名为【未命名文档_${doc.id}】`);
        fileName = `未命名文档_${doc.id}`;
      }

      let postPath: string;
      if (this.config.deployByStructure) {
        // 开启按目录生成
        if (Array.isArray(doc.docStructure)) {
          // 是否存在目录
          const tocPath = doc.docStructure.map((item) => item.title).join('/');
          fileName = this.checkFileName(fileName + tocPath, fileName, doc.id);
          const outDir = path.join(outputDir, tocPath);
          mkdirp.sync(outDir);
          postPath = path.join(outDir, `${fileName}.md`);
          // 生成文件夹
          this.ctx.info('生成文档', `${fileName}.md`);
        } else {
          this.ctx.warn('目录缺失', `${fileName}缺失目录信息，将生成在指定目录`);
          // 不存在则直接生成
          fileName = this.checkFileName(fileName, fileName, doc.id);
          postPath = path.join(outputDir, `${fileName}.md`);
          this.ctx.info('生成文档', `${fileName}.md`);
          mkdirp.sync(outputDir);
        }
      } else {
        // 直接生成
        fileName = this.checkFileName(fileName, fileName, doc.id);
        postPath = path.join(outputDir, `${fileName}.md`);
        this.ctx.info('生成文档', `${fileName}.md`);
        mkdirp.sync(outputDir);
      }
      fs.writeFileSync(postPath, doc.body, {
        encoding: 'utf8',
      });
    }
  }

  /**
   * 检查文件名
   * @param fileName
   * @param originName
   * @param docId
   */
  private checkFileName(fileName: string, originName: string, docId: string) {
    let newName: string;
    if (this.cacheFileNames.includes(fileName)) {
      const newFileName = `${originName}_${docId}`;
      this.ctx.warn('文档重复', `${originName}.md 文档已存在，将为自动重命名为${newFileName}.md`);
      newName = newFileName;
    } else {
      newName = originName;
      this.cacheFileNames.push(fileName);
    }
    return newName;
  }
}
