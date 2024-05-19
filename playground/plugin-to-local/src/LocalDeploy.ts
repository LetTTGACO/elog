import { DocDetail, ElogBaseContext, PluginContext } from '@elogx-test/elog';
import path from 'path';
import fs from 'fs';
import { mkdirp } from 'mkdirp';
import type { AdapterFunction, LocalConfig } from './types';
import { markdownAdapter, matterMarkdownAdapter } from './utils';

export default class LocalDeploy extends ElogBaseContext {
  private readonly config: LocalConfig;
  private cacheFileNames: string[] = [];
  /** 文档处理适配器 */
  docAdapter: AdapterFunction;

  constructor(config: LocalConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    // 文档适配器
    this.docAdapter = this.initDocApter();
  }

  private initDocApter() {
    if (this.config.frontMatter?.enable) {
      return matterMarkdownAdapter;
    } else {
      return markdownAdapter;
    }
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
    let { filename = 'title', fileExt = 'md' } = this.config;
    const outputDir = path.join(process.cwd(), this.config.outputDir);
    if (!docDetailList?.length) {
      this.ctx.success('任务结束', '没有需要部署的文档');
      process.exit();
    }
    const newDocDetailList = JSON.parse(JSON.stringify(docDetailList)) as DocDetail[];

    for (let doc of newDocDetailList) {
      // 过滤 Front-Matter
      this.filterFrontMatter(doc, filename);
      // 生成 Front-Matter
      doc.body = this.docAdapter(doc);

      let fileName = doc.properties[filename];
      if (!doc.properties[filename]) {
        // 没有文件名的文档
        this.ctx.warn(`存在未命名文档，将自动重命名为【未命名文档_${doc.id}】`);
        fileName = `未命名文档_${doc.id}`;
      }

      let docPath: string;
      if (this.config.deployByStructure) {
        // 开启按目录生成
        if (Array.isArray(doc.docStructure)) {
          // 是否存在目录
          const tocPath = doc.docStructure.map((item) => item.title).join('/');
          fileName = this.checkFileName(fileName + tocPath, fileName, doc.id);
          const outDir = path.join(outputDir, tocPath);
          mkdirp.sync(outDir);
          docPath = path.join(outDir, `${fileName}.${fileExt}`);
          // 生成文件夹
          this.ctx.info('生成文档', `${fileName}.${fileExt}`);
        } else {
          this.ctx.warn('目录缺失', `${fileName}缺失目录信息，将生成在指定目录`);
          // 不存在则直接生成
          fileName = this.checkFileName(fileName, fileName, doc.id);
          docPath = path.join(outputDir, `${fileName}.${fileExt}`);
          this.ctx.info('生成文档', `${fileName}.${fileExt}`);
          mkdirp.sync(outputDir);
        }
      } else {
        // 直接生成
        fileName = this.checkFileName(fileName, fileName, doc.id);
        docPath = path.join(outputDir, `${fileName}.${fileExt}`);
        this.ctx.info('生成文档', `${fileName}.${fileExt}`);
        mkdirp.sync(outputDir);
      }
      fs.writeFileSync(docPath, doc.body, {
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
    const { fileExt = 'md' } = this.config;
    let newName: string;
    if (this.cacheFileNames.includes(fileName)) {
      const newFileName = `${originName}_${docId}`;
      this.ctx.warn(
        '文档重复',
        `${originName}.${fileExt} 文档已存在，将为自动重命名为${newFileName}.${fileExt}`,
      );
      newName = newFileName;
    } else {
      newName = originName;
      this.cacheFileNames.push(fileName);
    }
    return newName;
  }
}
