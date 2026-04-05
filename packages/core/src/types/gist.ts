/**
 * Gist 数据结构
 */
export interface Gist {
  id: string;
  description: string;
  html_url: string;
  git_pull_url: string;
  git_push_url: string;
  created_at: string;
  updated_at: string;
  public: boolean;
  files: Record<string, GistFile>;
  owner?: GistOwner;
}

/**
 * Gist 文件结构
 */
export interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
  content: string;
}

/**
 * Gist 所有者信息
 */
export interface GistOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

/**
 * 创建 Gist 参数
 */
export interface CreateGistParams {
  description: string;
  files: Record<string, { content: string }>;
  public: boolean;
}

/**
 * 更新 Gist 参数
 */
export interface UpdateGistParams {
  description?: string;
  files?: Record<string, { content?: string; filename?: string } | null>;
}

/**
 * Gist 服务类型
 */
export enum GistProviderEnum {
  GitHub = 'github',
  Gitee = 'gitee',
}

export interface ProviderConfig {
  id: string;
  provider?: GistProviderEnum;
  enabled?: boolean;
}

/**
 * Gist 文件大小限制配置
 */
export interface FileSizeLimit {
  /** 最大单个文件大小（字节） */
  maxFileSize: number;
  /** 最大单次请求大小（字节） */
  maxRequestSize: number;
}

/**
 * 文件大小限制常量
 */
export const FILE_SIZE_LIMITS: Record<GistProviderEnum, FileSizeLimit> = {
  [GistProviderEnum.Gitee]: {
    maxFileSize: 4 * 1024 * 1024, // 4MB
    maxRequestSize: 4 * 1024 * 1024, // 4MB
  },
  [GistProviderEnum.GitHub]: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxRequestSize: 100 * 1024 * 1024, // 100MB (使用 gist api)
  },
};

/**
 * 文件大小验证结果
 */
export interface FileSizeValidation {
  valid: boolean;
  error?: string;
}

/**
 * Gist 服务通用接口 - 适配器模式的目标接口
 */
export interface GistProvider {
  /**
   * 获取用户的所有 Gist
   */
  getGists(): Promise<Gist[]>;

  /**
   * 获取用户星标的 Gist
   */
  getStarredGists(): Promise<Gist[]>;

  /**
   * 根据 ID 获取单个 Gist 详情
   */
  getGist(id: string): Promise<Gist>;

  /**
   * 创建新的 Gist
   */
  createGist(params: CreateGistParams): Promise<Gist>;

  /**
   * 更新 Gist
   */
  updateGist(id: string, params: UpdateGistParams): Promise<Gist>;

  /**
   * 删除 Gist
   */
  deleteGist(id: string): Promise<void>;

  /**
   * 获取 Gist 的文件内容
   */
  getGistContent(id: string, filename: string): Promise<string>;

  /**
   * 更新 Gist 文件内容
   */
  updateGistContent(
    id: string,
    filename: string,
    content: string,
  ): Promise<Gist>;

  /**
   * 删除 Gist 文件
   */
  deleteGistFile(id: string, filename: string): Promise<Gist>;

  /**
   * 获取服务提供商名称
   */
  getProviderName(): GistProviderEnum;

  /**
   * 获取文件大小限制配置
   */
  getFileSizeLimit(): FileSizeLimit;

  /**
   * 验证文件大小是否允许上传
   * @param content 文件内容
   * @param filename 文件名（可选）
   */
  validateFileSize(content: string, filename?: string): FileSizeValidation;

  /**
   * 上传文件到 Gist（支持大文件）
   * @param id Gist ID
   * @param filename 文件名
   * @param content 文件内容
   * @param onProgress 进度回调
   */
  uploadFile(
    id: string,
    filename: string,
    content: string,
    onProgress?: (progress: number) => void,
  ): Promise<Gist>;
}