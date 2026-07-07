import { DocStructure, FromPluginBaseConfig } from '@elog/plugin-sdk';

export interface FeiShuConfig extends FromPluginBaseConfig {
  /** 父文件夹token */
  folderToken?: string;
  /** 知识库 ID */
  wikiId: string;
  /** 是否禁用生成父级文档 */
  disableParentDoc?: boolean;
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

export interface FeiShuDoc {
  id: string;
  properties: {
    title: string;
  };
  title: string;
  updated: number;
  createdAt: number;
  updatedAt: number;
  _index?: number;
  catalog: DocStructure[];
}
