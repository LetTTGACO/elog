import type { DocDetail } from '@elog/plugin-sdk';

/**
 * local 配置
 */
export interface LocalConfig {
  /** 文档输出目录 */
  outputDir: string;
  /** md文件名取值字段，默认为 title */
  filename?: string;
  /** 文件后缀 */
  fileExt?: string;
  /** 保持原有目录结构 */
  keepToc?: boolean;
  /** @deprecated Use keepToc instead. */
  deployByStructure?: boolean;
  /** 是否需要给文档头部添加 Front-Matter */
  frontMatter?: {
    enable: boolean;
    exclude?: string[];
    include?: string[];
  };
}

/** 文档处理适配器 */
export interface AdapterConfig {
  frontMatter?: {
    enable?: boolean;
    exclude?: string[];
    include?: string[];
  };
}

export type AdapterFunction = (doc: DocDetail) => string;
