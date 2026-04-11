/**
 * 存储提供者类型
 */
export enum StorageType {
  Gist = 'gist',
  S3 = 's3',
  WebDAV = 'webdav',
}

/**
 * Gist 子类型（区分 GitHub 和 Gitee）
 */
export enum GistSubType {
  GitHub = 'github',
  Gitee = 'gitee',
}

/**
 * 统一的存储条目
 */
export interface StorageEntry {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * 文件内容
 */
export interface StorageContent {
  content: string;
  encoding: 'utf-8' | 'base64';
}

/**
 * 存储配置
 */
export interface StorageConfig {
  type: StorageType;
  subType?: GistSubType;           // 仅 Gist 类型需要
  token?: string;                  // 认证 token
  endpoint?: string;               // S3/WebDAV endpoint
  bucket?: string;                 // S3 bucket 名称
  region?: string;                 // S3 region
  accessKeyId?: string;            // S3 access key
  secretAccessKey?: string;        // S3 secret key
  proxyUrl?: string;               // 代理
  basePath?: string;               // 基础路径（WebDAV 虚拟目录）
}

/**
 * 文件大小限制配置
 */
export interface FileSizeLimit {
  maxFileSize: number;
  maxRequestSize: number;
}

/**
 * 文件大小验证结果
 */
export interface FileSizeValidation {
  valid: boolean;
  error?: string;
}

/**
 * 存储服务通用接口
 */
export interface StorageProvider {
  // 基础信息
  getType(): StorageType;
  getName(): string;

  // 目录操作
  list(path: string): Promise<StorageEntry[]>;
  getEntry(path: string): Promise<StorageEntry>;

  // CRUD 操作
  createEntry(entry: Partial<StorageEntry>): Promise<StorageEntry>;
  updateEntry(id: string, data: Partial<StorageEntry>): Promise<StorageEntry>;
  deleteEntry(id: string): Promise<void>;

  // 内容操作
  readContent(id: string): Promise<StorageContent>;
  writeContent(id: string, content: string): Promise<StorageEntry>;

  // 文件大小限制
  getFileSizeLimit(): FileSizeLimit;
  validateFileSize(content: string, filename?: string): FileSizeValidation;
}

/**
 * 默认文件大小限制（100MB）
 */
export const DEFAULT_FILE_SIZE_LIMIT: FileSizeLimit = {
  maxFileSize: 100 * 1024 * 1024,
  maxRequestSize: 100 * 1024 * 1024,
};