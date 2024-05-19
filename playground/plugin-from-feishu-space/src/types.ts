import { DocStructure, FromPluginBaseConfig } from '@elogx-test/elog';

export interface FeiShuConfig extends FromPluginBaseConfig {
  /** 父文件夹token */
  folderToken: string;
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

export interface FeiShuDoc {
  id: string;
  title: string;
  updated: number;
  createdAt: number;
  updatedAt: number;
  _index?: number;
  catalog: DocStructure[];
}
